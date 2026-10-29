window.__ModuleLoader__.load({
	id: "@melite/motion-motion",
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
		let _melite_three_client_client = require("@melite/three-client/client");
		_melite_three_client_client = __toESM(_melite_three_client_client, 1);
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
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
		function sleep$1(ms, signal) {
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
		var init_sleep$1 = __esmMin((() => {}));
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
		function createClientStore$1(init) {
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
		var init_clientStore$1 = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/catalog/src/api.ts
		function shouldRetryStatus$1(status, method) {
			return GATEWAY_CODES$1.has(status) || SAFE_METHODS$1.has(method) && status >= 500 && status < 600;
		}
		function setState$1(next) {
			if (next === backendStore$1.getState().state) return;
			backendStore$1.setState({ state: next });
		}
		/** True if `input` targets our own backend (same-origin or root-relative). */
		function isBackendUrl$1(input) {
			if (input.startsWith("/")) return true;
			try {
				return new URL(input, window.location.origin).origin === window.location.origin;
			} catch {
				return false;
			}
		}
		function backoffMs$1(attempt) {
			const exp = Math.min(CAP_MS$1, BASE_MS$1 * 2 ** attempt);
			return Math.round(exp * (.5 + Math.random() * .5));
		}
		/**
		* Drop-in replacement for `fetch()` with retry, backoff, GET dedup, and a
		* global liveness signal. Throws only on persistent network failure (after
		* MAX_RETRIES) or caller AbortError. Returns the Response for any HTTP
		* status (including 4xx/5xx) so existing `if (!res.ok)` checks keep working.
		*/
		async function apiFetch$1(input, init = {}) {
			const method = (init.method ?? "GET").toUpperCase();
			const backend = isBackendUrl$1(input);
			const dedupKey = method === "GET" && backend ? input : null;
			if (dedupKey && inflight$1.has(dedupKey)) return inflight$1.get(dedupKey).then((r) => {
				if (init.signal?.aborted) throw new DOMException("Aborted", "AbortError");
				if (r && typeof r.clone === "function") return r.clone();
				return r;
			});
			const run = async () => {
				const deadline = Date.now() + TOTAL_BUDGET_MS$1;
				let lastErr = null;
				for (let attempt = 0; attempt <= MAX_RETRIES$1; attempt++) {
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
						if (shouldRetryStatus$1(res.status, method) && attempt < MAX_RETRIES$1 && Date.now() < deadline) {
							if (backend) setState$1("degraded");
							await sleep$1(backoffMs$1(attempt), callerSignal);
							continue;
						}
						if (backend) {
							consecutiveFail$1 = 0;
							setState$1("online");
						}
						return res;
					} catch (err) {
						if (err instanceof DOMException && err.name === "AbortError") throw err;
						lastErr = err;
						if (backend) {
							consecutiveFail$1++;
							setState$1(consecutiveFail$1 >= OFFLINE_THRESHOLD$1 ? "offline" : "degraded");
						}
						if (attempt < MAX_RETRIES$1 && Date.now() < deadline) {
							const backSig = init.signal;
							await sleep$1(backoffMs$1(attempt), backSig);
						}
					}
				}
				throw lastErr instanceof Error ? lastErr : /* @__PURE__ */ new Error("network request failed");
			};
			const p = run();
			if (dedupKey) {
				inflight$1.set(dedupKey, p);
				p.then(() => {
					inflight$1.delete(dedupKey);
				}, () => {
					inflight$1.delete(dedupKey);
				});
			}
			return p;
		}
		/**
		* Convenience for JSON endpoints. Throws an Error on non-2xx (message
		* includes status + body excerpt) so callers can use try/catch directly.
		*/
		async function apiJson$1(input, init) {
			const res = await apiFetch$1(input, init);
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
		var MAX_RETRIES$1, BASE_MS$1, CAP_MS$1, OFFLINE_THRESHOLD$1, TOTAL_BUDGET_MS$1, SAFE_METHODS$1, GATEWAY_CODES$1, backendStore$1, consecutiveFail$1, inflight$1;
		var init_api$1 = __esmMin((() => {
			init_sleep$1();
			init_clientStore$1();
			MAX_RETRIES$1 = 4;
			BASE_MS$1 = 400;
			CAP_MS$1 = 4e3;
			OFFLINE_THRESHOLD$1 = 3;
			TOTAL_BUDGET_MS$1 = 15e3;
			SAFE_METHODS$1 = /* @__PURE__ */ new Set(["GET", "HEAD"]);
			GATEWAY_CODES$1 = /* @__PURE__ */ new Set([
				502,
				503,
				504
			]);
			backendStore$1 = createClientStore$1({ state: "online" });
			consecutiveFail$1 = 0;
			inflight$1 = /* @__PURE__ */ new Map();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/contractToast.ts
		/**
		* Fire one contract toast through the wired sink.
		* @param type - toast severity.
		* @param message - the operator-facing text.
		* @param action - optional Retry-style button.
		* @throws when no sink is wired — an unwired verdict must surface,
		*          not vanish.
		*/
		function contractToast$1(type, message, action) {
			if (sink$1 === null) throw new Error("contract toast sink unset — call setContractToastSink() from the owning client face before reporting");
			sink$1(type, message, action);
		}
		var sink$1;
		var init_contractToast$1 = __esmMin((() => {
			sink$1 = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/catalogContract.ts
		function validateCatalogContract$1(catalog) {
			const violations = [];
			if (!isObj$3(catalog)) return {
				valid: false,
				violations: [{
					kind: "catalog",
					message: "Catalog is not an object — this is an error body, not a contract."
				}]
			};
			const families = catalog.families;
			if (!isObj$3(families)) violations.push({
				kind: "catalog",
				message: "Catalog has no `families` record — no family can be located."
			});
			const models = catalog.models;
			if (!isObj$3(models)) violations.push({
				kind: "catalog",
				message: "Catalog has no `models` record — no model can be located."
			});
			const capabilities = catalog.capabilities;
			if (capabilities !== void 0 && !isObj$3(capabilities)) violations.push({
				kind: "catalog",
				message: "`capabilities` is not a record keyed by id — capability routing is dead."
			});
			if (families === void 0 || models === void 0) return {
				valid: false,
				violations
			};
			if (isObj$3(families)) for (const [id, entry] of Object.entries(families)) {
				if (!isObj$3(entry)) {
					violations.push({
						kind: id,
						message: `Family ${id} is not an object.`
					});
					continue;
				}
				if (!isNonEmptyString$1(entry.label)) violations.push({
					kind: id,
					message: `Family ${id} declares no "label" — it would render as an empty picker entry.`
				});
				const modifiers = entry.modifiers;
				if (modifiers !== void 0 && modifiers !== null && !Array.isArray(modifiers)) violations.push({
					kind: id,
					message: `Family ${id} declares "modifiers" but it is not an array — modifier capability is unreadable.`
				});
				else if (Array.isArray(modifiers)) for (const raw of modifiers) {
					if (!isObj$3(raw) || typeof raw.kind !== "string") continue;
					if (raw.kind !== "controlnet" && raw.kind !== "lora") continue;
					const options = Array.isArray(raw.options) ? raw.options : [];
					if ((raw.cardinality ?? "list") === "list" && options.length === 0 && !raw.upload_dir) violations.push({
						kind: id,
						message: `Family ${id} modifier kind "${raw.kind}" carries ZERO options and no upload_dir — the dropdown would render empty (phantom capability).`
					});
				}
			}
			if (isObj$3(models)) for (const [id, entry] of Object.entries(models)) {
				if (!isObj$3(entry)) {
					violations.push({
						kind: id,
						message: `Model ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString$1(entry.family)) missing.push("family");
				if (!isNonEmptyString$1(entry.form)) missing.push("form");
				if (!isNonEmptyString$1(entry.label)) missing.push("label");
				if (missing.length > 0) violations.push({
					kind: id,
					message: `Model ${id} is missing required key(s) ${missing.join(", ")} — it cannot route or render.`
				});
			}
			if (isObj$3(capabilities)) for (const [id, entry] of Object.entries(capabilities)) {
				if (!isObj$3(entry)) {
					violations.push({
						kind: id,
						message: `Capability ${id} is not an object.`
					});
					continue;
				}
				const missing = [];
				if (!isNonEmptyString$1(entry.label)) missing.push("label");
				const declaredFam = entry.default_family;
				if (declaredFam !== void 0 && !isNonEmptyString$1(declaredFam)) missing.push("default_family (present but not a string)");
				const resolved = entry.resolved;
				const hasRoute = isObj$3(resolved) && isNonEmptyString$1(resolved.family) && isNonEmptyString$1(resolved.model);
				if (!(Array.isArray(entry.families) && entry.families.length === 0) && !hasRoute && !isNonEmptyString$1(declaredFam)) missing.push("default_family or resolved route");
				if (!Array.isArray(entry.families)) missing.push("families");
				else if (entry.families.some((f) => !isNonEmptyString$1(f))) missing.push("families (non-string entries)");
				else if (entry.families.length === 0 && (isNonEmptyString$1(declaredFam) || hasRoute)) missing.push("families (routed but empty — the default points at no family)");
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
		var CatalogContractError$1, isObj$3, isNonEmptyString$1;
		var init_catalogContract$1 = __esmMin((() => {
			CatalogContractError$1 = class extends Error {
				constructor(violations) {
					super(`Catalog contract violation (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "CatalogContractError";
					this.violations = violations;
				}
			};
			isObj$3 = (v) => v != null && typeof v === "object" && !Array.isArray(v);
			isNonEmptyString$1 = (v) => typeof v === "string" && v.trim().length > 0;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/modelCatalog.ts
		var modelCatalog_exports$1 = /* @__PURE__ */ __exportAll({
			activeVariantForRoute: () => activeVariantForRoute$1,
			axisCellExists: () => axisCellExists$1,
			canvasDefaultModel: () => canvasDefaultModel$1,
			composeVariantRoute: () => composeVariantRoute$1,
			controlnetTypesOf: () => controlnetTypesOf$1,
			dropdownModels: () => dropdownModels$1,
			ensureCatalog: () => ensureCatalog$1,
			familiesForForm: () => familiesForForm$1,
			familyAccepts: () => familyAccepts$1,
			familyCardSummary: () => familyCardSummary$1,
			familyConditioning: () => familyConditioning$1,
			familyGenre: () => familyGenre$1,
			familyHasVariantAxis: () => familyHasVariantAxis$1,
			familyLabel: () => familyLabel$1,
			familyOf: () => familyOf$1,
			familyOptionalOutputs: () => familyOptionalOutputs$1,
			familyPrimaryRoute: () => familyPrimaryRoute$1,
			familyTransformMatrix: () => familyTransformMatrix$1,
			formOf: () => formOf$1,
			getCachedCatalog: () => getCachedCatalog$1,
			hiddenFromDropdown: () => hiddenFromDropdown$1,
			isCatalogLoaded: () => isCatalogLoaded$1,
			loadCatalog: () => loadCatalog$1,
			modelDescription: () => modelDescription$1,
			modelLabel: () => modelLabel$1,
			narrowGenre: () => narrowGenre$1,
			onCatalogReady: () => onCatalogReady$1,
			presetsForRoute: () => presetsForRoute$1,
			primeCatalog: () => primeCatalog$1,
			routeCoordinates: () => routeCoordinates$1,
			studioOf: () => studioOf$1,
			variantLabel: () => variantLabel$1,
			variantSiblings: () => variantSiblings$1,
			variantsForRoute: () => variantsForRoute$1
		});
		/** Narrow the wire's plain string genre (string | null — the backend
		* Literal does not survive the wire as a type) onto the view union.
		* Out-of-vocabulary values return undefined (callers fall back) — never a
		* silent cast: an unknown genre must NOT masquerade as a known one. */
		function narrowGenre$1(g) {
			return CARD_GENRES$1.find((genre) => genre === g);
		}
		/** CN type keys a family declares — derived from its ``modifiers:`` block
		* (kind=controlnet options; the ONLY source of truth, Phase A finalé).
		* ServicePicker advertises CN support per tile from this — the "weird
		* reason" most models show no CN subcards: only families that declare a
		* controlnet kind have CN support (DiT models without compatible CN
		* trainings correctly declare nothing). */
		function controlnetTypesOf$1(family) {
			return ((family?.modifiers ?? []).find((m) => m.kind === "controlnet")?.options ?? []).map((o) => ({
				type: o.value,
				label: o.label
			}));
		}
		/** Subscribe to catalog readiness. Called when the catalog transitions from
		* null → populated. Returns an unsubscribe fn. R-S10 (2026-10-22): the
		* guard honors the doc — background TTL refreshes (setState with a new
		* catalog) re-fire nothing; only the null → populated transition fires. */
		function onCatalogReady$1(fn) {
			return catalogStore$1.subscribe((next, prev) => {
				if (!prev.catalog && next.catalog) fn();
			});
		}
		/** True after the catalog has been successfully loaded at least once. */
		function isCatalogLoaded$1() {
			return catalogStore$1.getState().loaded;
		}
		/** Fetch the model catalog. THROWS on non-2xx (no silent empty `{}`).
		* The caller MUST surface the error. Returning a fake empty catalog here
		* is what hid every "model dropdown is empty" bug — the user saw nothing
		* and the console warning was invisible. Loud failure is honest. */
		/** The ONE ingest gate (2026-08-11): validate BEFORE caching.
		* A catalog that violates the contract is a BACKEND bug — reported to the
		* contract store, NEVER cached, and the caller gets a
		* CatalogContractError (ensureCatalog will not auto-retry it). */
		function _ingest$1(data) {
			const { valid, violations } = validateCatalogContract$1(data);
			if (!valid) throw new CatalogContractError$1(violations);
			useCatalogContractStore$1.getState().reportOk();
			const catalog = data;
			_cacheTime$1 = Date.now();
			catalogStore$1.setState({
				catalog,
				loaded: true
			});
			return catalog;
		}
		async function loadCatalog$1(opts) {
			const cached = catalogStore$1.getState().catalog;
			if (cached && !opts?.force) {
				if (Date.now() - _cacheTime$1 > _CACHE_TTL_MS$1 && !_inflight$4) _inflight$4 = (async () => {
					try {
						_ingest$1(await apiJson$1("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError$1) useCatalogContractStore$1.getState().reportViolation(e.violations);
						else useCatalogContractStore$1.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return catalogStore$1.getState().catalog;
				})().finally(() => {
					_inflight$4 = null;
				});
				return cached;
			}
			if (_inflight$4) return _inflight$4;
			_inflight$4 = (async () => {
				try {
					return _ingest$1(await apiJson$1("/v1/model-catalog"));
				} catch (e) {
					if (e instanceof CatalogContractError$1) useCatalogContractStore$1.getState().reportViolation(e.violations);
					else useCatalogContractStore$1.getState().reportError(e instanceof Error ? e.message : String(e));
					throw e;
				}
			})().finally(() => {
				_inflight$4 = null;
			});
			return _inflight$4;
		}
		/** Fire-and-forget background load with auto-retry. If the first attempt
		* fails (gateway reloading, network blip), schedules a retry after 3s.
		* Keeps trying until the catalog loads, then notifies subscribers.
		* Safe to call multiple times — collapses into a single inflight request. */
		function ensureCatalog$1() {
			if (catalogStore$1.getState().loaded) return;
			if (_inflight$4) return;
			loadCatalog$1().then(() => {
				if (_bgRetryTimer$1) {
					clearTimeout(_bgRetryTimer$1);
					_bgRetryTimer$1 = null;
				}
			}).catch((e) => {
				if (e instanceof CatalogContractError$1) {
					console.error("[modelCatalog] catalog contract violation — not auto-retrying:", e.message);
					return;
				}
				console.warn("[modelCatalog] load failed, will retry in 3s:", e);
				if (_bgRetryTimer$1) clearTimeout(_bgRetryTimer$1);
				_bgRetryTimer$1 = setTimeout(() => {
					_bgRetryTimer$1 = null;
					ensureCatalog$1();
				}, 3e3);
			});
		}
		function getCachedCatalog$1() {
			return catalogStore$1.getState().catalog;
		}
		/** Seed the cache with pre-fetched data (test utility — production code uses
		* loadCatalog/ensureCatalog which fetch from the endpoint). Lets tests inject
		* a fake catalog without going to the network. */
		function primeCatalog$1(data) {
			catalogStore$1.setState({
				catalog: data,
				loaded: true
			});
		}
		/**
		* For route keys that are NOT top-level catalog entries (e.g. a quant-tier
		* sibling that only appears as a variant route on its parent), find the
		* parent model that owns the route via its ``variants:`` block.
		*/
		function parentModelForRoute$1(routeKey, cat) {
			for (const [key, spec] of Object.entries(cat.models)) if ((spec.variants ?? []).some((v) => v.route === routeKey)) return key;
		}
		function familyOf$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.family;
			if (own) return own;
			const parent = parentModelForRoute$1(routeKey, cat);
			return parent ? cat.models[parent].family : void 0;
		}
		function studioOf$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
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
		function formOf$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!cat?.models) return void 0;
			const own = cat.models[routeKey]?.form;
			if (own) return own;
			const parent = parentModelForRoute$1(routeKey, cat);
			return parent ? cat.models[parent].form : void 0;
		}
		function familyLabel$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
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
		function familyGenre$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			return narrowGenre$1((fam ? cat.families?.[fam]?.genre : void 0) ?? cat.families?.[routeKey]?.genre);
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
		function familyAccepts$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
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
		function familyTransformMatrix$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
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
		function familyCardSummary$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			return cat.families?.[fam ?? routeKey]?.card_summary ?? null;
		}
		function familyConditioning$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
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
		function familyOptionalOutputs$1(familyId, cat = catalogStore$1.getState().catalog ?? {
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
		function canvasDefaultModel$1(cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			return Object.entries(cat.models).find(([, m]) => m.canvas_default)?.[0];
		}
		/** Display name for a model within its family variant picker (Turbo / Base / Raw / …). */
		function variantLabel$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
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
		function familiesForForm$1(formTag, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const visible = dropdownModels$1(formTag, cat);
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
		function familyPrimaryRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return routeKey;
			const declared = cat.families[fam]?.default_model;
			if (declared && cat.models[declared]?.family === fam) return declared;
			const members = Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
			return members.find((k) => k === fam) ?? members[0];
		}
		function modelLabel$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
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
		function modelDescription$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return void 0;
			return cat.families?.[fam]?.description ?? void 0;
		}
		function dropdownModels$1(formTag, cat = catalogStore$1.getState().catalog ?? {
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
		function variantSiblings$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return routeKey ? [routeKey] : [];
			return Object.entries(cat.models).filter(([, s]) => s.family === fam).map(([k]) => k);
		}
		/**
		* Models hidden from the dropdown because they're reachable only via a
		* variant toggle (e.g. z-image-q5 — picked by clicking the Q5 button).
		*/
		function hiddenFromDropdown$1(cat = catalogStore$1.getState().catalog ?? {
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
		function variantsForRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const own = cat.models[routeKey]?.variants;
			if (own) return own;
			const parent = parentModelForRoute$1(routeKey, cat);
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
		function presetsForRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
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
		function activeVariantForRoute$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const ownList = variantsForRoute$1(routeKey, cat);
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
		function routeCoordinates$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const m = cat.models[routeKey];
			return {
				variant: m?.variant ?? void 0,
				quant: m?.quant ?? activeVariantForRoute$1(routeKey, cat)?.quant ?? void 0
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
		function axisWants$1(currentRoute, clicked, cat) {
			const cur = routeCoordinates$1(currentRoute, cat);
			const tgt = routeCoordinates$1(clicked.route, cat);
			const switchesQuant = clicked.group === "Quant";
			return {
				variant: switchesQuant ? cur.variant : tgt.variant ?? cur.variant,
				quant: switchesQuant ? clicked.quant ?? tgt.quant : cur.quant
			};
		}
		/** The ONE matrix-cell lookup: the route in ``fam`` whose coordinates are
		* exactly (variant, quant), or undefined when no such cell exists. */
		function matrixCell$1(fam, variant, quant, cat) {
			for (const [key, spec] of Object.entries(cat.models)) {
				if ((spec.family ?? key) !== fam) continue;
				const rc = routeCoordinates$1(key, cat);
				if (rc.variant === variant && rc.quant === quant) return key;
			}
		}
		function composeVariantRoute$1(currentRoute, clicked, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(currentRoute, cat);
			const clickedRoute = clicked.route;
			if (!fam || !clickedRoute) return clickedRoute ?? currentRoute;
			const wants = axisWants$1(currentRoute, clicked, cat);
			return matrixCell$1(fam, wants.variant, wants.quant, cat) ?? clickedRoute;
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
		function axisCellExists$1(currentRoute, clicked, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			if (!clicked.route) return true;
			const fam = familyOf$1(currentRoute, cat);
			if (!fam) return true;
			const wants = axisWants$1(currentRoute, clicked, cat);
			return matrixCell$1(fam, wants.variant, wants.quant, cat) !== void 0;
		}
		/**
		* True when the family owns its version axis via a declared ``Variant``
		* group (Krea 2 Turbo/Raw, …). The legacy sibling-picker defers to the
		* matrix system in that case so the two never render duplicate rows
		* (2026-08-08 — one system, not two).
		*/
		function familyHasVariantAxis$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			const groups = fam ? cat.families?.[fam]?.variant_groups : void 0;
			return !!groups && "Variant" in groups;
		}
		var CARD_GENRES$1, catalogStore$1, _cacheTime$1, _CACHE_TTL_MS$1, _inflight$4, _bgRetryTimer$1;
		var init_modelCatalog$1 = __esmMin((() => {
			init_api$1();
			init_catalogContract$1();
			init_catalogContractStore$1();
			init_clientStore$1();
			CARD_GENRES$1 = [
				"image",
				"video",
				"audio",
				"3d",
				"motion",
				"other",
				"text"
			];
			catalogStore$1 = createClientStore$1({
				catalog: null,
				loaded: false
			});
			_cacheTime$1 = 0;
			_CACHE_TTL_MS$1 = 3e4;
			_inflight$4 = null;
			_bgRetryTimer$1 = null;
			/* v8 ignore next -- module warm-load runs only in browser builds
			* (Vite sets MODE to exactly "development"/"production"); under vitest
			* MODE is "test", and under a plain-Node import (the release probe)
			* import.meta.env is undefined — both arms never reach the load, so
			* no fetch fires and no retry timer keeps the process alive
			* (2026-09-12). */
			if ({}.env?.MODE === "development" || {}.env?.MODE === "production") ensureCatalog$1();
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/catalogContractStore.ts
		/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
		*  outage that produced it, so the operator should also see WHEN it fired.
		*  24h local time, seconds resolution. */
		function _stamp$1() {
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
		function _reportToast$1(type, message, action) {
			try {
				contractToast$1(type, message, action);
			} catch (err) {
				console.error("[catalogContract] toast not delivered (sink unwired):", message, err);
			}
		}
		/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
		*  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
		*  (for CatalogContractError reporting) — a static import would be circular. */
		function retryCatalog$1() {
			Promise.resolve().then(() => (init_modelCatalog$1(), modelCatalog_exports$1)).then(({ loadCatalog }) => loadCatalog({ force: true })).catch((err) => {
				console.error("[catalogContract] retryCatalog failed:", err);
			});
		}
		var IDLE$1, _lastToastedOutage$1, useCatalogContractStore$1;
		var init_catalogContractStore$1 = __esmMin((() => {
			init_clientStore$1();
			init_contractToast$1();
			IDLE$1 = {
				state: "idle",
				violations: [],
				error: null
			};
			_lastToastedOutage$1 = null;
			useCatalogContractStore$1 = createClientStore$1((set, get) => ({
				record: IDLE$1,
				reportOk: () => {
					const wasOutage = get().record.state === "error";
					_lastToastedOutage$1 = null;
					set({ record: {
						state: "loaded",
						violations: [],
						error: null
					} });
					if (wasOutage) _reportToast$1("info", `Catalog back online (at ${_stamp$1()}).`);
				},
				reportViolation: (violations) => {
					console.error(`[catalogContract] catalog contract violation (at ${_stamp$1()}):`, violations);
					set({ record: {
						state: "violation",
						violations,
						error: null
					} });
					const first = violations[0];
					_reportToast$1("error", `Catalog contract violation — ${first ? first.kind && first.kind !== "catalog" ? `${first.kind}: ${first.message}` : first.message : "the catalog response did not match the expected shape"} (at ${_stamp$1()}). Some models may be missing. Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog$1
					});
				},
				reportError: (message) => {
					const clean = message.trim();
					console.error(`[catalogContract] catalog fetch failed (at ${_stamp$1()}):`, clean);
					set({ record: {
						state: "error",
						violations: [],
						error: clean
					} });
					if (clean === _lastToastedOutage$1) return;
					_lastToastedOutage$1 = clean;
					_reportToast$1("error", `Catalog unavailable — ${clean} (at ${_stamp$1()}). Retry re-fetches the catalog.`, {
						label: "Retry",
						onClick: retryCatalog$1
					});
				},
				clear: () => {
					_lastToastedOutage$1 = null;
					set({ record: IDLE$1 });
				}
			}));
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/runStatusContract.ts
		/** Validate a status payload against the ONE status-channel contract.
		* Accepts a parsed body of ANY response (200 or non-ok) — the caller
		* decides what a violation means on its branch. */
		function validateRunStatusContract$1(payload) {
			const violations = [];
			if (!isObj$2(payload)) return {
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
			if (typeof payload.status !== "string" || !RUN_STATUSES$1.has(payload.status)) violations.push({
				field: "status",
				kind: "invalid",
				message: `Run-level status ${JSON.stringify(payload.status)} is not in the backend vocabulary (${[...RUN_STATUSES$1].join(", ")}).`
			});
			if (!Array.isArray(payload.stages)) violations.push({
				field: "stages",
				kind: "missing",
				message: "Status payload has no stages array — stage progress cannot be located."
			});
			else payload.stages.forEach((stage, i) => {
				if (!isObj$2(stage)) {
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
		function hasViolationsSignature$1(body) {
			return isObj$2(body) && Array.isArray(body.violations);
		}
		var _RUN_STATUS_VALUES$1, RUN_STATUSES$1, RunStatusContractError$1, isObj$2;
		var init_runStatusContract$1 = __esmMin((() => {
			_RUN_STATUS_VALUES$1 = [
				"pending",
				"running",
				"completed",
				"failed",
				"stopped",
				"interrupted",
				"unknown",
				"queued"
			];
			RUN_STATUSES$1 = new Set(_RUN_STATUS_VALUES$1);
			RunStatusContractError$1 = class extends Error {
				constructor(runId, violations) {
					super(`Run status contract violation for ${runId} (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
					this.name = "RunStatusContractError";
					this.violations = violations;
				}
			};
			isObj$2 = (v) => v != null && typeof v === "object" && !Array.isArray(v);
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/runStatusContractStore.ts
		/** Re-poll the run — the toast's Retry action. Recovered → clear; still
		*  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
		*  whole protocol layer; the store only needs it on click. */
		function repoll$1(runId) {
			if (repollInFlight$1.has(runId)) return;
			repollInFlight$1.add(runId);
			Promise.resolve().then(() => (init_FlowProtocol(), FlowProtocol_exports)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
				maxWaitMs: 3e4,
				intervalMs: 2e3
			})).then(() => useRunStatusContractStore$1.getState().clear()).catch((err) => {
				console.error("[runStatusContract] repoll failed:", runId, err);
			}).finally(() => {
				repollInFlight$1.delete(runId);
			});
		}
		function toastVerdict$1(v) {
			const toast = contractToast$1;
			if (v.kind === "violation") {
				const first = v.violations[0]?.message ?? "the status response did not match the expected shape";
				toast("error", `Run ${v.runId}: ${v.violations.length} contract issue(s) — ${first}. Retry to re-check, or re-run the card.`, {
					label: "Retry",
					onClick: () => repoll$1(v.runId)
				});
			} else toast("error", `Run ${v.runId}: status channel error — ${v.message}. Retry to re-check.`, {
				label: "Retry",
				onClick: () => repoll$1(v.runId)
			});
		}
		var repollInFlight$1, useRunStatusContractStore$1;
		var init_runStatusContractStore$1 = __esmMin((() => {
			init_clientStore$1();
			init_contractToast$1();
			repollInFlight$1 = /* @__PURE__ */ new Set();
			useRunStatusContractStore$1 = createClientStore$1((set) => ({
				verdict: null,
				reportViolation: (runId, violations) => {
					console.error("[runStatusContract] status channel violation:", runId, violations);
					const verdict = {
						kind: "violation",
						runId,
						violations
					};
					set({ verdict });
					toastVerdict$1(verdict);
				},
				reportError: (runId, message) => {
					console.error("[runStatusContract] status channel error:", runId, message);
					const verdict = {
						kind: "error",
						runId,
						message
					};
					set({ verdict });
					toastVerdict$1(verdict);
				},
				clear: () => set({ verdict: null })
			}));
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/extraKeys.js
		/** THE TYPED WRITE — declarations pass their literal through this
		*  so an unknown key or malformed value fails EVERY wall: tsc at
		*  the literal, this throw at runtime (spread arms), the boot
		*  validator on any served envelope, and the estate law suite on
		*  the wire. Never a silently dead write. */
		function bag(b) {
			const where = "extra bag";
			for (const key of Object.keys(b)) if (!EXTRA_KEY_SET$1.has(key)) throw new Error(where + " carries '" + key + "' — not in the contract's vocabulary (packages/web-kit/contracts/src/extraKeys.ts). A key outside the table has no reader spelling and would be a silent dead write. Add it to EXTRA_KEYS with its type and owners, or fix the spelling.");
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
		var EXTRA_KEYS$1, EXTRA_KEY_SET$1, WTYPE_SET, WTYPE_SEATS, MEDIA_SET, ZONE_SET, ROLE_SET;
		var init_extraKeys = __esmMin((() => {
			EXTRA_KEYS$1 = [
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
			EXTRA_KEY_SET$1 = new Set(EXTRA_KEYS$1);
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
		//#region ../../web-kit/contracts/lib/laneRelations.js
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
		/** THE WRITE-SEAT SPELLING of the frictionless-authoring ruling
		*  (operator 2026-11-11: "The refusal is never one keystroke at a
		*  time … you are submitting a form, not hacking the mainframe"):
		*  the ONE function every write-side gate calls after the strict
		*  judge — it drops the authoring-incomplete class (the
		*  unstated-required word, a together half, an either_or half).
		*  The registry's write doors AND the form's inline gate BOTH drop
		*  through THIS function — attempt 12 (2026-11-11) was exactly this
		*  drift: the door filtered, the form's own copy of the judgment
		*  didn't, and the operator's keystroke refused while every wall
		*  was green because the walls drove the door, not the form. One
		*  spelling; a second copy of this class test anywhere is the
		*  multiple-seat disease.
		* @param violations the strict judge's violations (any seat)
		* @returns the violations a write-side gate may voice */
		function dropAuthoringIncomplete(violations) {
			return violations.filter((v) => !isUnstatedRequiredVoice(v.message) && !isTogetherHalfVoice(v.message) && !isEitherOrHalfVoice(v.message));
		}
		/** The together-half class test: the sentence names a together group
		*  whose members are not all stated yet.
		* @param text the refusal sentence to classify
		* @returns true when the sentence is the together-half voice */
		function isTogetherHalfVoice(text) {
			return text.includes(TOGETHER_HALF_STEM);
		}
		/** The either_or-half class test: the sentence names an alternative
		*  none of whose groups the stated fields complete yet.
		* @param text the refusal sentence to classify
		* @returns true when the sentence is the either_or-half voice */
		function isEitherOrHalfVoice(text) {
			return text.includes(EITHER_OR_HALF_STEM);
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
		/** THE DELIVERABLE-SIZE JUDGMENT (the resize order, operator
		*  2026-11-12): the size law as a pure judgment — the edit lanes
		*  STILL run at the source's own frame (the latent law holds); a
		*  stated size is a DELIVERABLE resize (post-decode lanczos), never
		*  a latent geometry. The match toggle owns the door: ON (default,
		*  including an unstated toggle — absence never opts out of the
		*  source frame) + a stated axis refuses field-named with the flip
		*  in the voice; OFF with NEITHER axis passes (the flip-then-type
		*  flow — the card stays runnable while the numbers are empty);
		*  OFF with exactly ONE axis refuses (a half deliverable is
		*  malformed, never a half-resize); OFF with BOTH demands integers
		*  ≥ 16 (the blank-image and int laws, input-prep's precedent).
		*
		*  ONE SPELLING, FOUR SEATS: the engine builds throw it (the kit's
		*  refuseDeliverableSize — the throwing twin over this judgment),
		*  the bench write/run door appends it (the deliverable carve), and
		*  the client form gate + compose mirror append it too. Presence is
		*  `undefined`-shaped — the builds' own read, moved verbatim (a
		*  null is stated here, exactly as the firing gate reads it; the
		*  lane judges' blank law does not apply inside the size door).
		*
		*  @param params the run params (match_input_resolution/width/height).
		*  @returns the violation (at most one — the first law in the order
		*  half, integer, floor, on-stated), empty when the state is lawful. */
		function judgeDeliverableSize(params) {
			const sizeMatched = params["match_input_resolution"] === false;
			const width = params["width"];
			const height = params["height"];
			const voice = (why) => ({
				field: "width",
				message: "'width' fires on the image-edit card (" + why + ") — the TS plane builds the stock plain-edit graph only; refusing instead of silently plain-editing"
			});
			if (sizeMatched) {
				if (width === void 0 !== (height === void 0)) return [voice("match_input_resolution is OFF — state both width and height (the deliverable's size; the edit itself runs at the source's own frame and the deliverable resizes post-edit)")];
				if (width !== void 0 && !Number.isInteger(width) || height !== void 0 && !Number.isInteger(height)) return [voice("width/height must be integers — the resize takes whole pixels (the input-prep integer law)")];
				if (typeof width === "number" && width < 16 || typeof height === "number" && height < 16) return [voice("width/height must be at least 16px — smaller targets upscale to a blank (the input-prep blank-image law)")];
				return [];
			}
			if (width !== void 0 || height !== void 0) return [voice("match_input_resolution is ON — the deliverable keeps the source's own frame; flip match_input_resolution to false to state width/height (the edit itself runs at the source's frame either way)")];
			return [];
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
		/** The transitive together-closure of a stale set: a stale member
		*  takes its together-group with it, and a group-mate made stale by
		*  THAT pass takes its own group too — a FIXPOINT, never a single
		*  pass (overlapping groups in the wrong declaration order would
		*  strand a transitively-dropped sibling: [{together:[b,c]},
		*  {together:[a,b]}] with stale {a} closes to {a,b,c} in BOTH
		*  declaration orders; a single pass yields {a,b} when [b,c] is
		*  declared first). Siblings already blank are not carried state
		*  and stay put.
		*  @param rows the judged relations (family + resolved variant —
		*  the same rows the admission judges)
		*  @param stale the seed stale members (mutated in place to the
		*  closure; callers pass the seat's own set)
		*  @param values the merged view (a stated, non-blank sibling is
		*  carried state; a blank one is not)
		*  @returns the closed stale set (the same set instance). */
		function laneTogetherClosure(rows, stale, values) {
			let grew = true;
			while (grew) {
				grew = false;
				for (const rel of rows) for (const group of rel?.together ?? []) {
					if (!group.fields.some((m) => stale.has(m))) continue;
					for (const m of group.fields) {
						if (stale.has(m)) continue;
						if (laneBlank(values[m])) continue;
						stale.add(m);
						grew = true;
					}
				}
			}
			return stale;
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
		function unknownVariantVoice(stated, model, known, familyLanes) {
			if (familyLanes !== void 0 && familyLanes.includes(stated)) return JSON.stringify(stated) + " is a WINDOW FAMILY, not a variant — model " + JSON.stringify(model) + " derives its window family from the doc's own shape (" + familyLanes.join(", ") + "; derived, never stated). Drop the variant and the doc derives its family, or state one of the model variants (known: " + known.join(", ") + ").";
			return "unknown variant " + JSON.stringify(stated) + " for model " + JSON.stringify(model) + " (known: " + known.join(", ") + ")";
		}
		/** The variant rail's unknown-quant refusal body — same contract as
		*  {@link unknownVariantVoice}: one spelling, frame at the caller.
		*  THE HONEST VOICE (the axis-unification cure, 2026-11-06 — the
		*  operator's anima burn: the served matrix carried zero Quant rows
		*  while the DECL declared two, and the old empty tail asserted the
		*  DECL's absence, which the caller's matrix cannot see). An empty
		*  `known` is a statement about the CALLER'S PROJECTION — the served
		*  matrix it was handed — so the tail names the projection and the
		*  sync break, never a DECL fact; the DECL's own cells, when the
		*  projection carries them, ride the known list.
		*
		* @param stated the quant the caller stated, verbatim.
		* @param model the model id the cells belong to.
		* @param variant the variant whose cells were searched.
		* @param known the variant's offered quants, door order; empty
		*  yields the projection-break tail.
		* @returns the refusal body, frame-free. */
		function unknownQuantVoice(stated, model, variant, known) {
			return "unknown quant " + JSON.stringify(stated) + " for model " + JSON.stringify(model) + " variant " + JSON.stringify(variant) + (known.length > 0 ? " (known: " + known.join(", ") + ")" : " (the served matrix declares no cells for this variant — DECL/projection sync break)");
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
		/** THE MARRIED-KNOB AGGREGATION (#36, the recipes rework — compose
		*  card.ts's own layering verbatim: "a call's own knobs > the lora
		*  entry's steps > this steps row"): when a served kind declares a
		*  knob marriage and a counting bag rides, the knob is the BAG's —
		*  stated on the row first, else the catalog row's default,
		*  Math.max across the bag ("8 on a 4-step distill is fine, 4 on an
		*  8-step is undercooked"). THE ONE SPELLING (axis-unification item
		*  6, D6 — the resolver-consolidation home, beside the voices): the
		*  face's resolver (card-base resolveValue) displays through this
		*  math instead of a private copy, so the display and the compose
		*  layering cannot drift. A bag id the catalog does not serve
		*  contributes nothing (the mod plane and the compose door refuse
		*  unknown ids loudly — the display never invents a refusal of its
		*  own). PURE, no I/O.
		*
		*  @param kind the served modifier kind (marries + catalog options).
		*  @param bag the doc's riding array for the kind's param_key —
		*  entries may be any shape; non-object rows contribute nothing.
		*  @returns the knob → married value map, only knobs with at least
		*  one finite count; absent keys are untouched by the caller. */
		function marriedKnobValues(kind, bag) {
			const out = {};
			if (kind.marries === void 0) return out;
			const catalog = new Map((kind.options ?? []).map((o) => [o.value, o]));
			for (const knob of Object.keys(kind.marries)) {
				const counts = [];
				for (const row of bag) {
					if (row === null || typeof row !== "object") continue;
					const stated = row[knob];
					if (typeof stated === "number" && Number.isFinite(stated)) {
						counts.push(stated);
						continue;
					}
					const id = row["id"];
					const fromCatalog = typeof id === "string" ? catalog.get(id)?.defaults?.[knob] : void 0;
					if (typeof fromCatalog === "number" && Number.isFinite(fromCatalog)) counts.push(fromCatalog);
				}
				if (counts.length > 0) out[knob] = Math.max(...counts);
			}
			return out;
		}
		/** THE DEFAULT POOL (the wire face): offered rows minus the Recipe
		*  group; an all-Recipe family falls back to every offered row (the
		*  recipe-only family still resolves — the door's own
		*  configured.length gate). Exported for the seat that must refuse
		*  an all-hidden family BEFORE its stated search (the door's early
		*  check, order-pinned by its suite) — the pool itself has one
		*  spelling here. */
		function offeredPool(variants) {
			const offered = visibleRows(variants);
			const configured = offered.filter((v) => v.group !== "Recipe");
			return configured.length > 0 ? configured : offered;
		}
		/** THE VARIANT COORDINATE, one law per scope. Stated coordinates
		*  search the matrix the caller handed (its ids are the honest known
		*  list on a miss); unstated coordinates resolve through the scope's
		*  default (declared: first row; offered: the address claim, then
		*  the pool's first row).
		*
		*  @param variants the caller's variant matrix — DECL rows, facts
		*  rows, or the flat-matrix fold.
		*  @param stated the body's `variant` value verbatim: a string —
		*  including the empty string — is stated (the false-admit cure's
		*  loud refusal); null/undefined (and non-strings) are unstated.
		*  @param address the compose address (the family/route key the run
		*  addresses); '' when the seat has none — no claim is made.
		*  @param scope the face the caller resolves for. */
		function resolveVariantRow(variants, stated, address, scope) {
			if (scope === "declared") {
				if (stated === null || stated === void 0) return {
					status: "resolved",
					variant: variants[0]
				};
				const want = typeof stated === "string" ? stated : "";
				const hit = variants.find((v) => v.id === want);
				if (hit === void 0) return {
					status: "missing",
					stated: want,
					known: knownIds(variants)
				};
				return {
					status: "resolved",
					variant: hit
				};
			}
			const want = statedOf(stated);
			if (want !== null) {
				const hit = variants.find((v) => v.id === want || v.route === want);
				if (hit === void 0) return {
					status: "missing",
					stated: want,
					known: knownIds(variants)
				};
				if (hit.hide_from_dropdown === true) return {
					status: "hidden",
					variant: hit
				};
				return {
					status: "resolved",
					variant: hit
				};
			}
			const pool = offeredPool(variants);
			if (pool.length === 0) return {
				status: "pool-empty",
				known: knownIds(variants)
			};
			if (address !== "") {
				const claimed = pool.find((v) => v.route === address || visibleCells(v.cells ?? []).some((c) => c.route !== "" && c.route === address));
				if (claimed !== void 0) return {
					status: "resolved",
					variant: claimed
				};
			}
			return {
				status: "resolved",
				variant: pool[0]
			};
		}
		/** THE QUANT COORDINATE, one law per scope, over the RESOLVED
		*  variant's cells. Stated coordinates match the quant VALUE (never
		*  the flat row id — the axisStampOf vocabulary); unstated ones
		*  claim the address's cell, else the first (visible) cell. A
		*  variant with no cells resolves `cell: null, quant: ''` — the
		*  honest empty, the caller's voice names the sync break when it
		*  must.
		*
		*  @param variant the resolved variant row (its cells are searched).
		*  @param stated the body's `quant` value verbatim: a string —
		*  including '' — is stated; null/undefined and non-strings are
		*  unstated.
		*  @param address the compose address; '' makes no claim.
		*  @param scope the face the caller resolves for. */
		function resolveCellRow(variant, stated, address, scope) {
			const cells = variant?.cells ?? [];
			const searched = scope === "declared" ? cells : visibleCells(cells);
			const want = statedOf(stated);
			if (want !== null) {
				const hit = searched.find((c) => c.quant === want);
				if (hit === void 0) return {
					status: "missing",
					stated: want,
					known: knownQuants(searched)
				};
				return {
					status: "resolved",
					cell: hit,
					quant: want
				};
			}
			const cell = (address !== "" ? searched.find((c) => c.route !== "" && c.route === address) : void 0) ?? searched[0] ?? null;
			return {
				status: "resolved",
				cell,
				quant: cell !== null && typeof cell.quant === "string" ? cell.quant : ""
			};
		}
		/** THE CELL-ARTIFACT COORDINATES (the kroma fetch cure, 2026-11-12):
		*  a missing-weight filename IS the DECL's own identity of the file —
		*  the anchor-at-the-door law names the cell artifact's source_url
		*  basename "the lane file's name". A family plan resolves ONE
		*  coordinate (the stated one, else the family default), so the
		*  acquire door's filename filter matched no plan item for any
		*  NON-default lane's weights and refused them item-not-found — the
		*  refusal's anchor spoke the URL while the door's hands were empty.
		*  This read derives the (variant, quant) whose own cell artifact
		*  carries the filename, so the caller re-plans at the file's own
		*  coordinate. First declared match wins (the matrix walk's law);
		*  the query/fragment strip is the C5 basename law.
		*
		*  @param variants the DECL's variant matrix (any ResolverVariantRow
		*  rows whose cells may carry an `artifact` with a `source_url`).
		*  @param filename the requested weight file's basename, verbatim.
		*  @returns the artifact's coordinates, or null when no declared
		*  cell artifact carries the filename (the caller keeps its
		*  item-not-found refusal — never a guessed coordinate). */
		function cellArtifactCoordinates(variants, filename) {
			const want = filename.trim();
			if (want === "") return null;
			for (const v of variants) for (const c of v.cells ?? []) {
				const artifact = c.artifact;
				const url = typeof artifact?.source_url === "string" ? artifact.source_url : "";
				if (url === "") continue;
				let base = url.slice(url.lastIndexOf("/") + 1);
				const cut = Math.max(base.indexOf("?"), base.indexOf("#"));
				if (cut >= 0) base = base.slice(0, cut);
				if (base !== want) continue;
				return {
					variant: typeof v.id === "string" ? v.id : "",
					quant: typeof c.quant === "string" ? c.quant : ""
				};
			}
			return null;
		}
		/** THE FLAT-MATRIX FOLD (the mirror's P2 face of the one resolver):
		*  the served spec flattens cells into `group: 'Quant'` rows with
		*  `owner` backrefs; the resolver reads the nested matrix. This fold
		*  re-nests the wire rows — Variant/Recipe rows stay (a stated Recipe
		*  id searches like at the door; the POOL still excludes it from
		*  defaults), each row's cells become the Quant rows it OWNS, keyed
		*  by the quant COORDINATE (never the namespaced row id — D2's stamp
		*  plane: the address is the row's, the value is the cell's). Orphan
		*  Quant rows (no owner match) drop — the judge could never reach
		*  them either. The original members ride the spread verbatim.
		*
		*  @param rows the served spec's variants array (or any flat matrix).
		*  @returns the nested matrix: every non-Quant row with its folded
		*  cells attached. */
		function variantMatrixFromFlatRows(rows) {
			return rows.filter((r) => r.group !== "Quant").map((r) => ({
				...r,
				cells: rows.filter((c) => c.group === "Quant" && c.owner === r.id).map((c) => ({
					...c,
					id: typeof c.id === "string" ? c.id : "",
					quant: typeof c.quant === "string" ? c.quant : "",
					route: typeof c.route === "string" ? c.route : "",
					...c.hide_from_dropdown === true ? { hide_from_dropdown: true } : {}
				}))
			}));
		}
		var RELATION_WORDS, quote, UNSTATED_REQUIRED_STEM, TOGETHER_HALF_STEM, EITHER_OR_HALF_STEM, statedOf, visibleRows, visibleCells, knownIds, knownQuants;
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
			TOGETHER_HALF_STEM = " ride together on this lane (state all or none)";
			EITHER_OR_HALF_STEM = " — the stated combination completes none of them";
			statedOf = (stated) => typeof stated === "string" ? stated : null;
			visibleRows = (variants) => variants.filter((v) => v.hide_from_dropdown !== true);
			visibleCells = (cells) => cells.filter((c) => c.hide_from_dropdown !== true);
			knownIds = (variants) => variants.map((v) => v.id);
			knownQuants = (cells) => cells.map((c) => typeof c.quant === "string" ? c.quant : "");
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/familyLane.js
		/** A key is present for the family derivation when it states
		*  something: null/undefined/blank/empty-array are absence. The
		*  presence grammar every family judge shares — the derivation,
		*  the drop math, and the client mirror's refusal clause read the
		*  same seats the same way (a private spelling elsewhere is a
		*  split family waiting to burn).
		*  @param v the stated value
		*  @returns true when the value states something */
		function familyKeyPresent(v) {
			if (v === null || v === void 0) return false;
			if (typeof v === "string") return v.trim() !== "";
			if (Array.isArray(v)) return v.length > 0;
			return true;
		}
		/** Derive the doc's family lane, generic over the declared law data
		*  (the DECL's own law, pinned to the family's derivation module by
		*  the contract wall): lanes in declared order, first match wins —
		*  minCalls against the calls length, guideKeys at the doc level,
		*  callGuideKeys inside each calls row; a lane with no qualifiers is
		*  the fallthrough. No match = the last declared lane.
		*  @param law the family's declared lane law.
		*  @param doc the doc-shaped params (calls/keyframes/ref surface).
		*  @returns the derived lane id ('' only for an empty law — a shape
		*    the declaration judge refuses at boot). */
		function deriveFamilyLane(law, doc) {
			const calls = Array.isArray(doc["calls"]) ? doc["calls"] : [];
			for (const lane of law.lanes) {
				if (lane.minCalls === void 0 && lane.guideKeys === void 0 && lane.callGuideKeys === void 0) return lane.lane;
				if (lane.minCalls !== void 0 && calls.length >= lane.minCalls) return lane.lane;
				if (lane.guideKeys?.some((k) => familyKeyPresent(doc[k]))) return lane.lane;
				if (lane.callGuideKeys?.some((k) => calls.some((c) => familyKeyPresent(c?.[k])))) return lane.lane;
			}
			return law.lanes[law.lanes.length - 1]?.lane ?? "";
		}
		/** THE RESEAT DROP (the one seat's math — h3's reseatFamilyDead
		*  spine, generalized over the declaration): when the MERGED doc's
		*  derived lane refuses keys the law names dead, every dead key the
		*  doc states that the PRIOR row also stated is stale carry the
		*  family flip stranded — it drops before the judges and the store,
		*  so the row that lands is the row the next run composes. THE
		*  CARRY LINE (2026-11-11): a dead key the merged doc holds only
		*  because THIS write states it is authored, stands untouched, and
		*  the write door's family judge refuses it in the run door's own
		*  voice — the drop is never a launderer. A doc whose lane honors
		*  every stated key rides unchanged (dropped: []).
		*  @param law the family's declared lane law.
		*  @param doc the MERGED params view the write door would judge.
		*  @param prior the stored row's params BEFORE the merge.
		*  @returns the cleaned view (a NEW record when keys dropped; the
		*    input reference otherwise) + the dropped key names. */
		function reseatDeadKeys(law, doc, prior) {
			const lane = deriveFamilyLane(law, doc);
			const dead = law.deadKeys[lane];
			if (dead === void 0 || dead.length === 0) return {
				params: doc,
				dropped: []
			};
			const dropped = dead.filter((k) => Object.prototype.hasOwnProperty.call(doc, k) && Object.prototype.hasOwnProperty.call(prior, k)).sort();
			if (dropped.length === 0) return {
				params: doc,
				dropped: []
			};
			const reseated = { ...doc };
			for (const k of dropped) delete reseated[k];
			return {
				params: reseated,
				dropped
			};
		}
		var init_familyLane = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/FlowTypes.js
		var init_FlowTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/benchResult.js
		/** benchResult.ts — THE BENCH STAGE RESULT CONTRACT (the operator's
		* law, 2026-09-20: "this can all be validated by contract"). The
		* run observer patches this row onto the bench stage; every
		* consumer (the preview harvest, the drill, the studio adapters)
		* reads through this shape. The contract carries its own runtime
		* validator — `benchResultDefects` — and the WRITER asserts it
		* before patching, the READER normalizes through it, and the WALLS
		* pin it against real served bytes. A fixture can lie; a contract
		* pinned to the live shape cannot.
		*
		* THE ONE-FILE-ONE-KEY LAW: every url appears under EXACTLY ONE
		* artifacts key. A file under two keys renders twice — the doubled
		* rowset disease (the legacy 'video' stamp wrote the stage url —
		* which IS gallery[0] — under a second key, so every image-gen
		* result rendered the same picture as hero AND rest-thumb). The
		* primary `url` field may NAME a file that also lives in the map
		* (it is the primary POINTER, not a second key) — but the map's
		* VALUES are unique, always. */
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
		//#region ../../web-kit/contracts/lib/card.js
		var init_card = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/character.js
		var init_character = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/loraTypes.js
		var init_loraTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/mediaTypes.js
		var init_mediaTypes = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/modifierFaces.js
		var init_modifierFaces = __esmMin((() => {}));
		//#endregion
		//#region ../../../@deepseek-ai/dsh-util-values/lib/index.js
		function isWhitespace(c) {
			return c === " " || c === "\n" || c === "\r" || c === "	";
		}
		function isHex(c) {
			return c >= "0" && c <= "9" || c >= "a" && c <= "f" || c >= "A" && c <= "F";
		}
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
		var SIMPLE_ESCAPES, CONTENT_ESCAPE;
		var init_lib$2 = __esmMin((() => {
			SIMPLE_ESCAPES = {
				"\"": "\"",
				"\\": "\\",
				"/": "/",
				b: "\b",
				f: "\f",
				n: "\n",
				r: "\r",
				t: "	"
			};
			CONTENT_ESCAPE = /[\\\u0000-\u001f]/u;
			(class PartialArguments {
				/** The view of a call with no arguments available. */
				static EMPTY = PartialArguments.fromObject({});
				/**
				* View finished argument text without scanning it until a reader asks.
				* @param text - the complete argument JSON text.
				* @returns a sealed view.
				*/
				static fromText(text) {
					const view = new PartialArguments();
					view.append(text);
					view.sealed = true;
					return view;
				}
				/**
				* View an already parsed argument payload, such as a PTC dispatch object.
				* @param value - the parsed argument value.
				* @returns a sealed view; a non-object payload has no fields.
				*/
				static fromObject(value) {
					const view = new PartialArguments();
					view.object = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
					view.sealed = true;
					return view;
				}
				/**
				* The source: text so far or a parsed object, plus whether it can still grow.
				* These are the only enumerable fields, so two views over the same source
				* compare equal structurally however far each has been read.
				*/
				chunks = [];
				object;
				sealed = false;
				#ends = [];
				#size = 0;
				#consumed = 0;
				#mode = "root";
				#escape = false;
				#keyStart = 0;
				#keyEscaped = false;
				#key = "";
				#current = null;
				#nestedEnds = [];
				#nestedInString = false;
				#invalidAt;
				#invalidValue = false;
				#entries = /* @__PURE__ */ new Map();
				#order = [];
				#reads = /* @__PURE__ */ new Map();
				/** Whether this view rejects further appends; does not scan text or register reads. */
				get isSealed() {
					return this.sealed;
				}
				/** Whether indexing or a content read found invalid JSON; unread value contents are not validated. */
				get invalid() {
					this.scan();
					return this.#mode === "invalid" || this.#invalidValue;
				}
				/**
				* Retain streamed argument text without scanning or comparing observed answers.
				* @param fragment - the text following every fragment appended before.
				*/
				append(fragment) {
					if (this.sealed) throw new Error("PartialArguments: cannot append to a sealed view");
					if (fragment.length === 0) return;
					this.chunks.push(fragment);
					this.#size += fragment.length;
					this.#ends.push(this.#size);
				}
				/**
				* Reconcile a streamed prefix with authoritative complete text without joining the fragments.
				* @param text - the final argument text, which replaces missing or conflicting deltas.
				* @returns this view sealed with its caches retained when every character matches; otherwise a new sealed view.
				*/
				settle(text) {
					if (this.object !== void 0 || text.length !== this.#size) return PartialArguments.fromText(text);
					let offset = 0;
					for (const chunk of this.chunks) {
						if (!text.startsWith(chunk, offset)) return PartialArguments.fromText(text);
						offset += chunk.length;
					}
					this.chunks = text.length === 0 ? [] : [text];
					this.#ends = text.length === 0 ? [] : [text.length];
					this.sealed = true;
					return this;
				}
				/**
				* Compare observed answers and advance their publication baseline. Unread views remain unscanned.
				* @returns whether any observed answer changed since its first read or the preceding refresh.
				*/
				refresh() {
					if (this.#reads.size === 0) return false;
					this.scan();
					let changed = false;
					let completions = false;
					for (const read of this.#reads.values()) {
						if (read.completion) {
							completions = true;
							continue;
						}
						changed = this.refreshRead(read) || changed;
					}
					if (completions) {
						for (const read of this.#reads.values()) if (read.completion) changed = this.refreshRead(read) || changed;
					}
					if (this.sealed) this.#reads.clear();
					return changed;
				}
				refreshRead(read) {
					const now = read.answer();
					if (Object.is(now, read.last)) return false;
					read.last = now;
					return true;
				}
				/**
				* Check whether no further fields can arrive.
				* @returns whether the outer object closed, indexing failed, or the view is sealed; unread values are not validated.
				*/
				closed() {
					return this.remember("closed", "", () => this.closedNow());
				}
				/**
				* List discovered fields in first-appearance order.
				* @returns top-level keys seen so far, in first-appearance order.
				*/
				keys() {
					return this.remember("keys", "", () => this.keysNow(), (keys) => keys.length);
				}
				/**
				* Check whether a top-level field has appeared.
				* @param key - argument name.
				* @returns whether the field has appeared (a string opened or another value began).
				*/
				has(key) {
					return this.remember("has", key, () => this.hasNow(key));
				}
				/**
				* Check whether a field's closing delimiter has arrived, without validating its contents.
				* @param key - argument name.
				* @returns whether its delimiter arrived and no content reader has reported an error for this value.
				*/
				complete(key) {
					return this.remember("complete", key, () => this.completeNow(key));
				}
				/**
				* Read string length without materializing its text.
				* @param key - argument name.
				* @param options - change granularity for a streaming string.
				* @returns decoded UTF-16 length of the string field so far; undefined when absent or not a string.
				*/
				stringLength(key, options) {
					const step = Math.max(1, Math.floor(options?.step ?? 1));
					const offset = options?.offset ?? 0;
					return this.remember(`length:${step}:${offset}`, key, () => this.lengthNow(key), (length) => length === void 0 ? void 0 : Math.ceil((length + offset) / step));
				}
				/**
				* Check a string against a decoded UTF-16 length limit without materializing it.
				* @param key - argument name.
				* @param maxLength - decoded UTF-16 limit, floored to at least zero.
				* @returns whether the string is longer than the limit; false when absent or not a string.
				*/
				stringExceeds(key, maxLength) {
					const limit = Math.max(0, Math.floor(maxLength));
					return this.remember(`exceeds:${limit}`, key, () => (this.lengthNow(key, limit + 1) ?? 0) > limit);
				}
				/**
				* Read a decoded string, including a streaming prefix.
				* @param key - argument name.
				* @returns the string field's decoded text so far; undefined when absent or not a string.
				*/
				text(key) {
					return this.remember("text", key, () => this.textNow(key));
				}
				/**
				* Read at most the first decoded UTF-16 units of a string.
				* @param key - argument name.
				* @param maxLength - maximum decoded UTF-16 length, floored to at least one.
				* @returns the bounded string prefix; undefined when absent or not a string.
				*/
				textPrefix(key, maxLength) {
					const limit = Math.max(1, Math.floor(maxLength));
					return this.remember(`prefix:${limit}`, key, () => this.textPrefixNow(key, limit));
				}
				/**
				* Read a completed non-string argument.
				* @param key - argument name.
				* @returns the parsed non-string value once it closed; undefined while open, absent, or a string.
				*/
				value(key) {
					return this.remember("value", key, () => this.valueNow(key));
				}
				/** Answer a question and, on a streaming view, remember it for change detection. */
				remember(kind, key, read, comparison) {
					this.scan();
					const result = read();
					if (!this.sealed) {
						const id = `${kind}/${key}`;
						if (!this.#reads.has(id)) this.#reads.set(id, {
							completion: kind === "complete",
							answer: comparison === void 0 ? read : () => comparison(read()),
							last: comparison === void 0 ? result : comparison(result)
						});
					}
					return result;
				}
				closedNow() {
					return this.sealed || this.#mode === "closed" || this.#mode === "invalid";
				}
				keysNow() {
					return this.object === void 0 ? this.#order : Object.keys(this.object);
				}
				hasNow(key) {
					return this.object === void 0 ? this.#entries.has(key) : Object.hasOwn(this.object, key);
				}
				completeNow(key) {
					if (this.object !== void 0) return Object.hasOwn(this.object, key);
					const entry = this.#entries.get(key);
					return entry !== void 0 && entry.end >= 0 && (entry.kind === "string" ? entry.invalidAt === void 0 : !entry.invalid);
				}
				lengthNow(key, limit = Number.POSITIVE_INFINITY) {
					if (this.object !== void 0) {
						const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
						return typeof field === "string" ? field.length : void 0;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "string") return void 0;
					if (entry.text !== void 0 && entry.text.at === entry.end) return entry.text.length;
					const read = entry.length ??= {
						at: entry.start,
						length: 0,
						text: ""
					};
					this.readString(entry, read, limit, false);
					return read.length;
				}
				textNow(key) {
					if (this.object !== void 0) {
						const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
						return typeof field === "string" ? field : void 0;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "string") return void 0;
					if (entry.text === void 0 && entry.end >= 0 && entry.needsDecoding && entry.invalidAt === void 0) {
						let text;
						try {
							text = JSON.parse(`"${this.slice(entry.start, entry.end)}"`);
						} catch (_error) {}
						if (text !== void 0) entry.text = {
							at: entry.end,
							length: text.length,
							text
						};
					}
					const read = entry.text ??= {
						at: entry.start,
						length: 0,
						text: ""
					};
					this.readString(entry, read, Number.POSITIVE_INFINITY, true);
					return read.text;
				}
				textPrefixNow(key, maxLength) {
					if (this.object !== void 0) {
						const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
						return typeof field === "string" ? field.slice(0, maxLength) : void 0;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "string") return void 0;
					const prefixes = entry.prefixes ??= /* @__PURE__ */ new Map();
					let read = prefixes.get(maxLength);
					if (read === void 0) {
						read = {
							at: entry.start,
							length: 0,
							text: ""
						};
						prefixes.set(maxLength, read);
					}
					this.readString(entry, read, maxLength, true);
					return read.text;
				}
				valueNow(key) {
					if (this.object !== void 0) {
						if (!Object.hasOwn(this.object, key)) return void 0;
						const field = this.object[key];
						return typeof field === "string" ? void 0 : field;
					}
					const entry = this.#entries.get(key);
					if (entry?.kind !== "value" || entry.end < 0 || entry.invalid) return void 0;
					if (entry.parsed === void 0) try {
						entry.parsed = JSON.parse(this.slice(entry.start, entry.end));
					} catch (_error) {
						entry.invalid = true;
						this.#invalidValue = true;
					}
					return entry.parsed;
				}
				chunkAt(at) {
					let low = 0;
					let high = this.#ends.length;
					while (low < high) {
						const mid = low + high >>> 1;
						if (this.#ends[mid] <= at) low = mid + 1;
						else high = mid;
					}
					return low;
				}
				/** Materialize only a requested range, never the cumulative source. */
				slice(start, end) {
					if (start >= end) return "";
					const first = this.chunkAt(start);
					const last = this.chunkAt(end - 1);
					const base = first === 0 ? 0 : this.#ends[first - 1];
					if (first === last) return this.chunks[first].slice(start - base, end - base);
					const parts = [this.chunks[first].slice(start - base)];
					for (let i = first + 1; i < last; i++) parts.push(this.chunks[i]);
					parts.push(this.chunks[last].slice(0, end - this.#ends[last - 1]));
					return parts.join("");
				}
				readString(entry, read, limit, materialize) {
					const end = Math.min(entry.end < 0 ? this.#consumed : entry.end, entry.invalidAt ?? Number.POSITIVE_INFINITY, this.#invalidAt ?? Number.POSITIVE_INFINITY);
					if (!entry.needsDecoding) {
						const length = Math.min(end - read.at, limit - read.length);
						if (length <= 0) return;
						if (materialize) read.text += this.slice(read.at, read.at + length);
						read.at += length;
						read.length += length;
						return;
					}
					let chunkIndex = this.chunkAt(read.at);
					while (read.at < end && read.length < limit) {
						const base = chunkIndex === 0 ? 0 : this.#ends[chunkIndex - 1];
						const chunk = this.chunks[chunkIndex];
						const remaining = chunk.slice(read.at - base, Math.min(chunk.length, end - base));
						const boundary = remaining.search(CONTENT_ESCAPE);
						const length = Math.min(boundary < 0 ? remaining.length : boundary, limit - read.length);
						if (length > 0) {
							if (materialize) read.text += remaining.slice(0, length);
							read.at += length;
							read.length += length;
							if (read.at === base + chunk.length) chunkIndex++;
							continue;
						}
						const type = remaining.length > 1 ? remaining[1] : read.at + 1 < end ? this.chunks[chunkIndex + 1][0] : void 0;
						let decoded;
						let width = 2;
						if (remaining[0] === "\\" && type === void 0 && entry.end < 0) return;
						if (remaining[0] === "\\" && type === "u") {
							const hex = this.slice(read.at + 2, Math.min(end, read.at + 6));
							let valid = true;
							for (let i = 0; i < hex.length; i++) if (!isHex(hex[i])) valid = false;
							if (valid) {
								if (hex.length < 4 && entry.end < 0) return;
								if (hex.length === 4) decoded = String.fromCharCode(Number.parseInt(hex, 16));
							}
							width = 6;
						} else if (remaining[0] === "\\" && type !== void 0) decoded = SIMPLE_ESCAPES[type];
						if (decoded === void 0) {
							entry.invalidAt = read.at;
							this.#invalidValue = true;
							return;
						}
						if (materialize) read.text += decoded;
						read.length++;
						read.at += width;
						while (chunkIndex < this.chunks.length && read.at >= this.#ends[chunkIndex]) chunkIndex++;
					}
				}
				/** Locate new field ranges without decoding or parsing their contents. */
				scan() {
					if (this.object !== void 0 || this.#consumed === this.#size) return;
					for (let i = this.chunkAt(this.#consumed); i < this.chunks.length && this.#invalidAt === void 0; i++) {
						const pending = this.chunks[i];
						const base = i === 0 ? 0 : this.#ends[i - 1];
						for (let index = this.#consumed - base; index < pending.length && this.#mode !== "invalid"; index++) {
							if (this.#mode === "string" || this.#mode === "nested" && this.#nestedInString) {
								const end = this.stringBoundary(pending, index);
								this.#consumed += end - index;
								index = end;
								if (index === pending.length) break;
							}
							this.step(pending[index], this.#consumed);
							this.#consumed++;
						}
					}
				}
				/** Only raw quotes and their preceding backslash runs can terminate a string. */
				stringBoundary(fragment, start) {
					let at = start;
					while (true) {
						const quote = fragment.indexOf("\"", at);
						const end = quote < 0 ? fragment.length : quote;
						if (this.#mode === "string") {
							const entry = this.#current;
							if (!entry.needsDecoding && CONTENT_ESCAPE.test(fragment.slice(at, end))) entry.needsDecoding = true;
						}
						let slashStart = end;
						while (slashStart > at && fragment[slashStart - 1] === "\\") slashStart--;
						const escaped = (end - slashStart) % 2 === 1 !== (slashStart === at && this.#escape);
						this.#escape = quote < 0 && escaped;
						if (quote < 0 || !escaped) return end;
						at = quote + 1;
					}
				}
				step(c, at) {
					switch (this.#mode) {
						case "root":
							if (isWhitespace(c)) return;
							if (c === "{") {
								this.#mode = "key-or-end";
								return;
							}
							this.fail();
							return;
						case "key-or-end":
							if (isWhitespace(c)) return;
							if (c === "}") {
								this.#mode = "closed";
								return;
							}
							if (c === "\"") {
								this.beginKey(at);
								return;
							}
							this.fail();
							return;
						case "key-only":
							if (isWhitespace(c)) return;
							if (c === "\"") {
								this.beginKey(at);
								return;
							}
							this.fail();
							return;
						case "key":
							this.stepKey(c, at);
							return;
						case "colon":
							if (isWhitespace(c)) return;
							if (c === ":") {
								this.#mode = "value";
								return;
							}
							this.fail();
							return;
						case "value":
							this.beginValue(c, at);
							return;
						case "string": {
							const entry = this.#current;
							entry.end = at;
							this.#current = null;
							this.#mode = "comma-or-end";
							return;
						}
						case "scalar":
							this.stepScalar(c, at);
							return;
						case "nested":
							this.stepNested(c, at);
							return;
						case "comma-or-end":
							if (isWhitespace(c)) return;
							if (c === ",") {
								this.#mode = "key-only";
								return;
							}
							if (c === "}") {
								this.#mode = "closed";
								return;
							}
							this.fail();
							return;
						case "closed":
							if (isWhitespace(c)) return;
							this.fail();
							return;
						/* v8 ignore next 2 -- scan() stops stepping once the view is invalid. */
						case "invalid": return;
						/* v8 ignore next 2 -- Every scanner mode has a handler above. */
						default: assertNever(this.#mode);
					}
				}
				fail() {
					this.#invalidAt = this.#consumed;
					this.#mode = "invalid";
					this.#current = null;
				}
				beginKey(at) {
					this.#mode = "key";
					this.#keyStart = at + 1;
					this.#keyEscaped = false;
					this.#escape = false;
				}
				stepKey(c, at) {
					if (c < " ") {
						this.fail();
						return;
					}
					if (this.#escape) {
						this.#escape = false;
						return;
					}
					if (c === "\\") {
						this.#escape = true;
						this.#keyEscaped = true;
						return;
					}
					if (c !== "\"") return;
					const raw = this.slice(this.#keyStart, at);
					if (this.#keyEscaped) try {
						this.#key = JSON.parse(`"${raw}"`);
					} catch (_error) {
						this.fail();
						return;
					}
					else this.#key = raw;
					this.#mode = "colon";
				}
				open(entry) {
					if (!this.#entries.has(this.#key)) this.#order.push(this.#key);
					this.#entries.set(this.#key, entry);
					this.#current = entry;
				}
				beginValue(c, at) {
					if (isWhitespace(c)) return;
					if (c === "\"") {
						this.open({
							kind: "string",
							start: at + 1,
							end: -1,
							needsDecoding: false,
							invalidAt: void 0,
							length: void 0,
							text: void 0,
							prefixes: void 0
						});
						this.#escape = false;
						this.#mode = "string";
						return;
					}
					if (c === "}" || c === "," || c === ":" || c === "]") {
						this.fail();
						return;
					}
					this.open({
						kind: "value",
						start: at,
						end: -1,
						parsed: void 0,
						invalid: false
					});
					if (c === "{" || c === "[") {
						this.#mode = "nested";
						this.#nestedEnds = [c === "{" ? "}" : "]"];
						this.#nestedInString = false;
						this.#escape = false;
						return;
					}
					this.#mode = "scalar";
				}
				stepScalar(c, at) {
					if (c !== "," && c !== "}" && !isWhitespace(c)) return;
					this.closeValue(at);
					this.#mode = c === "," ? "key-only" : c === "}" ? "closed" : "comma-or-end";
				}
				stepNested(c, at) {
					if (this.#nestedInString) {
						this.#nestedInString = false;
						return;
					}
					if (c === "\"") {
						this.#nestedInString = true;
						return;
					}
					if (c === "{" || c === "[") {
						this.#nestedEnds.push(c === "{" ? "}" : "]");
						return;
					}
					if (c === "}" || c === "]") {
						if (this.#nestedEnds.pop() !== c) {
							this.fail();
							return;
						}
						if (this.#nestedEnds.length === 0) {
							this.closeValue(at + 1);
							this.#mode = "comma-or-end";
						}
					}
				}
				closeValue(end) {
					const entry = this.#current;
					entry.end = end;
					this.#current = null;
				}
			});
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/modifierSubcards.js
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
			init_lib$2();
			NO_CN_SCHEMA = {
				type: "",
				label: ""
			};
			_cnIdCounter = 0;
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/objectUrlCache.js
		/** True iff `s` is a base64 data URL (large enough that streaming
		*  matters — the timeline package gates its blob handling on this).
		*  The object-URL cache this module once carried was deleted with the
		*  2026-10-21 dead-exports census: no production consumer converted
		*  through it — only the module's own spec. */
		function isDataUrl(s) {
			return typeof s === "string" && s.startsWith("data:") && s.length > 128;
		}
		var init_objectUrlCache = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/rootsManifest.js
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
		//#region ../../web-kit/contracts/lib/stagePreview.js
		var init_stagePreview = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/stageView.js
		function recordOf$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function nonEmptyString$1(value) {
			return typeof value === "string" && value !== "" ? value : "";
		}
		function stringsOf$1(value) {
			return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && entry !== "") : [];
		}
		/** THE STATUS FOLD — the one owner of "what does this raw status word
		*  mean" (2026-10-13, the card-UI duplication audit: five seats folded
		*  the same words privately and disagreed — 'cached' rendered as `done`
		*  in one and a failure-looking `stopped` in another, and a stage the
		*  estate settles as 'completed' matched no branch at all in one of
		*  them). Every seat asks THIS. */
		function statusOf$1(value) {
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
					const known = [...RUN_STATUS_WORDS$1].join(", ");
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
		function statusOrPendingOf$1(value) {
			return RUN_STATUS_WORDS$1.has(value.toLowerCase()) ? statusOf$1(value) : "pending";
		}
		function galleryOf$1(value) {
			if (!Array.isArray(value)) return void 0;
			const gallery = value.flatMap((entry) => {
				const row = recordOf$1(entry);
				const name = nonEmptyString$1(row["name"]);
				const url = nonEmptyString$1(row["url"]);
				return name !== "" && url !== "" ? [{
					name,
					url
				}] : [];
			});
			return gallery.length > 0 ? gallery : void 0;
		}
		function previewsOf$1(value) {
			if (!Array.isArray(value)) return void 0;
			const previews = value.flatMap((entry) => {
				const row = recordOf$1(entry);
				const label = nonEmptyString$1(row["label"]);
				const artifact = nonEmptyString$1(row["artifact"]);
				const url = row["url"] === null || typeof row["url"] === "string" ? row["url"] : null;
				return label !== "" && artifact !== "" ? [{
					label,
					url,
					artifact
				}] : [];
			});
			return previews.length > 0 ? previews : void 0;
		}
		function cardResultFromRecord$1(value) {
			const result = recordOf$1(value);
			const artifacts = {};
			for (const [name, url] of Object.entries(recordOf$1(result["artifacts"]))) {
				const clean = nonEmptyString$1(url);
				if (clean !== "") artifacts[name] = clean;
			}
			const assetUrls = stringsOf$1(result["assetUrls"]);
			const metadata = recordOf$1(result["metadata"]);
			if (Object.keys(artifacts).length === 0 && assetUrls.length === 0) return null;
			return {
				artifacts,
				assetUrls,
				metadata,
				...typeof result["durationSec"] === "number" ? { durationSec: result["durationSec"] } : {},
				...galleryOf$1(result["gallery"]) === void 0 ? {} : { gallery: galleryOf$1(result["gallery"]) },
				...previewsOf$1(result["motionPreviews"]) === void 0 ? {} : { motionPreviews: previewsOf$1(result["motionPreviews"]) }
			};
		}
		function inputBindingsOf$1(value) {
			const bindings = [];
			for (const [slot, raw] of Object.entries(recordOf$1(value))) {
				const ref = recordOf$1(raw);
				const stage = nonEmptyString$1(ref["stage"]);
				if (stage !== "") {
					const output = nonEmptyString$1(ref["output"]);
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
		function projectStageView$1(owner, options = {}) {
			const row = owner.row;
			const resolved = recordOf$1(row["resolved"]);
			const rowParams = recordOf$1(row["params"]);
			const params = owner.effective?.params ?? rowParams;
			const card = nonEmptyString$1(row["card"]) || owner.cardName;
			const kind = options.kind ?? (card || "stage");
			const service = options.service ?? (nonEmptyString$1(row["service"]) || kind);
			const model = nonEmptyString$1(owner.effective?.model) || nonEmptyString$1(resolved["model"]) || nonEmptyString$1(row["model"]) || nonEmptyString$1(params["model"]) || service;
			const inputSlots = (owner.effective?.inputSlots ?? []).filter((slot) => typeof slot === "string" && slot !== "");
			const inputBindings = inputBindingsOf$1(row["inputs"]);
			const inputs = inputBindings.flatMap((binding) => "stage" in binding.source ? [binding.source.stage] : []);
			const inputOutputs = inputBindings.map((binding) => "stage" in binding.source ? binding.source.output ?? null : null);
			const priorStageIds = owner.priorStageIds ?? owner.upstream.map((stage) => stage.id);
			const inputIndices = inputs.map((id) => priorStageIds.indexOf(id));
			const result = cardResultFromRecord$1(row["result"]);
			const harvested = options.result === void 0 ? result : options.result(row, result);
			const resultRecord = recordOf$1(row["result"]);
			const metadata = recordOf$1(harvested?.metadata);
			const error = nonEmptyString$1(row["error"]) || nonEmptyString$1(resultRecord["error"]) || nonEmptyString$1(metadata["error"]);
			const runId = owner.runId || nonEmptyString$1(row["runId"]) || nonEmptyString$1(resultRecord["runId"]) || nonEmptyString$1(resultRecord["run_id"]) || nonEmptyString$1(metadata["runId"]) || null;
			const tags = Array.isArray(row["tags"]) ? row["tags"].filter((tag) => tag === "ai_generated") : void 0;
			return {
				id: owner.stageId,
				title: nonEmptyString$1(row["title"]) || card || owner.stageId,
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
				status: statusOrPendingOf$1(owner.runStatus),
				...error === "" ? {} : { error },
				runId,
				...typeof row["saveToAssets"] === "boolean" ? { saveToAssets: row["saveToAssets"] } : {}
			};
		}
		function projectUpstreamStages$1(owner, options = {}) {
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
		var TERMINAL_RUN_STATUSES, LIVE_RUN_STATUSES, RUN_STATUS_WORDS$1;
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
			RUN_STATUS_WORDS$1 = /* @__PURE__ */ new Set([
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
		//#region ../../web-kit/contracts/lib/studio.js
		var init_studio = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/timelineTypes.js
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
		//#region ../../web-kit/contracts/lib/vocab.js
		/** Is the value a valid Provenance? Gate untrusted JSON (a past run's
		* metadata, a drag payload) before rendering. */
		function isProvenance(v) {
			return typeof v === "string" && PROVENANCE_VALUES$1.includes(v);
		}
		var Provenance$1, PROVENANCE_VALUES$1;
		var init_vocab = __esmMin((() => {
			Provenance$1 = {
				agent: "agent",
				user: "user",
				imported: "imported"
			};
			PROVENANCE_VALUES$1 = Object.values(Provenance$1);
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/benchStage.js
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
		/** THE PARSE-EDGE / TEST MINT: brand a draft id read off the wire or
		*  disk (route the typeof-guarded value through here at the door
		*  that pulled it), or mint a test literal. One line, no runtime
		*  validation — the brand is compile-time-only; the return cast is
		*  the construction door (the newRunId pattern).
		*  @param literal the plain draft id string at its parse edge
		*  @returns the same string, branded for the typed seats downstream */
		function draftIdOf(literal) {
			return literal;
		}
		/** The MINT — the inverse of benchSessionOf (2026-10-13, the card-UI
		*  duplication audit). The grammar moved to this floor and the DECISION
		*  beside it, but the mint stayed behind in six seats spelling
		*  `"bench-" + session` — one of which stripped the prefix and added
		*  it straight back. An address has one grammar, one sanitize, and now
		*  one mint. The composed bench id is BORN here, so the mint is one
		*  of the DraftId brand's two producers: the return cast is the
		*  construction door (the newRunId pattern).
		*  @param session the sanitized bench session key
		*  @returns the composed draft id, branded */
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
		//#region ../../web-kit/contracts/lib/index.js
		var lib_exports$1 = /* @__PURE__ */ __exportAll({
			BENCH_DRAFT_PREFIX_RE: () => BENCH_DRAFT_PREFIX_RE,
			BENCH_DRAFT_RE: () => BENCH_DRAFT_RE,
			BIRTH_STRIP_KEYS: () => BIRTH_STRIP_KEYS,
			CARD_PLANE_ENGINE: () => CARD_PLANE_ENGINE,
			DEFAULT_LIPSYNC_FIELDS: () => DEFAULT_LIPSYNC_FIELDS,
			DEFAULT_SEGMENT_PARAMS: () => DEFAULT_SEGMENT_PARAMS,
			EDITOR_ONLY_SEGMENT_KEYS: () => EDITOR_ONLY_SEGMENT_KEYS,
			EXTRA_KEYS: () => EXTRA_KEYS$1,
			EXTRA_KEY_SET: () => EXTRA_KEY_SET$1,
			FLF_MODES: () => FLF_MODES,
			LEGACY_RUN_MEDIA_PREFIX: () => LEGACY_RUN_MEDIA_PREFIX,
			LOAD_CARRY_KEYS: () => LOAD_CARRY_KEYS,
			MEDIA_SET: () => MEDIA_SET,
			NO_CN_SCHEMA: () => NO_CN_SCHEMA,
			PROVENANCE_VALUES: () => PROVENANCE_VALUES$1,
			Provenance: () => Provenance$1,
			RELATION_WORDS: () => RELATION_WORDS,
			RESTORED_PROVENANCE_SPELLING: () => RESTORED_PROVENANCE_SPELLING,
			RESTORE_STRIP_KEYS: () => RESTORE_STRIP_KEYS,
			ROLE_SET: () => ROLE_SET,
			RUN_ID_RE: () => RUN_ID_RE,
			RUN_MEDIA_PREFIX: () => RUN_MEDIA_PREFIX,
			RUN_STATUS_WORDS: () => RUN_STATUS_WORDS$1,
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
			cardResultFromRecord: () => cardResultFromRecord$1,
			cellArtifactCoordinates: () => cellArtifactCoordinates,
			cnEntriesOf: () => cnEntriesOf,
			crossRootOrder: () => crossRootOrder,
			deriveFamilyLane: () => deriveFamilyLane,
			draftIdOf: () => draftIdOf,
			dropAuthoringIncomplete: () => dropAuthoringIncomplete,
			extraOf: () => extraOf,
			familyKeyPresent: () => familyKeyPresent,
			hasModifierCapability: () => hasModifierCapability,
			healRunMediaPaths: () => healRunMediaPaths,
			isDataUrl: () => isDataUrl,
			isEitherOrHalfVoice: () => isEitherOrHalfVoice,
			isLiveRunStatus: () => isLiveRunStatus,
			isProvenance: () => isProvenance,
			isPurelyUnstatedRequiredVoice: () => isPurelyUnstatedRequiredVoice,
			isTerminalStatus: () => isTerminalStatus,
			isTogetherHalfVoice: () => isTogetherHalfVoice,
			isUnstatedRequiredVoice: () => isUnstatedRequiredVoice,
			judgeDeliverableSize: () => judgeDeliverableSize,
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
			laneTogetherClosure: () => laneTogetherClosure,
			loraAdaptersOf: () => loraAdaptersOf,
			loraIdOf: () => loraIdOf,
			loraLabel: () => loraLabel,
			loraStrengthBoundsOf: () => loraStrengthBoundsOf,
			marriedKnobValues: () => marriedKnobValues,
			modifiersFeatureOf: () => modifiersFeatureOf,
			moveItem: () => moveItem,
			newControlnetEntry: () => newControlnetEntry,
			newGenericEntry: () => newGenericEntry,
			newLoraEntry: () => newLoraEntry,
			normalizeBenchStage: () => normalizeBenchStage,
			normalizeBenchStages: () => normalizeBenchStages,
			normalizeLoraEntry: () => normalizeLoraEntry,
			normalizeSegmentStatus: () => normalizeSegmentStatus,
			offeredPool: () => offeredPool,
			projectStageView: () => projectStageView$1,
			projectUpstreamStages: () => projectUpstreamStages$1,
			reseatDeadKeys: () => reseatDeadKeys,
			resolveCellRow: () => resolveCellRow,
			resolveVariantRow: () => resolveVariantRow,
			rootsManifest: () => rootsManifest,
			runMediaPrefixOf: () => runMediaPrefixOf,
			runTailOf: () => runTailOf,
			samplerEnvelopeCure: () => samplerEnvelopeCure,
			searchedVoice: () => searchedVoice,
			stageEngineOf: () => stageEngineOf,
			statusOf: () => statusOf$1,
			statusOrPendingOf: () => statusOrPendingOf$1,
			stripKeys: () => stripKeys,
			stripSelfNamedModel: () => stripSelfNamedModel,
			subcardCount: () => subcardCount,
			subcardId: () => subcardId,
			subcardsFromParams: () => subcardsFromParams,
			unknownQuantVoice: () => unknownQuantVoice,
			unknownVariantVoice: () => unknownVariantVoice,
			variantMatrixFromFlatRows: () => variantMatrixFromFlatRows
		});
		var init_lib$1 = __esmMin((() => {
			init_extraKeys();
			init_laneRelations();
			init_familyLane();
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
		//#region ../../web-kit/catalog/lib/sleep.js
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
		//#region ../../web-kit/catalog/lib/clientStore.js
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
		//#region ../../web-kit/catalog/lib/api.js
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
		//#region ../../web-kit/catalog/lib/contractToast.js
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
		//#region ../../web-kit/catalog/lib/catalogContract.js
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
		//#region ../../web-kit/catalog/lib/modelCatalog.js
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
				if (Date.now() - _cacheTime > _CACHE_TTL_MS && !_inflight$3) _inflight$3 = (async () => {
					try {
						_ingest(await apiJson("/v1/model-catalog"));
					} catch (e) {
						if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
						else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					}
					return catalogStore.getState().catalog;
				})().finally(() => {
					_inflight$3 = null;
				});
				return cached;
			}
			if (_inflight$3) return _inflight$3;
			_inflight$3 = (async () => {
				try {
					return _ingest(await apiJson("/v1/model-catalog"));
				} catch (e) {
					if (e instanceof CatalogContractError) useCatalogContractStore.getState().reportViolation(e.violations);
					else useCatalogContractStore.getState().reportError(e instanceof Error ? e.message : String(e));
					throw e;
				}
			})().finally(() => {
				_inflight$3 = null;
			});
			return _inflight$3;
		}
		/** Fire-and-forget background load with auto-retry. If the first attempt
		* fails (gateway reloading, network blip), schedules a retry after 3s.
		* Keeps trying until the catalog loads, then notifies subscribers.
		* Safe to call multiple times — collapses into a single inflight request. */
		function ensureCatalog() {
			if (catalogStore.getState().loaded) return;
			if (_inflight$3) return;
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
		var CARD_GENRES, catalogStore, _cacheTime, _CACHE_TTL_MS, _inflight$3, _bgRetryTimer;
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
			_inflight$3 = null;
			_bgRetryTimer = null;
			ensureCatalog();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/catalogContractStore.js
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
		//#region ../../web-kit/catalog/lib/runStatusContract.js
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
		//#region ../../web-kit/catalog/lib/runStatusContractStore.js
		/** Re-poll the run — the toast's Retry action. Recovered → clear; still
		*  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
		*  whole protocol layer; the store only needs it on click. */
		function repoll(runId) {
			if (repollInFlight.has(runId)) return;
			repollInFlight.add(runId);
			Promise.resolve().then(() => (init_FlowProtocol$1(), FlowProtocol_exports$1)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
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
		//#region ../../web-kit/catalog/lib/familyParamContract.js
		var familyParamContract_exports$1 = /* @__PURE__ */ __exportAll({
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema$1,
			coerceParamsToSchema: () => coerceParamsToSchema$1,
			getFamilySchema: () => getFamilySchema$1,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated$1,
			loadFamilySchemas: () => loadFamilySchemas$1,
			validateModifierEntries: () => validateModifierEntries$1,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema$1
		});
		/** Ingest gate (audit R-S7, 2026-10-22): a 200 body is a schema index
		*  only when every value carries a `properties` record — an error
		*  envelope or a proxy's JSON non-index must never reach _cache. This
		*  mirrors modelCatalog._ingest (validate before caching), which this
		*  loader mirrors in every other respect. */
		function isValidSchemaIndex$1(data) {
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
		async function loadFamilySchemas$1(opts) {
			if (_cache$1 && !opts?.force) return _cache$1;
			if (_inflight$2) return _inflight$2;
			_inflight$2 = (async () => {
				try {
					const data = await apiJson("/v1/flows/families/param-schemas");
					if (!isValidSchemaIndex$1(data)) throw new Error(`families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`);
					_cache$1 = data;
					return data;
				} finally {
					_inflight$2 = null;
				}
			})();
			return _inflight$2;
		}
		/** Sync lookup — returns the cached schema for a family, or null if the
		* cache isn't loaded yet or the family is unknown. Pure, no fetch. */
		function getFamilySchema$1(familyId) {
			if (!_cache$1) return null;
			return _cache$1[familyId] ?? null;
		}
		/** Is the schema cache POPULATED (a successful bulk fetch with ≥1
		* family)? Distinguishes "transmission worked and the family is absent"
		* (a phantom family — throw) from the cache-cold/failed branch (defer). */
		function isFamilySchemaCachePopulated$1() {
			return !!_cache$1 && Object.keys(_cache$1).length > 0;
		}
		function jsonTypeOf$1(val) {
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
		function coerceParamsToSchema$1(schema, params, opts = {}) {
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
				const actual = jsonTypeOf$1(val);
				if (actual === expected) {
					typed[key] = val;
					continue;
				}
				if (expected === "number" && actual === "integer") {
					typed[key] = val;
					continue;
				}
				const coerced = coerceScalar$1(key, expected, val);
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
		function coerceScalar$1(_key, expected, val) {
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
		function validateParamsAgainstSchema$1(schema, params, opts = {}) {
			const out = [];
			const prefix = opts.pathPrefix ? `${opts.pathPrefix}.` : "";
			const props = schema.properties ?? {};
			if (Object.keys(props).length === 0) return out;
			for (const [key, val] of Object.entries(params)) {
				const field = props[key];
				if (!field) {
					if (schema.additionalProperties === false && !WIRE_RELAXED_KEYS$1.has(key)) out.push({
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
				const actual = jsonTypeOf$1(val);
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
		function validateModifierEntries$1(kinds, params) {
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
					if (fields.length > 0 && fields[0].name) checkModEntry$1(out, { [fields[0].name]: value }, fields, kind, key, kind.kind === "controlnet");
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
					checkModEntry$1(out, entry, fields, kind, entryPath, cnKind);
				}
			}
			return out;
		}
		function checkModEntry$1(out, entry, fields, kind, path, cnKind) {
			const declared = /* @__PURE__ */ new Map();
			for (const f of fields) if (f.name) declared.set(f.name, f);
			const allowed = /* @__PURE__ */ new Set([...declared.keys(), ...EDITOR_MOD_ENTRY_KEYS$1]);
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
		async function assertParamsMatchFamilySchema$1(model, params) {
			let family;
			let modifiers;
			let cat;
			try {
				const { getCachedCatalog } = await Promise.resolve().then(() => (init_lib(), lib_exports));
				cat = getCachedCatalog();
				family = cat?.models?.[model]?.family;
				modifiers = cat?.families?.[family ?? ""]?.modifiers;
			} catch {
				return params;
			}
			if (!cat) return params;
			if (!family) throw new Error(`Parameter validation failed — model '${model}' is not in the catalog. The picker showed a model that DOES NOT EXIST; the catalog is the source of truth and this key is not in it. (The backend wire gate would 400 the same request.)`);
			try {
				await loadFamilySchemas$1();
			} catch {
				return params;
			}
			const schema = getFamilySchema$1(family);
			if (!schema) {
				if (isFamilySchemaCachePopulated$1()) throw new Error(`Parameter validation failed — family '${family}' (model '${model}') has no param schema in the populated cache — the backend does not know this family. Refusing to validate against nothing.`);
				return params;
			}
			const coerced = coerceParamsToSchema$1(schema, params);
			const violations = [...coerced.violations];
			violations.push(...validateParamsAgainstSchema$1(schema, coerced.params));
			violations.push(...validateModifierEntries$1(modifiers, params));
			if (violations.length > 0) {
				const lines = violations.map((v) => `  - ${v.path}: ${v.message}`).join("\n");
				throw new Error(`Parameter validation failed — the params do not match the '${family}' family signature. Fix before running:\n${lines}\n\n(The backend's wire gate would reject this same request with 400.)`);
			}
			return coerced.params;
		}
		var _cache$1, _inflight$2, WIRE_RELAXED_KEYS$1, EDITOR_MOD_ENTRY_KEYS$1;
		var init_familyParamContract$1 = __esmMin((() => {
			init_api();
			_cache$1 = null;
			_inflight$2 = null;
			WIRE_RELAXED_KEYS$1 = /* @__PURE__ */ new Set([
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
			EDITOR_MOD_ENTRY_KEYS$1 = /* @__PURE__ */ new Set([
				"id",
				"value",
				"model",
				"preprocessor",
				"enabled",
				"source"
			]);
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/cardBirth.js
		var cardBirth_exports$1 = /* @__PURE__ */ __exportAll({
			composeCard: () => composeCard$1,
			ensureDraftId: () => ensureDraftId$1
		});
		/** Mint the card doc for a start body. The doc carries the body
		*  verbatim (intent/stages/model/params become the card extras —
		*  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
		*  so what the card shows is what the run consumed. Throws LOUDLY
		*  on any refusal — a refused compose never proceeds to a start
		*  (no silent cardless runs).
		*  @param body the raw start body (rides the compose POST verbatim)
		*  @param signal the caller's abort signal
		*  @returns the composed draft id, branded at this birth */
		async function composeCard$1(body, signal) {
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
			return draftIdOf(draftId);
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*
		*  @param body the raw start body (its declared draft_id wins)
		*  @param signal the caller's abort signal
		*  @returns the declared-or-composed draft id, branded at this door */
		async function ensureDraftId$1(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return draftIdOf(declared);
			return composeCard$1(body, signal);
		}
		var init_cardBirth$1 = __esmMin((() => {
			init_benchStage();
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/FlowProtocol.js
		var FlowProtocol_exports$1 = /* @__PURE__ */ __exportAll({
			assertNoParamDrops: () => assertNoParamDrops$1,
			collectNamedArtifacts: () => collectNamedArtifacts$1,
			collectStageUrls: () => collectStageUrls$1,
			describeErrorBody: () => describeErrorBody$1,
			pollFlowRun: () => pollFlowRun$1,
			runCompiledGeneration: () => runCompiledGeneration$1,
			sanitizeRevivedResult: () => sanitizeRevivedResult$1,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver$1
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
		function describeErrorBody$1(text) {
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
		function collectStageUrls$1(stages) {
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
		function sanitizeRevivedResult$1(raw) {
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
		*  — lets a downstream slot wire a SPECIFIC output (mask → input_mask)
		*  rather than only the primary (assetUrls[0]). Falls back to {} when the
		*  backend didn't send named_urls (legacy runs / single-output bricks). */
		function collectNamedArtifacts$1(stages) {
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
		async function pollFlowRun$1(runId, signal, opts) {
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
		function setRequiredEmptyResolver$1(fn) {
			_requiredEmptyResolver$1 = fn;
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
		function assertNoParamDrops$1(body) {
			const dropped = [];
			const mutated = [];
			for (const [key, val] of Object.entries(body)) if (val === void 0) dropped.push(key);
			else if (typeof val === "number" && !Number.isFinite(val)) mutated.push(`${key} (NaN/Infinity → JSON serializes as null)`);
			else if (typeof val === "function" || typeof val === "symbol") dropped.push(`${key} (${typeof val} value — JSON.stringify drops it)`);
			else if (typeof val === "bigint") mutated.push(`${key} (bigint → JSON.stringify throws)`);
			if (typeof body.model === "string" && _requiredEmptyResolver$1) {
				const fields = _requiredEmptyResolver$1(body.model, body);
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
		function violationLines$1(text) {
			try {
				const parsed = JSON.parse(text);
				if (Array.isArray(parsed.violations)) {
					const lines = parsed.violations.map((v) => `${String(v.field ?? "?")}: ${String(v.message ?? "")}`).filter((line) => !line.endsWith(": "));
					if (lines.length > 0) return `\n${lines.join("\n")}`;
				}
			} catch {}
			return "";
		}
		async function runCompiledGeneration$1(body, signal, opts) {
			if (Array.isArray(body.loras)) {
				const { normalizeLoraEntry } = await Promise.resolve().then(() => (init_lib$1(), lib_exports$1));
				body = {
					...body,
					loras: body.loras.map((e) => e && typeof e === "object" ? normalizeLoraEntry(e) : e)
				};
			}
			assertNoParamDrops$1(body);
			let typedBody = body;
			if (typeof body.model === "string") {
				const { assertParamsMatchFamilySchema } = await Promise.resolve().then(() => (init_familyParamContract$1(), familyParamContract_exports$1));
				const paramOnly = {};
				for (const [k, v] of Object.entries(body)) {
					if (k === "model") continue;
					paramOnly[k] = v;
				}
				typedBody = {
					...await assertParamsMatchFamilySchema(body.model, paramOnly),
					model: body.model
				};
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth$1(), cardBirth_exports$1));
				typedBody.draft_id = await ensureDraftId(typedBody, signal);
				const compileRes = await fetch("/v1/flows/validate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(typedBody),
					signal
				});
				if (!compileRes.ok) {
					const text = await compileRes.text();
					throw new Error(`card failed to compile: HTTP ${compileRes.status}${text ? `: ${describeErrorBody$1(text)}` : ""}${violationLines$1(text)}`);
				}
			}
			if (typeof typedBody.draft_id !== "string" || typedBody.draft_id === "") {
				const { ensureDraftId } = await Promise.resolve().then(() => (init_cardBirth$1(), cardBirth_exports$1));
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
					throw new Error(`generate failed: /v1/flows/start returned non-JSON body: ${text.slice(0, NON_JSON_BODY_CAP$1)}`);
				}
				const runId = data.run_id;
				if (typeof runId !== "string") throw new Error(`generate failed: /v1/flows/start returned no run_id: ${describeErrorBody$1(text)}`);
				try {
					opts?.onStart?.(runId);
				} catch (err) {
					console.error("[flow-protocol] onStart callback failed (run continues):", err);
				}
				const status = await pollFlowRun$1(runId, signal, {
					intervalMs: opts?.intervalMs,
					onTick: opts?.onTick
				});
				return {
					kind: "started",
					runId,
					status,
					urls: collectStageUrls$1(status.stages)
				};
			}
			throw new Error(`generate failed: HTTP ${res.status}${text ? `: ${describeErrorBody$1(text)}` : ""}${violationLines$1(text)}`);
		}
		var NON_JSON_BODY_CAP$1, _requiredEmptyResolver$1;
		var init_FlowProtocol$1 = __esmMin((() => {
			init_api();
			init_runStatusContract();
			init_runStatusContractStore();
			init_sleep();
			NON_JSON_BODY_CAP$1 = 2e3;
			_requiredEmptyResolver$1 = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/tagMap.js
		/** Is the value a valid TagColor? Gates untrusted JSON (localStorage,
		*  a future server payload) before it enters the store. */
		function isTagColor$1(v) {
			return typeof v === "string" && TAG_COLOR_VALUES$1.includes(v);
		}
		function slugify$1(name) {
			return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "tag";
		}
		/** Generate a unique tag id from a name, appending -2, -3, … on collision. */
		function uniqueId$1(name, existing) {
			const base = slugify$1(name);
			if (!existing.has(base)) return base;
			let n = 2;
			while (existing.has(`${base}-${n}`)) n++;
			return `${base}-${n}`;
		}
		/** Cycle through the palette so consecutive new tags get distinct colors. */
		function nextColor$1(count) {
			return TAG_COLOR_VALUES$1[count % TAG_COLOR_VALUES$1.length];
		}
		/**
		* Boundary ratchet — gate untrusted JSON (localStorage OR a server payload)
		* before it enters the store. Drops any tag whose color isn't in the closed
		* enum, then rebuilds the forward index dropping orphan entries. This is the
		* store's own TagDocument validator; the server enforces the same rules
		* on PUT, but we don't trust the wire even from our own server
		* — defense in depth.
		*/
		function validateDocument$1(parsed) {
			const empty = {
				tags: {},
				map: {}
			};
			if (!parsed) return empty;
			const tags = {};
			for (const [id, def] of Object.entries(parsed.tags ?? {})) if (def && typeof def.name === "string" && isTagColor$1(def.color)) tags[id] = {
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
		function loadPersisted$1() {
			if (typeof localStorage === "undefined") return {
				tags: {},
				map: {}
			};
			try {
				const raw = localStorage.getItem(STORAGE_KEY$2);
				if (!raw) return {
					tags: {},
					map: {}
				};
				return validateDocument$1(JSON.parse(raw));
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
		function scheduleSync$1(data) {
			try {
				localStorage.setItem(STORAGE_KEY$2, JSON.stringify({
					tags: data.tags,
					map: data.map
				}));
			} catch {}
			retryTagSyncAfterFault$1();
			if (!serverSyncEnabled$1 || typeof fetch === "undefined") return;
			if (syncTimer$1) clearTimeout(syncTimer$1);
			syncTimer$1 = setTimeout(() => {
				syncTimer$1 = null;
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
			}, SYNC_DEBOUNCE_MS$1);
		}
		async function initTagSync() {
			if (serverSyncEnabled$1) return;
			if (typeof fetch === "undefined") return;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] initTagSync got ${res.status} (not offline) — pushes deferred, will retry on next mutation`);
					_retrySyncOnNextMutation$1 = true;
					return;
				}
				const doc = validateDocument$1(await res.json());
				useTagMap$1.setState({
					tags: doc.tags,
					map: doc.map
				});
				serverSyncEnabled$1 = true;
			} catch {}
		}
		/** R-S9: called from the mutation path — retries the server sync exactly
		*  once after a transient boot fault, so the session's pushes resume
		*  without waiting for a reload. Server-canonical wholesale replace is
		*  NOT taken here (local edits may be newer); the debounced PUT after
		*  the next mutation reconciles the server copy. */
		async function retryTagSyncAfterFault$1() {
			if (serverSyncEnabled$1 || !_retrySyncOnNextMutation$1) return;
			_retrySyncOnNextMutation$1 = false;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) {
					console.warn(`[tagMap] retryTagSync still ${res.status} — pushes stay off this session`);
					return;
				}
				serverSyncEnabled$1 = true;
				const { tags, map } = useTagMap$1.getState();
				scheduleSync$1({
					tags,
					map
				});
			} catch {}
		}
		/** Read tagsOf without a React subscription. The useListFilter accessor uses
		*  this so the filter flow doesn't need to re-subscribe on every item. */
		function tagsOf(key) {
			return useTagMap$1.getState().map[key] ?? [];
		}
		var TagColor$1, TAG_COLOR_VALUES$1, TAG_COLOR_META, STORAGE_KEY$2, SYNC_DEBOUNCE_MS$1, serverSyncEnabled$1, syncTimer$1, _retrySyncOnNextMutation$1, initial$1, tagMapActions$1, useTagMap$1;
		var init_tagMap = __esmMin((() => {
			init_clientStore();
			init_api();
			TagColor$1 = {
				brand: "brand",
				sky: "sky",
				violet: "violet",
				rose: "rose",
				emerald: "emerald",
				amber: "amber",
				cyan: "cyan"
			};
			TAG_COLOR_VALUES$1 = Object.values(TagColor$1);
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
			STORAGE_KEY$2 = "melite:tag-map:v1";
			SYNC_DEBOUNCE_MS$1 = 500;
			serverSyncEnabled$1 = false;
			syncTimer$1 = null;
			_retrySyncOnNextMutation$1 = false;
			initial$1 = loadPersisted$1();
			tagMapActions$1 = (set, get) => ({
				createTag: (name, color) => {
					const trimmed = name.trim();
					if (!trimmed) return "";
					const id = uniqueId$1(trimmed, new Set(Object.keys(get().tags)));
					const c = color ?? nextColor$1(Object.keys(get().tags).length);
					set((s) => {
						const tags = {
							...s.tags,
							[id]: {
								id,
								name: trimmed,
								color: c
							}
						};
						scheduleSync$1({
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
						scheduleSync$1({
							tags,
							map: s.map
						});
						return { tags };
					});
				},
				recolorTag: (id, color) => {
					if (!isTagColor$1(color)) return;
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
						scheduleSync$1({
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
						scheduleSync$1({
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
						scheduleSync$1({
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
						scheduleSync$1({
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
						scheduleSync$1({
							tags: s.tags,
							map
						});
						return { map };
					});
				},
				tagsOf: (key) => get().map[key] ?? [],
				hasTag: (key, tagId) => (get().map[key] ?? []).includes(tagId)
			});
			useTagMap$1 = createClientStore((set, get) => ({
				...tagMapActions$1(set, get),
				tags: initial$1.tags,
				map: initial$1.map
			}));
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/serviceForms.js
		async function loadForms(opts) {
			if (Object.keys(formsStore$1.getState().cache).length > 0 && !opts?.force) return formsStore$1.getState().cache;
			if (_inflight$1) return _inflight$1;
			_inflight$1 = (async () => {
				try {
					const res = await apiFetch("/v1/forms");
					if (!res.ok) {
						console.warn("[serviceForms] /v1/forms failed:", res.status);
						return formsStore$1.getState().cache;
					}
					const forms = (await res.json())?.forms;
					if (typeof forms !== "object" || forms === null || Array.isArray(forms)) {
						console.warn("[serviceForms] /v1/forms 200 with malformed body — keeping cache");
						return formsStore$1.getState().cache;
					}
					formsStore$1.setState({ cache: forms });
					return formsStore$1.getState().cache;
				} catch (e) {
					console.warn("[serviceForms] fetch error:", e);
					return formsStore$1.getState().cache;
				} finally {
					_inflight$1 = null;
				}
			})();
			return _inflight$1;
		}
		function getCachedForms() {
			return formsStore$1.getState().cache;
		}
		function subscribeForms(fn) {
			return formsStore$1.subscribe(() => {
				fn();
			});
		}
		/**
		* Reverse-lookup: given a sidebar_key (the value the rest of the app calls
		* `selectedService`), return the form-tag it belongs to. This is THE
		* primitive that drives every render decision in GenerateFormBody.
		*/
		function formForSidebarKey(sidebarKey, forms = formsStore$1.getState().cache) {
			for (const [formTag, entry] of Object.entries(forms)) if (entry.sidebar_key === sidebarKey) return formTag;
		}
		/**
		* Check whether the given sidebar_key belongs to the given form-tag.
		* Internal — the convenience predicates below are the public API.
		*/
		function isForm(sidebarKey, formTag, forms = formsStore$1.getState().cache) {
			return forms[formTag]?.sidebar_key === sidebarKey;
		}
		/** True if the sidebar_key belongs to ANY of the given form-tags. */
		function isInAnyForm(sidebarKey, formTags, forms = formsStore$1.getState().cache) {
			return formTags.some((t) => isForm(sidebarKey, t, forms));
		}
		/**
		* True if the sidebar_key belongs to any audio-genre form-tag.
		* (form_tts, form_voice, form_voice_studio, form_music, form_sound)
		*/
		function isAudioForm(sidebarKey, forms = formsStore$1.getState().cache) {
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
		var formsStore$1, _inflight$1, isTtsForm, isVoiceForm, isVoiceStudioForm, isMusicForm, isGenerateForm, isEditForm;
		var init_serviceForms = __esmMin((() => {
			init_api();
			init_clientStore();
			formsStore$1 = createClientStore({ cache: {} });
			_inflight$1 = null;
			isTtsForm = (k) => isForm(k, "form_tts");
			isVoiceForm = (k) => isForm(k, "form_voice");
			isVoiceStudioForm = (k) => isForm(k, "form_voice_studio");
			isMusicForm = (k) => isForm(k, "form_music");
			isGenerateForm = (k) => isForm(k, "form_generate");
			isEditForm = (k) => isForm(k, "form_edit");
		}));
		//#endregion
		//#region ../../web-kit/catalog/lib/waveform-peaks.js
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
		/** The audio-cue draw path (E3.14 READ side, seated 2026-10-26): the
		*  bars a cue surface paints at a given pixel width — the module's
		*  documented consumer, riding the store's own cue shape.
		*
		*  The LOD cache is the truth whenever it exists: the legacy
		*  200-bucket max-amplitude array is NEVER read behind a cache — it
		*  carries no min (the waveform's asymmetry is lost) and no zoom
		*  detail to select. A cache-less legacy cue (persisted before
		*  E3.14) lifts its array into symmetric min/max bars at the asked
		*  width — honest about its resolution. A cue with neither has no
		*  truth to draw; the caller paints the placeholder. */
		function cuePeaksForWidth(cue, width) {
			if (cue.waveformPeaksLOD) return getPeaksForWidth(cue.waveformPeaksLOD, width);
			const legacy = cue.waveformPeaks;
			if (legacy && legacy.length > 0) return resampleForWidth(legacy.map((p) => ({
				min: -p,
				max: p
			})), width);
			return [];
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
		//#region ../../web-kit/catalog/lib/enhance.js
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
		//#region ../../web-kit/catalog/lib/cardLlm.js
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
		//#region ../../web-kit/catalog/lib/familyProvenance.js
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
				const folded = statusOrPendingOf$1(run.status ?? "");
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
		//#region ../../web-kit/catalog/lib/index.js
		var lib_exports = /* @__PURE__ */ __exportAll({
			CARD_LLM_KEY: () => CARD_LLM_KEY,
			CatalogContractError: () => CatalogContractError,
			LOD_BUCKETS: () => LOD_BUCKETS,
			LOD_ORDER: () => LOD_ORDER,
			RUN_STATUSES: () => RUN_STATUSES,
			RunStatusContractError: () => RunStatusContractError,
			TAG_COLOR_META: () => TAG_COLOR_META,
			TAG_COLOR_VALUES: () => TAG_COLOR_VALUES$1,
			TagColor: () => TagColor$1,
			activeVariantForRoute: () => activeVariantForRoute,
			agentEnhance: () => agentEnhance,
			apiFetch: () => apiFetch,
			apiJson: () => apiJson,
			assertNoParamDrops: () => assertNoParamDrops$1,
			assertParamsMatchFamilySchema: () => assertParamsMatchFamilySchema$1,
			axisCellExists: () => axisCellExists,
			canvasDefaultModel: () => canvasDefaultModel,
			cardLlmArg: () => cardLlmArg,
			coerceParamsToSchema: () => coerceParamsToSchema$1,
			collectNamedArtifacts: () => collectNamedArtifacts$1,
			collectStageUrls: () => collectStageUrls$1,
			composeCard: () => composeCard$1,
			composeVariantRoute: () => composeVariantRoute,
			computeMinMaxPeaks: () => computeMinMaxPeaks,
			computeWaveformLODs: () => computeWaveformLODs,
			contractToast: () => contractToast,
			controlnetTypesOf: () => controlnetTypesOf,
			cuePeaksForWidth: () => cuePeaksForWidth,
			decodeAudioPeaks: () => decodeAudioPeaks,
			describeErrorBody: () => describeErrorBody$1,
			dropdownModels: () => dropdownModels,
			enhancePrompt: () => enhancePrompt,
			ensureCatalog: () => ensureCatalog,
			ensureDraftId: () => ensureDraftId$1,
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
			getFamilySchema: () => getFamilySchema$1,
			getPeaksForWidth: () => getPeaksForWidth,
			hasViolationsSignature: () => hasViolationsSignature,
			hiddenFromDropdown: () => hiddenFromDropdown,
			initTagSync: () => initTagSync,
			isAudioForm: () => isAudioForm,
			isCatalogLoaded: () => isCatalogLoaded,
			isEditForm: () => isEditForm,
			isEmbedded: () => isEmbedded,
			isFamilySchemaCachePopulated: () => isFamilySchemaCachePopulated$1,
			isGenerateForm: () => isGenerateForm,
			isMusicForm: () => isMusicForm,
			isTagColor: () => isTagColor$1,
			isTtsForm: () => isTtsForm,
			isVoiceForm: () => isVoiceForm,
			isVoiceStudioForm: () => isVoiceStudioForm,
			loadCatalog: () => loadCatalog,
			loadFamilySchemas: () => loadFamilySchemas$1,
			loadForms: () => loadForms,
			modelDescription: () => modelDescription,
			modelLabel: () => modelLabel,
			narrowGenre: () => narrowGenre,
			onBackendState: () => onBackendState,
			onCatalogReady: () => onCatalogReady,
			parsePickerAria: () => parsePickerAria,
			pollFlowRun: () => pollFlowRun$1,
			presetsForRoute: () => presetsForRoute,
			primeCatalog: () => primeCatalog,
			readPickerModel: () => readPickerModel,
			resampleForWidth: () => resampleForWidth,
			resolvePickerRoute: () => resolvePickerRoute,
			retryTagSyncAfterFault: () => retryTagSyncAfterFault$1,
			routeCoordinates: () => routeCoordinates,
			runCompiledGeneration: () => runCompiledGeneration$1,
			sanitizeRevivedResult: () => sanitizeRevivedResult$1,
			selectLOD: () => selectLOD,
			setCardLlm: () => setCardLlm,
			setContractToastSink: () => setContractToastSink,
			setRequiredEmptyResolver: () => setRequiredEmptyResolver$1,
			studioOf: () => studioOf,
			subscribeForms: () => subscribeForms,
			tagsOf: () => tagsOf,
			useCatalogContractStore: () => useCatalogContractStore,
			useRunStatusContractStore: () => useRunStatusContractStore,
			useTagMap: () => useTagMap$1,
			validateCatalogContract: () => validateCatalogContract,
			validateModifierEntries: () => validateModifierEntries$1,
			validateParamsAgainstSchema: () => validateParamsAgainstSchema$1,
			validateRunStatusContract: () => validateRunStatusContract,
			variantLabel: () => variantLabel,
			variantSiblings: () => variantSiblings,
			variantsForRoute: () => variantsForRoute
		});
		var init_lib = __esmMin((() => {
			init_api();
			init_contractToast();
			init_catalogContract();
			init_catalogContractStore();
			init_modelCatalog();
			init_FlowProtocol$1();
			init_familyParamContract$1();
			init_tagMap();
			init_runStatusContractStore();
			init_runStatusContract();
			init_serviceForms();
			init_waveform_peaks();
			init_cardBirth$1();
			init_enhance();
			init_cardLlm();
			init_familyProvenance();
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
			if (_inflight) return _inflight;
			_inflight = (async () => {
				try {
					const data = await apiJson$1("/v1/flows/families/param-schemas");
					if (!isValidSchemaIndex(data)) throw new Error(`families/param-schemas returned a malformed body (audit R-S7) — not cached, deferring to the backend gate`);
					_cache = data;
					return data;
				} finally {
					_inflight = null;
				}
			})();
			return _inflight;
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
				const { getCachedCatalog } = await Promise.resolve().then(() => (init_lib(), lib_exports));
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
		var _cache, _inflight, WIRE_RELAXED_KEYS, EDITOR_MOD_ENTRY_KEYS;
		var init_familyParamContract = __esmMin((() => {
			init_api$1();
			_cache = null;
			_inflight = null;
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
		*  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
		*  so what the card shows is what the run consumed. Throws LOUDLY
		*  on any refusal — a refused compose never proceeds to a start
		*  (no silent cardless runs).
		*  @param body the raw start body (rides the compose POST verbatim)
		*  @param signal the caller's abort signal
		*  @returns the composed draft id, branded at this birth */
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
			return draftIdOf(draftId);
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*
		*  @param body the raw start body (its declared draft_id wins)
		*  @param signal the caller's abort signal
		*  @returns the declared-or-composed draft id, branded at this door */
		async function ensureDraftId(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return draftIdOf(declared);
			return composeCard(body, signal);
		}
		var init_cardBirth = __esmMin((() => {
			init_benchStage();
		}));
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
		*  — lets a downstream slot wire a SPECIFIC output (mask → input_mask)
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
				const resp = await apiFetch$1(`/v1/flows/status/${runId}`, { signal });
				if (!resp.ok) {
					if (resp.status === 404) throw new Error(`Flow run ${runId} is gone — the server restarted mid-run. Re-run this card.`);
					let errorBody = null;
					try {
						errorBody = await resp.json();
					} catch {
						errorBody = null;
					}
					if (hasViolationsSignature$1(errorBody)) {
						const violations = errorBody.violations;
						useRunStatusContractStore$1.getState().reportViolation(runId, violations);
						throw new RunStatusContractError$1(runId, violations);
					}
					await sleep$1(intervalMs, signal);
					continue;
				}
				const data = await resp.json();
				const { valid, violations } = validateRunStatusContract$1(data);
				if (!valid) {
					useRunStatusContractStore$1.getState().reportViolation(runId, violations);
					throw new RunStatusContractError$1(runId, violations);
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
				await sleep$1(intervalMs, signal);
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
				const { normalizeLoraEntry } = await Promise.resolve().then(() => (init_lib$1(), lib_exports$1));
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
			init_api$1();
			init_runStatusContract$1();
			init_runStatusContractStore$1();
			init_sleep$1();
			NON_JSON_BODY_CAP = 2e3;
			_requiredEmptyResolver = null;
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/tagMap.ts
		init_clientStore$1();
		init_api$1();
		const TAG_COLOR_VALUES = Object.values({
			brand: "brand",
			sky: "sky",
			violet: "violet",
			rose: "rose",
			emerald: "emerald",
			amber: "amber",
			cyan: "cyan"
		});
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
		const STORAGE_KEY$1 = "melite:tag-map:v1";
		const SYNC_DEBOUNCE_MS = 500;
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
				const raw = localStorage.getItem(STORAGE_KEY$1);
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
		let serverSyncEnabled = false;
		let syncTimer = null;
		/**
		* Write-through to localStorage (synchronous cache) + schedule a debounced
		* server PUT. Called from every mutation action. The localStorage write is
		* unconditional (offline fallback stays fresh); the server PUT is gated by
		* `serverSyncEnabled`. Failures are swallowed (the local state is still
		* valid; the next successful mutation retries).
		*/
		function scheduleSync(data) {
			try {
				localStorage.setItem(STORAGE_KEY$1, JSON.stringify({
					tags: data.tags,
					map: data.map
				}));
			} catch {}
			retryTagSyncAfterFault();
			if (!serverSyncEnabled || typeof fetch === "undefined") return;
			if (syncTimer) clearTimeout(syncTimer);
			syncTimer = setTimeout(() => {
				syncTimer = null;
				apiFetch$1("/v1/tags", {
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
		let _retrySyncOnNextMutation = false;
		/** R-S9: called from the mutation path — retries the server sync exactly
		*  once after a transient boot fault, so the session's pushes resume
		*  without waiting for a reload. Server-canonical wholesale replace is
		*  NOT taken here (local edits may be newer); the debounced PUT after
		*  the next mutation reconciles the server copy. */
		async function retryTagSyncAfterFault() {
			if (serverSyncEnabled || !_retrySyncOnNextMutation) return;
			_retrySyncOnNextMutation = false;
			try {
				const res = await apiFetch$1("/v1/tags");
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
		const initial = loadPersisted();
		const tagMapActions = (set, get) => ({
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
		const useTagMap = createClientStore$1((set, get) => ({
			...tagMapActions(set, get),
			tags: initial.tags,
			map: initial.map
		}));
		//#endregion
		//#region ../../web-kit/catalog/src/serviceForms.ts
		init_api$1();
		init_clientStore$1();
		createClientStore$1({ cache: {} });
		//#endregion
		//#region ../../web-kit/catalog/src/enhance.ts
		init_api$1();
		//#endregion
		//#region ../../web-kit/catalog/src/index.ts
		init_api$1();
		init_contractToast$1();
		init_catalogContract$1();
		init_catalogContractStore$1();
		init_modelCatalog$1();
		init_FlowProtocol();
		init_familyParamContract();
		init_runStatusContractStore$1();
		init_runStatusContract$1();
		init_cardBirth();
		//#endregion
		//#region ../../web-kit/contracts/src/modifierSubcards.ts
		init_lib$2();
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
		/** The fold's whole input domain — every run-level word `statusOf` and
		* the terminal/live judgements branch on, in ONE list. Boundary readers
		* (readRunStatus) throw on words outside it: garbage must fail loud at
		* the read, never fold to 'pending' or pass through raw (the
		* schema-strictness audit's fix 3, 2026-10-01). Kept in lockstep with
		* statusOf's case list by the walls spec (a word in one and not the
		* other fails the test). */
		const RUN_STATUS_WORDS = /* @__PURE__ */ new Set([
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
		Object.values({
			agent: "agent",
			user: "user",
			imported: "imported"
		});
		//#endregion
		//#region ../../web-kit/formats/src/npz.ts
		const CDFH_SIG = 33639248;
		function readU16(d, o) {
			return d[o] | d[o + 1] << 8;
		}
		function readU32(d, o) {
			return (d[o] | d[o + 1] << 8 | d[o + 2] << 16 | d[o + 3] << 24) >>> 0;
		}
		async function inflateRaw(compressed) {
			const ds = new DecompressionStream("deflate-raw");
			const stream = new Blob([compressed]).stream().pipeThrough(ds);
			const buf = await new Response(stream).arrayBuffer();
			return new Uint8Array(buf);
		}
		/** Parse a single .npy file from its raw (decompressed) bytes. */
		function parseNpy(bytes) {
			if (bytes.length < 10 || bytes[0] !== 147 || bytes[1] !== 78 || bytes[2] !== 85 || bytes[3] !== 77 || bytes[4] !== 80 || bytes[5] !== 89) throw new Error("Invalid .npy magic bytes");
			const ver = bytes[6];
			let headerLen;
			let headerOff;
			if (ver <= 1) {
				headerLen = readU16(bytes, 8);
				headerOff = 10;
			} else {
				headerLen = readU32(bytes, 8);
				headerOff = 12;
			}
			const headerBytes = bytes.subarray(headerOff, headerOff + headerLen);
			const header = new TextDecoder().decode(headerBytes);
			const dataBytes = bytes.subarray(headerOff + headerLen);
			const shapeMatch = header.match(/'shape':\s*\(([^)]*)\)/);
			const dtypeMatch = header.match(/'descr':\s*'([^']+)'/);
			if (!shapeMatch || !dtypeMatch) throw new Error(`Unparseable .npy header: ${header.slice(0, 120)}`);
			const shape = shapeMatch[1].split(",").map((s) => s.trim()).filter((s) => s.length > 0).map(Number);
			const dtype = dtypeMatch[1].trim();
			const copy = new Uint8Array(dataBytes.length);
			copy.set(dataBytes);
			if (dtype === "<f4" || dtype === "|f4" || dtype === "=f4") return {
				shape,
				data: new Float32Array(copy.buffer, 0, Math.floor(copy.length / 4))
			};
			if (dtype === "<f8" || dtype === "|f8" || dtype === "=f8") {
				const f64 = new Float64Array(copy.buffer, 0, Math.floor(copy.length / 8));
				return {
					shape,
					data: new Float32Array(f64)
				};
			}
			if (dtype === "<i4" || dtype === "|i4" || dtype === "=i4") {
				const i32 = new Int32Array(copy.buffer, 0, Math.floor(copy.length / 4));
				return {
					shape,
					data: new Uint32Array(i32)
				};
			}
			if (dtype === "<i8" || dtype === "|i8" || dtype === "=i8") return {
				shape,
				data: new BigInt64Array(copy.buffer, 0, Math.floor(copy.length / 8))
			};
			throw new Error(`Unsupported .npy dtype "${dtype}" (float32/64 + int32/64 supported)`);
		}
		/** Find the End-of-Central-Directory record, searching backward from EOF. */
		function findEocd(bytes) {
			const min = Math.max(0, bytes.length - 22 - 65535);
			for (let i = bytes.length - 22; i >= min; i--) if (bytes[i] === 80 && bytes[i + 1] === 75 && bytes[i + 2] === 5 && bytes[i + 3] === 6) return i;
			return -1;
		}
		/**
		* Parse an NPZ file and return a map of array-name → {shape, data}.
		* Entry names have their `.npy` extension stripped (so `posed_joints.npy`
		* is keyed as `"posed_joints"`).
		*/
		async function parseNpz(bytes) {
			const out = /* @__PURE__ */ new Map();
			const eocd = findEocd(bytes);
			if (eocd < 0) throw new Error("NPZ parse failed: End-of-Central-Directory not found");
			const cdEntries = readU16(bytes, eocd + 10);
			let off = readU32(bytes, eocd + 16);
			for (let i = 0; i < cdEntries; i++) {
				if (readU32(bytes, off) !== CDFH_SIG) break;
				const method = readU16(bytes, off + 10);
				const compSize = readU32(bytes, off + 20);
				const nameLen = readU16(bytes, off + 28);
				const extraLen = readU16(bytes, off + 30);
				const commentLen = readU16(bytes, off + 32);
				const localOff = readU32(bytes, off + 42);
				const name = new TextDecoder().decode(bytes.subarray(off + 46, off + 46 + nameLen));
				const lfhNameLen = readU16(bytes, localOff + 26);
				const lfhExtraLen = readU16(bytes, localOff + 28);
				const dataOff = localOff + 30 + lfhNameLen + lfhExtraLen;
				const compressed = bytes.subarray(dataOff, dataOff + compSize);
				let raw;
				if (method === 0) raw = compressed;
				else if (method === 8) raw = await inflateRaw(compressed);
				else throw new Error(`NPZ entry "${name}": unsupported compression method ${method}`);
				if (name.endsWith(".npy")) {
					const key = name.slice(0, -4);
					try {
						out.set(key, parseNpy(raw));
					} catch {}
				}
				off += 46 + nameLen + extraLen + commentLen;
			}
			return out;
		}
		//#endregion
		//#region ../../web-kit/formats/src/somaSkin.ts
		/**
		* somaSkin — neutral SOMA-77 mesh skinning, a direct port of the kimodo demo's
		* vendor/kimodo/kimodo/viz/soma_skin.py SOMASkin.skin()+lbs().
		*
		* The demo (and only the demo) renders Kimodo motions on a NEUTRAL body via
		* LBS weights stored in skin_standard.npz (bind_vertices + faces +
		* bind_rig_transform + lbs_indices + lbs_weights). That is the "base SOMAX
		* mesh" that actually deforms — distinct from the poser backend's `soma`
		* engine (a static mesh with no LBS weights) and from `anny`/`mhr` (parametric
		* bodies with their own proportions). This module reproduces the demo's math
		* client-side so the asset preview shows a Kimodo motion on the same neutral
		* mesh the demo uses, with no parametric body shape imposed.
		*
		* Flow per frame:
		*   fk[j]      = [[global_rot[j], global_pos[j]], [0,0,0,1]]   (4×4, per joint)
		*   affine[j]  = (fk[j] · inv(bind_rig[j]))[:3, :]             (3×4, per joint)
		*   v'         = Σ_w lbs_weights[v,w] · (affine[lbs_indices[v,w]] · [bind_v, 1])
		*
		* Units: meters throughout (Kimodo's native unit). No cm↔m conversion — that
		* was a poser-route artifact that doesn't apply here.
		*/
		init_lib();
		const SKIN_URL = "/v1/models/kimodo/provisions/skin_standard.npz";
		const J$2 = 77;
		const W = 8;
		let _skinPromise = null;
		/** Invert a 4×4 matrix (column-major-agnostic: stored row-major as 16 floats). */
		function invert4(m) {
			const a = Array.from(m);
			const inv = [
				1,
				0,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				1
			];
			for (let col = 0; col < 4; col++) {
				let piv = col, max = Math.abs(a[col * 4 + col]);
				for (let r = col + 1; r < 4; r++) {
					const v = Math.abs(a[r * 4 + col]);
					if (v > max) {
						max = v;
						piv = r;
					}
				}
				if (max < 1e-12) continue;
				if (piv !== col) for (let c = 0; c < 4; c++) {
					[a[col * 4 + c], a[piv * 4 + c]] = [a[piv * 4 + c], a[col * 4 + c]];
					[inv[col * 4 + c], inv[piv * 4 + c]] = [inv[piv * 4 + c], inv[col * 4 + c]];
				}
				const diag = a[col * 4 + col];
				for (let c = 0; c < 4; c++) {
					a[col * 4 + c] /= diag;
					inv[col * 4 + c] /= diag;
				}
				for (let r = 0; r < 4; r++) {
					if (r === col) continue;
					const factor = a[r * 4 + col];
					if (factor === 0) continue;
					for (let c = 0; c < 4; c++) {
						a[r * 4 + c] -= factor * a[col * 4 + c];
						inv[r * 4 + c] -= factor * inv[col * 4 + c];
					}
				}
			}
			return Float32Array.from(inv);
		}
		function asFloat32(arr) {
			return arr instanceof Float32Array ? arr : new Float32Array(arr);
		}
		/** Extract the rest pose from row-major FORWARD bind transforms (J×16):
		* translation column (tx, ty, tz) = indices 3, 7, 11 of each 4×4, and the
		* 3×3 rotation block = 0,1,2 / 4,5,6 / 8,9,10. This is the TS equivalent
		* of Kimodo's neutral_joints — the motion card's pre-inference pose (see
		* SomaSkin.restJoints doc). Shared by both loaders: the npz carries the
		* forward binds directly; the GLB adapter inverts glTF boneInverses into
		* the same row-major forward shape first. */
		function restPoseFromBind(bindRig, jointCount) {
			const restJoints = new Float32Array(jointCount * 3);
			const restRots = new Float32Array(jointCount * 9);
			for (let j = 0; j < jointCount; j++) {
				const b = j * 16;
				restJoints[j * 3] = bindRig[b + 3];
				restJoints[j * 3 + 1] = bindRig[b + 7];
				restJoints[j * 3 + 2] = bindRig[b + 11];
				restRots[j * 9] = bindRig[b + 0];
				restRots[j * 9 + 1] = bindRig[b + 1];
				restRots[j * 9 + 2] = bindRig[b + 2];
				restRots[j * 9 + 3] = bindRig[b + 4];
				restRots[j * 9 + 4] = bindRig[b + 5];
				restRots[j * 9 + 5] = bindRig[b + 6];
				restRots[j * 9 + 6] = bindRig[b + 8];
				restRots[j * 9 + 7] = bindRig[b + 9];
				restRots[j * 9 + 8] = bindRig[b + 10];
			}
			return {
				restJoints,
				restRots
			};
		}
		/** Load + cache the neutral SOMA skin (one fetch per session). */
		async function loadSomaSkin() {
			if (_skinPromise) return _skinPromise;
			_skinPromise = (async () => {
				const res = await apiFetch(SKIN_URL);
				if (!res.ok) throw new Error(`Failed to fetch SOMA skin: ${res.status}`);
				const arrays = await parseNpz(new Uint8Array(await res.arrayBuffer()));
				const bv = arrays.get("bind_vertices");
				const fc = arrays.get("faces");
				const brt = arrays.get("bind_rig_transform");
				const li = arrays.get("lbs_indices");
				const lw = arrays.get("lbs_weights");
				if (!bv || !fc || !brt || !li || !lw) throw new Error(`SOMA skin missing keys (have: ${[...arrays.keys()].join(",")})`);
				const bindVertices = asFloat32(bv.data);
				const bindRig = asFloat32(brt.data);
				const bindRigInv = /* @__PURE__ */ new Float32Array(1232);
				for (let j = 0; j < J$2; j++) {
					const m = bindRig.subarray(j * 16, j * 16 + 16);
					bindRigInv.set(invert4(m), j * 16);
				}
				const { restJoints, restRots } = restPoseFromBind(bindRig, J$2);
				const faceSrc = fc.data instanceof BigInt64Array ? Array.from(fc.data, (x) => Number(x)) : Array.from(fc.data);
				const faces = Uint32Array.from(faceSrc);
				return {
					bindVertices,
					faces,
					lbsIndices: li.data instanceof Uint32Array ? li.data : li.data instanceof BigInt64Array ? Uint32Array.from(li.data, (x) => Number(x)) : Uint32Array.from(li.data),
					lbsWeights: asFloat32(lw.data),
					bindRigInv,
					restJoints,
					restRots,
					vertexCount: bindVertices.length / 3,
					faceCount: faces.length / 3,
					jointCount: J$2,
					influences: W
				};
			})();
			try {
				return await _skinPromise;
			} catch (e) {
				_skinPromise = null;
				throw e;
			}
		}
		/**
		* Build per-joint (3,4) affine matrices for one frame:
		*   affine[j] = (fk[j] · bindRigInv[j])[:3, :]
		* fk[j] is the global posed transform (global_rot → rotation, global_pos →
		* translation). Output is `affines` length J*12 (row-major 3×4 per joint).
		*/
		function buildAffines(globalRot, globalPos, bindRigInv, out, jointCount) {
			for (let j = 0; j < jointCount; j++) {
				const r = j * 9;
				const p = j * 3;
				const bi = j * 16;
				const a0 = bindRigInv[bi + 0], a1 = bindRigInv[bi + 1], a2 = bindRigInv[bi + 2], a3 = bindRigInv[bi + 3];
				const a4 = bindRigInv[bi + 4], a5 = bindRigInv[bi + 5], a6 = bindRigInv[bi + 6], a7 = bindRigInv[bi + 7];
				const a8 = bindRigInv[bi + 8], a9 = bindRigInv[bi + 9], a10 = bindRigInv[bi + 10], a11 = bindRigInv[bi + 11];
				const fr0 = globalRot[r], fr1 = globalRot[r + 1], fr2 = globalRot[r + 2];
				const fr3 = globalRot[r + 3], fr4 = globalRot[r + 4], fr5 = globalRot[r + 5];
				const fr6 = globalRot[r + 6], fr7 = globalRot[r + 7], fr8 = globalRot[r + 8];
				const o0 = fr0 * a0 + fr1 * a4 + fr2 * a8;
				const o1 = fr0 * a1 + fr1 * a5 + fr2 * a9;
				const o2 = fr0 * a2 + fr1 * a6 + fr2 * a10;
				const o3 = fr0 * a3 + fr1 * a7 + fr2 * a11 + globalPos[p];
				const o4 = fr3 * a0 + fr4 * a4 + fr5 * a8;
				const o5 = fr3 * a1 + fr4 * a5 + fr5 * a9;
				const o6 = fr3 * a2 + fr4 * a6 + fr5 * a10;
				const o7 = fr3 * a3 + fr4 * a7 + fr5 * a11 + globalPos[p + 1];
				const o8 = fr6 * a0 + fr7 * a4 + fr8 * a8;
				const o9 = fr6 * a1 + fr7 * a5 + fr8 * a9;
				const o10 = fr6 * a2 + fr7 * a6 + fr8 * a10;
				const o11 = fr6 * a3 + fr7 * a7 + fr8 * a11 + globalPos[p + 2];
				const o = j * 12;
				out[o] = o0;
				out[o + 1] = o1;
				out[o + 2] = o2;
				out[o + 3] = o3;
				out[o + 4] = o4;
				out[o + 5] = o5;
				out[o + 6] = o6;
				out[o + 7] = o7;
				out[o + 8] = o8;
				out[o + 9] = o9;
				out[o + 10] = o10;
				out[o + 11] = o11;
			}
		}
		/**
		* Skinning: compute deformed vertex positions for one frame.
		*   out (V, 3) = Σ_w lbsWeights[v,w] · (affines[lbsIndices[v,w]] · [bindV, 1])
		*
		* Mirrors soma_skin.py lbs() exactly. `out` is Float32Array length V*3.
		*
		* SKIN-DRIVEN DIMENSIONS (2026-08-15): the joint count and the per-vertex
		* influence count come from the SKIN (jointCount / influences), not module
		* constants — the neutral npz skin is J=77/W=8, a glTF character skin is
		* J=77/W=4 (glTF skins are VEC4). Same LBS math, both substrates; see
		* lib/glbSkin.ts.
		*/
		function deformFrame(globalRot, globalPos, skin, out) {
			const J_ = skin.jointCount;
			const W_ = skin.influences;
			const affines = new Float32Array(J_ * 12);
			buildAffines(globalRot, globalPos, skin.bindRigInv, affines, J_);
			const { bindVertices, lbsIndices, lbsWeights } = skin;
			const V = skin.vertexCount;
			for (let v = 0; v < V; v++) {
				const vi = v * 3;
				const bx = bindVertices[vi], by = bindVertices[vi + 1], bz = bindVertices[vi + 2];
				let ox = 0, oy = 0, oz = 0;
				const wi = v * W_;
				for (let widx = 0; widx < W_; widx++) {
					const weight = lbsWeights[wi + widx];
					if (weight === 0) continue;
					const ai = lbsIndices[wi + widx] * 12;
					ox += weight * (affines[ai] * bx + affines[ai + 1] * by + affines[ai + 2] * bz + affines[ai + 3]);
					oy += weight * (affines[ai + 4] * bx + affines[ai + 5] * by + affines[ai + 6] * bz + affines[ai + 7]);
					oz += weight * (affines[ai + 8] * bx + affines[ai + 9] * by + affines[ai + 10] * bz + affines[ai + 11]);
				}
				out[vi] = ox;
				out[vi + 1] = oy;
				out[vi + 2] = oz;
			}
		}
		//#endregion
		//#region ../../web-kit/formats/src/poseCodec.ts
		const SOMA77_BONE_CONNECTIONS$1 = [
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
		//#endregion
		//#region ../../web-kit/formats/src/motionNpz.ts
		/**
		* motionNpz — the Motion Card's client-side motion engine.
		*
		* Everything the Motion Card needs beyond the raw NPZ bytes, in one place:
		*
		*   • loadMotionNpz        — fetch + parse a kimodo motion NPZ (meters)
		*   • precomputeDeformedVerts — LBS every frame onto the neutral SOMAX skin
		*                             (extracted from MotionViewer — single source)
		*   • vertsToB64 / cm helpers — the PoseViewer3D boundary (cm + base64)
		*   • AZIMUTH_PRESETS      — the 8 export angles (Blender convention,
		*                            0 = front / 90 = right, matching the vnccs
		*                            flow's front_mesh…front_left_mesh names)
		*   • soma77ToCoco18       — TS port of the poser nodes' SOMA→COCO-18
		*                            mapping + ear extrapolation (library/
		*                            soma_to_coco.py — the DWPose / vnccs contract)
		*   • writeNpz             — a browser-side NPZ WRITER (lib/npz.ts is
		*                            reader-only): NPY v1 '<f4' + ZIP method 8 with
		*                            real CRC32 (numpy validates). Feeds the
		*                            prev_motion_artifact chain slot with an
		*                            edited pose.
		*   • patchFrame           — rotation reconstruction: given edited joint
		*                            positions for one frame, rebuild global_rot_mats
		*                            by arc-aligning each joint's child direction
		*                            along the SOMA-77 hierarchy.
		*
		* Units: METERS everywhere (kimodo's native unit), except functions that
		* cross the PoseViewer3D boundary, which is centimeters (its mesh, skeleton
		* and gizmos all apply CM_TO_M internally). Callers convert explicitly.
		*/
		const J$1 = 77;
		/** Fetch + parse a kimodo motion NPZ, validating the SOMA-77 contract. */
		async function loadMotionNpz(url) {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Failed to fetch motion asset: ${res.status}`);
			const arrays = await parseNpz(new Uint8Array(await res.arrayBuffer()));
			const joints = arrays.get("posed_joints");
			const rotmats = arrays.get("global_rot_mats");
			if (!joints || joints.shape.length < 2) throw new Error(`NPZ missing 'posed_joints' (got: ${[...arrays.keys()].join(", ") || "empty"})`);
			if (!rotmats || rotmats.shape.length < 3) throw new Error(`NPZ missing 'global_rot_mats' (got: ${[...arrays.keys()].join(", ")})`);
			const T = joints.shape[0];
			if (joints.shape[1] !== 77 || joints.shape[2] !== 3) throw new Error(`Unexpected posed_joints shape ${joints.shape.join("×")} (expected T×77×3)`);
			const fpsArr = arrays.get("fps");
			const fps = fpsArr && fpsArr.data.length > 0 ? fpsArr.data[0] : 30;
			return {
				posedJoints: joints.data,
				globalRotMats: rotmats.data,
				fps,
				T
			};
		}
		/**
		* Run client-side LBS for every frame: allVerts (T, V, 3) meters.
		* global_rot_mats is (T, 77, 9) per-joint row-major; posed_joints is
		* (T, 77, 3) — both METERS (kimodo's native unit, no conversion).
		*/
		function precomputeDeformedVerts(npz, skin) {
			const V = skin.vertexCount;
			const allVerts = new Float32Array(npz.T * V * 3);
			for (let t = 0; t < npz.T; t++) deformFrame(npz.globalRotMats.subarray(t * J$1 * 9, (t + 1) * J$1 * 9), npz.posedJoints.subarray(t * J$1 * 3, (t + 1) * J$1 * 3), skin, allVerts.subarray(t * V * 3, (t + 1) * V * 3));
			return allVerts;
		}
		/**
		* Chunked async variant of precomputeDeformedVerts. Computes the SAME result
		* but yields to the event loop every `chunkFrames` frames (default 3 frames
		* ≈ 10-20ms per chunk for the 18k-vertex SOMA mesh). This keeps the main
		* thread responsive — the browser can paint, service input, and run rAF
		* between chunks instead of freezing for 1-3 seconds.
		*
		* Set `outputCm` to true to produce centimeters (PoseViewer3D's unit) — this
		* folds the ×100 scale INTO the chunk loop so there's no separate scaling pass.
		*/
		async function precomputeDeformedVertsChunked(npz, skin, outputCm = false, chunkFrames = 10) {
			const stride = skin.vertexCount * 3;
			const allVerts = new Float32Array(npz.T * stride);
			for (let t = 0; t < npz.T; t += chunkFrames) {
				const end = Math.min(t + chunkFrames, npz.T);
				for (let frame = t; frame < end; frame++) {
					const off = frame * stride;
					deformFrame(npz.globalRotMats.subarray(frame * J$1 * 9, (frame + 1) * J$1 * 9), npz.posedJoints.subarray(frame * J$1 * 3, (frame + 1) * J$1 * 3), skin, allVerts.subarray(off, off + stride));
					if (outputCm) for (let i = off; i < off + stride; i++) allVerts[i] *= 100;
				}
				if (end < npz.T) await new Promise((r) => setTimeout(r, 0));
			}
			return allVerts;
		}
		/** Scale a meters Float32Array by `factor` (×100 → cm) into a new array. */
		function scaledArray(src, factor) {
			const out = new Float32Array(src.length);
			for (let i = 0; i < src.length; i++) out[i] = src[i] * factor;
			return out;
		}
		/** Base64 of the raw float32 bytes (optionally scaled to cm first). */
		function vertsToB64(verts, toCm = false) {
			const src = toCm ? scaledArray(verts, 100) : verts;
			return encodeBufferToB64(new Uint8Array(src.buffer, src.byteOffset, src.byteLength));
		}
		function jointsToCm(jointsM) {
			return scaledArray(jointsM, 100);
		}
		function jointsFromCm(jointsCm) {
			return scaledArray(jointsCm, .01);
		}
		const AZIMUTH_PRESETS$1 = [
			{
				angle: 0,
				cameraView: "az-0",
				label: "Front"
			},
			{
				angle: 45,
				cameraView: "az-45",
				label: "F-R"
			},
			{
				angle: 90,
				cameraView: "az-90",
				label: "Right"
			},
			{
				angle: 135,
				cameraView: "az-135",
				label: "B-R"
			},
			{
				angle: 180,
				cameraView: "az-180",
				label: "Back"
			},
			{
				angle: 225,
				cameraView: "az-225",
				label: "B-L"
			},
			{
				angle: 270,
				cameraView: "az-270",
				label: "Left"
			},
			{
				angle: 315,
				cameraView: "az-315",
				label: "F-L"
			}
		];
		const AZ_DIST$1 = 3.4;
		const AZ_HEIGHT$1 = 1.2;
		/** Camera position for an azimuth view — target is (0, 0.9, 0). */
		function azimuthCameraPos$1(view) {
			const rad = (AZIMUTH_PRESETS$1.find((p) => p.cameraView === view) ?? AZIMUTH_PRESETS$1[0]).angle * Math.PI / 180;
			return [
				Math.sin(rad) * AZ_DIST$1,
				AZ_HEIGHT$1,
				Math.cos(rad) * AZ_DIST$1
			];
		}
		/** Step ±1 preset around the 8-angle ring (wrap-around). Used by the motion
		*  card's rotate arrows. All presets sit on the same ring (AZ_DIST/AZ_HEIGHT),
		*  so stepping is a hard camera snap — no zoom/height preservation needed. */
		function stepAzimuth(view, dir) {
			const i = AZIMUTH_PRESETS$1.findIndex((p) => p.cameraView === view);
			const next = ((i === -1 ? 0 : i) + dir + AZIMUTH_PRESETS$1.length) % AZIMUTH_PRESETS$1.length;
			return AZIMUTH_PRESETS$1[next].cameraView;
		}
		const COCO_TO_SOMA_IDX = [
			6,
			4,
			40,
			41,
			42,
			12,
			13,
			14,
			72,
			73,
			74,
			67,
			68,
			69,
			10,
			9
		];
		const EAR_LATERAL_RATIO = .65;
		const EAR_VERTICAL_DROP_RATIO = .2;
		/**
		* Project SOMA-77 3D joints to COCO-18 3D joints (view-independent, meters).
		* Input: (77, 3) meters; output: (18, 3) meters — [x,y,z] per COCO joint.
		*/
		function soma77ToCoco18(jointsM) {
			const out = /* @__PURE__ */ new Float32Array(54);
			for (let i = 0; i < 16; i++) {
				const s = COCO_TO_SOMA_IDX[i] * 3;
				out[i * 3] = jointsM[s];
				out[i * 3 + 1] = jointsM[s + 1];
				out[i * 3 + 2] = jointsM[s + 2];
			}
			const le = 27;
			const re = 30;
			const iox = jointsM[re] - jointsM[le];
			const ioy = jointsM[31] - jointsM[28];
			const ioz = jointsM[32] - jointsM[29];
			const interocular = Math.max(Math.hypot(iox, ioy, ioz), 1e-6);
			const ux = iox / interocular;
			const uy = ioy / interocular;
			const uz = ioz / interocular;
			const hx = jointsM[18] - jointsM[12];
			const hy = jointsM[19] - jointsM[13];
			const hz = jointsM[20] - jointsM[14];
			const hLen = Math.max(Math.hypot(hx, hy, hz), 1e-6);
			const upx = hx / hLen;
			const upy = hy / hLen;
			const upz = hz / hLen;
			const lat = EAR_LATERAL_RATIO * interocular;
			const drop = EAR_VERTICAL_DROP_RATIO * interocular;
			out[48] = jointsM[re] + ux * lat - upx * drop;
			out[49] = jointsM[31] + uy * lat - upy * drop;
			out[50] = jointsM[32] + uz * lat - upz * drop;
			out[51] = jointsM[le] - ux * lat - upx * drop;
			out[52] = jointsM[28] - uy * lat - upy * drop;
			out[53] = jointsM[29] - uz * lat - upz * drop;
			return out;
		}
		/** CRC-32 (IEEE 802.3, polynomial 0xEDB88320) — numpy validates NPZ CRCs. */
		const CRC_TABLE$5 = (() => {
			const table = /* @__PURE__ */ new Uint32Array(256);
			for (let n = 0; n < 256; n++) {
				let c = n;
				for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
				table[n] = c >>> 0;
			}
			return table;
		})();
		function crc32(bytes) {
			let c = 4294967295;
			for (let i = 0; i < bytes.length; i++) c = CRC_TABLE$5[(c ^ bytes[i]) & 255] ^ c >>> 8;
			return (c ^ 4294967295) >>> 0;
		}
		function npyHeader(shape) {
			let dict = `{'descr': '<f4', 'fortran_order': False, 'shape': ${`(${shape.join(", ")}${shape.length === 1 ? "," : ""})`}, }`;
			let header = new TextEncoder().encode(dict);
			const align = (64 - (10 + header.length) % 64) % 64;
			const padded = new Uint8Array(header.length + align + 1);
			padded.set(header);
			padded[padded.length - 1] = 10;
			dict = new TextDecoder().decode(padded);
			header = new TextEncoder().encode(dict);
			const out = new Uint8Array(10 + header.length);
			out.set([
				147,
				78,
				85,
				77,
				80,
				89,
				1,
				0
			]);
			out[8] = header.length & 255;
			out[9] = header.length >> 8 & 255;
			out.set(header, 10);
			return out;
		}
		/** Build one NPY v1 float32 array blob. */
		function npyFloat32(data, shape) {
			const header = npyHeader(shape);
			const out = new Uint8Array(header.length + data.byteLength);
			out.set(header);
			out.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), header.length);
			return out;
		}
		const ZIP_LOCAL = 67324752;
		const ZIP_CENTRAL = 33639248;
		const ZIP_EOCD = 101010256;
		function writeU16(out, off, v) {
			out[off] = v & 255;
			out[off + 1] = v >> 8 & 255;
		}
		function writeU32(out, off, v) {
			out[off] = v & 255;
			out[off + 1] = v >> 8 & 255;
			out[off + 2] = v >> 16 & 255;
			out[off + 3] = v >>> 24 & 255;
		}
		async function deflateRaw(bytes) {
			const cs = new CompressionStream("deflate-raw");
			const stream = new Blob([bytes]).stream().pipeThrough(cs);
			return new Uint8Array(await new Response(stream).arrayBuffer());
		}
		/**
		* Serialize a map of named float32 arrays to an NPZ (ZIP of NPY v1 entries).
		* Matches np.savez_compressed's container: ZIP method 8 (deflate-raw),
		* entries named "<key>.npy", real CRC32s. `compress: false` → stored (method
		* 0), like np.savez.
		*/
		async function writeNpz(arrays, compress = true) {
			const entries = [];
			for (const [key, entry] of Object.entries(arrays)) {
				const shape = entry.shape ?? [entry.data.length];
				const raw = npyFloat32(entry.data, shape);
				const name = new TextEncoder().encode(`${key}.npy`);
				const crc = crc32(raw);
				let method = 0;
				let payload = raw;
				if (compress) {
					const deflated = await deflateRaw(raw);
					if (deflated.length < raw.length) {
						method = 8;
						payload = deflated;
					}
				}
				entries.push({
					name,
					data: payload,
					crc,
					method,
					localOff: 0
				});
			}
			let offset = 0;
			for (const e of entries) {
				e.localOff = offset;
				offset += 30 + e.name.length + e.data.length;
			}
			const cdSize = entries.reduce((acc, e) => acc + 46 + e.name.length, 0);
			const total = offset + cdSize + 22;
			const out = new Uint8Array(total);
			let p = 0;
			for (const e of entries) {
				writeU32(out, p, ZIP_LOCAL);
				writeU16(out, p + 4, 20);
				writeU16(out, p + 6, 0);
				writeU16(out, p + 8, e.method);
				writeU16(out, p + 10, 0);
				writeU16(out, p + 12, 0);
				writeU32(out, p + 14, e.crc);
				writeU32(out, p + 18, e.data.length);
				writeU32(out, p + 22, e.data.length);
				writeU16(out, p + 26, e.name.length);
				writeU16(out, p + 28, 0);
				out.set(e.name, p + 30);
				out.set(e.data, p + 30 + e.name.length);
				p += 30 + e.name.length + e.data.length;
			}
			const cdStart = p;
			for (const e of entries) {
				writeU32(out, p, ZIP_CENTRAL);
				writeU16(out, p + 4, 20);
				writeU16(out, p + 6, 20);
				writeU16(out, p + 8, 0);
				writeU16(out, p + 10, e.method);
				writeU16(out, p + 12, 0);
				writeU16(out, p + 14, 0);
				writeU32(out, p + 16, e.crc);
				writeU32(out, p + 20, e.data.length);
				writeU32(out, p + 24, e.data.length);
				writeU16(out, p + 28, e.name.length);
				writeU16(out, p + 30, 0);
				writeU16(out, p + 32, 0);
				writeU16(out, p + 34, 0);
				writeU16(out, p + 36, 0);
				writeU32(out, p + 38, 0);
				writeU32(out, p + 42, e.localOff);
				out.set(e.name, p + 46);
				p += 46 + e.name.length;
			}
			const cdEnd = p;
			writeU32(out, p, ZIP_EOCD);
			writeU16(out, p + 4, 0);
			writeU16(out, p + 6, 0);
			writeU16(out, p + 8, entries.length);
			writeU16(out, p + 10, entries.length);
			writeU32(out, p + 12, cdEnd - cdStart);
			writeU32(out, p + 16, cdStart);
			writeU16(out, p + 20, 0);
			return out;
		}
		/** Data URL for the prev_motion_artifact slot (SlotSquare's file-drop shape). */
		function npzToDataUrl(bytes) {
			return `data:application/octet-stream;base64,${encodeBufferToB64(bytes)}`;
		}
		const SOMA77_CHILDREN$2 = (() => {
			const parent = new Array(J$1).fill(-1);
			for (const [p, c] of SOMA77_BONE_CONNECTIONS$1) parent[c] = p;
			const children = Array.from({ length: J$1 }, () => []);
			for (let i = 0; i < J$1; i++) {
				const p = parent[i];
				if (p >= 0) children[p].push(i);
			}
			return children;
		})();
		/**
		* Rebuild one frame's global_rot_mats from edited joint positions.
		*
		* Each joint's new rotation is the original rotation composed with the
		* minimal rotation that aligns its longest child-offset direction from the
		* original pose to the edited pose — the standard arc-align reconstruction.
		* Leaf joints (finger/toe tips, no children) keep their original rotation
		* (documented limitation: EndEffector hand/feet anchors are approximate for
		* translate-gizmo edits).
		*
		* Returns patched COPIES of both arrays (full length, meters). The caller
		* truncates to `frameIdx + 1` when the edited pose should become the chain
		* end.
		*/
		function patchFrame(posedJoints, globalRotMats, editedJointsM, frameIdx) {
			const T = posedJoints.length / 231;
			const f = Math.max(0, Math.min(frameIdx, T - 1));
			const jb = f * J$1 * 3;
			const rb = f * J$1 * 9;
			const joints = new Float32Array(posedJoints);
			const rots = new Float32Array(globalRotMats);
			const origPos = /* @__PURE__ */ new Float32Array(231);
			for (let j = 0; j < J$1; j++) {
				origPos[j * 3] = posedJoints[jb + j * 3];
				origPos[j * 3 + 1] = posedJoints[jb + j * 3 + 1];
				origPos[j * 3 + 2] = posedJoints[jb + j * 3 + 2];
			}
			joints.set(editedJointsM, jb);
			const q = new _melite_three_client_client.Quaternion();
			const d0 = new _melite_three_client_client.Vector3();
			const d1 = new _melite_three_client_client.Vector3();
			const axis = new _melite_three_client_client.Vector3();
			for (let j = 0; j < J$1; j++) {
				let bestChild = -1;
				let bestLen = 1e-4;
				for (const c of SOMA77_CHILDREN$2[j]) {
					const cx = origPos[c * 3] - origPos[j * 3];
					const cy = origPos[c * 3 + 1] - origPos[j * 3 + 1];
					const cz = origPos[c * 3 + 2] - origPos[j * 3 + 2];
					const len = Math.hypot(cx, cy, cz);
					if (len > bestLen) {
						bestLen = len;
						bestChild = c;
					}
				}
				if (bestChild < 0) continue;
				d0.set((origPos[bestChild * 3] - origPos[j * 3]) / bestLen, (origPos[bestChild * 3 + 1] - origPos[j * 3 + 1]) / bestLen, (origPos[bestChild * 3 + 2] - origPos[j * 3 + 2]) / bestLen);
				const dx = editedJointsM[bestChild * 3] - editedJointsM[j * 3];
				const dy = editedJointsM[bestChild * 3 + 1] - editedJointsM[j * 3 + 1];
				const dz = editedJointsM[bestChild * 3 + 2] - editedJointsM[j * 3 + 2];
				const len = Math.hypot(dx, dy, dz);
				if (len < 1e-6) continue;
				d1.set(dx / len, dy / len, dz / len);
				const dot = _melite_three_client_client.MathUtils.clamp(d0.dot(d1), -1, 1);
				const angle = Math.acos(dot);
				if (angle < 1e-4) continue;
				axis.crossVectors(d0, d1);
				if (axis.lengthSq() < 1e-10) {
					axis.set(1, 0, 0).cross(d0);
					if (axis.lengthSq() < 1e-6) axis.set(0, 1, 0).cross(d0);
				}
				axis.normalize();
				q.setFromAxisAngle(axis, angle);
				const qRot = new _melite_three_client_client.Quaternion().setFromRotationMatrix(new _melite_three_client_client.Matrix4().set(globalRotMats[rb + j * 9], globalRotMats[rb + j * 9 + 1], globalRotMats[rb + j * 9 + 2], 0, globalRotMats[rb + j * 9 + 3], globalRotMats[rb + j * 9 + 4], globalRotMats[rb + j * 9 + 5], 0, globalRotMats[rb + j * 9 + 6], globalRotMats[rb + j * 9 + 7], globalRotMats[rb + j * 9 + 8], 0, 0, 0, 0, 1));
				q.multiply(qRot);
				const e = new _melite_three_client_client.Matrix4().makeRotationFromQuaternion(q).elements;
				rots[rb + j * 9] = e[0];
				rots[rb + j * 9 + 1] = e[4];
				rots[rb + j * 9 + 2] = e[8];
				rots[rb + j * 9 + 3] = e[1];
				rots[rb + j * 9 + 4] = e[5];
				rots[rb + j * 9 + 5] = e[9];
				rots[rb + j * 9 + 6] = e[2];
				rots[rb + j * 9 + 7] = e[6];
				rots[rb + j * 9 + 8] = e[10];
			}
			return {
				posedJoints: joints,
				globalRotMats: rots
			};
		}
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
		/* v8 ignore next -- the shipped client bundles never carry BASE_URL
		* (the clientBundle preset defines import.meta.env as {MODE} only),
		* so the fallback IS the production path; under vitest the module
		* env always carries BASE_URL "/", making the right arm unreachable
		* here (modelCatalog.ts precedent, 2026-09-12). */
		const base$2 = {}.env?.BASE_URL ?? "/";
		function dracoLoader() {
			if (!_draco) {
				_draco = new _melite_three_client_client.DRACOLoader();
				_draco.setDecoderPath(`${base$2}draco/gltf/`);
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
		//#endregion
		//#region ../../web-kit/formats/src/glbSkin.ts
		/** SOMA-77 — the rig every SOMAX GLB carries (skin.name "SOMA-Mixamo"). */
		const SOMA_JOINTS = 77;
		/** glTF skins are VEC4 — four influences per vertex. */
		const GLTF_INFLUENCES = 4;
		var NotSomaxGlbError = class extends Error {
			constructor(reason) {
				super(`Not a SOMAX-rigged GLB (77-joint SOMA skeleton required): ${reason}`);
				this.name = "NotSomaxGlbError";
			}
		};
		/** Column-major 16 (three.js Matrix4.elements) → row-major Float32Array. */
		function colMajorToRowMajor(elements) {
			const out = /* @__PURE__ */ new Float32Array(16);
			for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out[r * 4 + c] = elements[c * 4 + r];
			return out;
		}
		/**
		* Load a SOMAX-rigged character GLB as a SomaSkin.
		*
		* @param url a data: URL (studio upload) or a same-origin asset URL
		*            (/editor/assets/... — asset tray or a wired upstream card).
		* @throws NotSomaxGlbError when the GLB has no 77-joint skinned mesh.
		* @throws Error on fetch/parse failures.
		*/
		async function loadGlbSkin(url) {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Failed to fetch character GLB: ${res.status}`);
			const buffer = await res.arrayBuffer();
			const loader = makeGLTFLoader();
			const gltf = await new Promise((resolve, reject) => loader.parse(buffer, "", resolve, reject));
			const meshes = [];
			gltf.scene.traverse((obj) => {
				const m = obj;
				if (!m.isSkinnedMesh || !m.geometry) return;
				if (m.skeleton?.bones?.length === SOMA_JOINTS) meshes.push(m);
			});
			if (meshes.length === 0) throw new NotSomaxGlbError("no skinned mesh with 77 joints found (static meshes and other rigs cannot play SOMA-77 motion)");
			const skeleton = meshes[0].skeleton;
			const J = skeleton.bones.length;
			const bindRigInv = new Float32Array(J * 16);
			for (let j = 0; j < J; j++) bindRigInv.set(colMajorToRowMajor(skeleton.boneInverses[j].elements), j * 16);
			const bindRigFwd = new Float32Array(J * 16);
			for (let j = 0; j < J; j++) bindRigFwd.set(invert4(bindRigInv.subarray(j * 16, j * 16 + 16)), j * 16);
			const { restJoints, restRots } = restPoseFromBind(bindRigFwd, J);
			let vertexCount = 0;
			let faceCount = 0;
			for (const m of meshes) {
				vertexCount += m.geometry.attributes.position.count;
				if (!m.geometry.index) throw new NotSomaxGlbError(`mesh "${m.name}" is not triangulated (no index buffer)`);
				faceCount += m.geometry.index.count / 3;
			}
			const bindVertices = new Float32Array(vertexCount * 3);
			const faces = new Uint32Array(faceCount * 3);
			const lbsIndices = new Uint32Array(vertexCount * GLTF_INFLUENCES);
			const lbsWeights = new Float32Array(vertexCount * GLTF_INFLUENCES);
			let vOff = 0;
			let iOff = 0;
			for (const m of meshes) {
				const pos = m.geometry.attributes.position;
				bindVertices.set(pos.array, vOff * 3);
				const si = m.geometry.attributes.skinIndex;
				const sw = m.geometry.attributes.skinWeight;
				if (!si || !sw) throw new NotSomaxGlbError(`mesh "${m.name}" has no skinIndex/skinWeight attributes (not skinned)`);
				if (si.itemSize !== GLTF_INFLUENCES || sw.itemSize !== GLTF_INFLUENCES) throw new NotSomaxGlbError(`mesh "${m.name}" skin attributes are ${si.itemSize}-wide (glTF requires VEC4)`);
				lbsIndices.set(si.array, vOff * GLTF_INFLUENCES);
				lbsWeights.set(sw.array, vOff * GLTF_INFLUENCES);
				const idx = m.geometry.index;
				const base = vOff;
				for (let i = 0; i < idx.count; i++) faces[iOff + i] = idx.array[i] + base;
				iOff += idx.count;
				vOff += pos.count;
			}
			return {
				bindVertices,
				faces,
				lbsIndices,
				lbsWeights,
				bindRigInv,
				restJoints,
				restRots,
				vertexCount,
				faceCount,
				jointCount: J,
				influences: GLTF_INFLUENCES
			};
		}
		//#endregion
		//#region ../../web-kit/formats/src/bodyPresets.ts
		const NEUTRAL_RACE$1 = [
			.5,
			.5,
			.5
		];
		[...NEUTRAL_RACE$1];
		[...NEUTRAL_RACE$1];
		[...NEUTRAL_RACE$1];
		//#endregion
		//#region ../../web-kit/formats/src/motionConstraints.ts
		const TRACK_TO_EE_JOINT = {
			"left-hand": "LeftHand",
			"right-hand": "RightHand",
			"left-foot": "LeftFoot",
			"right-foot": "RightFoot"
		};
		const MOTION_CONSTRAINTS_PARAM = "motion_constraints";
		const MOTION_PROMPTS_PARAM = "motion_prompts";
		/** Encode a Float32Array to base64 (little-endian bytes). Round-trips with
		*  numpy: np.frombuffer(base64.b64decode(s), dtype='<f4'). */
		function encodeF32(arr) {
			return encodeBufferToB64(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength));
		}
		/** Decode a base64 string into a Float32Array (little-endian). The inverse of
		*  encodeF32 — used to reconstruct an authored pose from a stamped keyframe's
		*  payload when re-entering edit mode at its frame. */
		function decodeF32(b64) {
			const bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
			const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
			return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
		}
		function frameSlice(src, frame) {
			const T = Math.max(1, src.T);
			const f = Math.max(0, Math.min(T - 1, Math.floor(frame)));
			return {
				jp: src.posedJoints.subarray(f * 77 * 3, (f + 1) * 77 * 3),
				jr: src.globalRotMats.subarray(f * 77 * 9, (f + 1) * 77 * 9)
			};
		}
		/** AUTHOR a fullbody constraint from a user-edited pose (the WRITE path).
		*
		*  This is the counterpart to snapshotConstraint: snapshotConstraint READS a
		*  pose from the motion NPZ; stampEditedPose WRITES a user-authored pose
		*  into a constraint payload. ``editedJointsM`` is the full 77-joint pose in
		*  meters (the output of the edit-mode gizmos — what the user dragged into
		*  being). ``patchedGlobalRotMats`` is the rotation field reconstructed by
		*  ``patchFrame`` (motionNpz.ts) so children follow the edit — pass either
		*  the full T·77·9 array (frameIdx selects the slice) or a single-frame
		*  77·9 slice (frameIdx 0 is used).
		*
		*  The returned payload is what a fullbody keyframe carries: when it reaches
		*  melite-kimodo-nodes, ``_build_user_constraints`` decodes jp/jr into a
		*  ``FullBodyConstraintSet`` that holds the AUTHORED pose at that frame,
		*  bending generation to match. This is the bar being WRITABLE — you drag a
		*  joint, the keyframe at that frame absorbs the new pose, Run feeds it as a
		*  constraint. Parity with the demo's edit-then-snap authoring flow
		*  (ui.py: ``update_pose_at_frame`` → constraint keyframes update). */
		function stampEditedPose(editedJointsM, patchedGlobalRotMats, frameIdx, totalFrames) {
			const f = Math.max(0, Math.min(Math.max(0, totalFrames - 1), Math.floor(frameIdx)));
			const jrSlice = patchedGlobalRotMats.length >= 1386 ? patchedGlobalRotMats.subarray(f * 77 * 9, (f + 1) * 77 * 9) : patchedGlobalRotMats;
			return {
				kind: "fullbody",
				frame: f,
				jp: encodeF32(editedJointsM),
				jr: encodeF32(jrSlice)
			};
		}
		/** Snapshot a REAL pose constraint at `frame` for the given timeline lane.
		*
		*  Reads the motion's posed joints + global rotation matrices (the same
		*  arrays the viewer renders). THE FRAME CONTRACT (2026-08-14 fix):
		*  the returned payload's `frame` is the REQUESTED frame — the dot must
		*  land where the mouse was, and serialize/hydrate cross-link payload ↔
		*  keyframe by frame equality — while the POSE BYTES are sourced from the
		*  nearest available source frame (frameSlice clamps internally).
		*
		*  Why that split: pre-run the only source is the T=1 rest pose, but the
		*  bar already spans the authoring envelope (targetT frames). Clamping
		*  the stamped frame to src.T-1 forced EVERY dot to frame 0 ("always
		*  places the dots to the very left") even though the rest pose is the
		*  same at every frame — the bind pose pinned at the clicked frame is
		*  exactly the right constraint. Post-run src.T covers the clicked frame
		*  and the slice is exact.
		*
		*  The caller (the timeline bar) clamps clicks to its own envelope; a
		*  negative frame still floors to 0. The pose is ALWAYS sourced from a
		*  real frame — never a null shell (the prior ``value: null`` keyframes
		*  were the shell the user rejected).
		*  Returns null only for unrecognized track ids. */
		function snapshotConstraint(trackId, frame, src) {
			const f = Math.max(0, Math.floor(frame));
			if (trackId === "fullbody") {
				const { jp, jr } = frameSlice(src, f);
				return {
					kind: "fullbody",
					frame: f,
					jp: encodeF32(jp),
					jr: encodeF32(jr)
				};
			}
			if (trackId === "root2d") {
				const { jp } = frameSlice(src, f);
				return {
					kind: "root2d",
					frame: f,
					x: jp[0],
					z: jp[2]
				};
			}
			const joint = TRACK_TO_EE_JOINT[trackId];
			if (joint) {
				const { jp, jr } = frameSlice(src, f);
				return {
					kind: "ee",
					frame: f,
					joint,
					jp: encodeF32(jp),
					jr: encodeF32(jr)
				};
			}
			return null;
		}
		function sortByFrame(xs) {
			return xs.slice().sort((a, b) => a.frame - b.frame);
		}
		/** Gather the viser keyframe metadata + payloads into the transport JSON.
		*
		*  Keyframes whose uuid has no payload (orphan viser dots from the old
		*  null-shell era) are dropped from the backend arrays but kept in
		*  `keyframes` only if they carry a payload — so stale dots don't leak
		*  broken constraints to the node. Sorted ascending by frame per track. */
		function serializeConstraints(keyframes, payloads) {
			const live = keyframes.filter((k) => payloads[k.uuid]);
			const out = { keyframes: live.map(({ uuid, track_id, frame }) => ({
				uuid,
				track_id,
				frame
			})) };
			const all = live.map((k) => payloads[k.uuid]);
			const fb = sortByFrame(all.filter((p) => p.kind === "fullbody").map(({ frame, jp, jr }) => ({
				frame,
				jp,
				jr
			})));
			if (fb.length) out.fullbody = fb;
			const ee = sortByFrame(all.filter((p) => p.kind === "ee").map(({ frame, joint, jp, jr }) => ({
				frame,
				joint,
				jp,
				jr
			})));
			if (ee.length) out.end_effectors = ee;
			const r2 = sortByFrame(all.filter((p) => p.kind === "root2d").map(({ frame, x, z }) => ({
				frame,
				x,
				z
			})));
			if (r2.length) out.root2d = r2;
			return out;
		}
		/** Reconstruct viser keyframes + payloads from a persisted/transported JSON.
		*
		*  Tolerant of missing/malformed fields (a corrupt or partially-migrated
		*  stage.params.motion_constraints degrades to null → the card starts fresh
		*  with empty constraints, never crashes on hydrate). Returns null if the
		*  shape is unrecognized. */
		function hydrateConstraints(raw) {
			if (!raw || typeof raw !== "object") return null;
			const json = raw;
			if (!Array.isArray(json.keyframes)) return null;
			const payloads = {};
			const dots = [];
			const byFrame = (xs) => xs ?? [];
			for (const e of byFrame(json.fullbody)) {
				const uuid = json.keyframes.find((k) => k.track_id === "fullbody" && k.frame === e.frame)?.uuid;
				if (!uuid) continue;
				payloads[uuid] = {
					kind: "fullbody",
					frame: e.frame,
					jp: e.jp,
					jr: e.jr
				};
			}
			for (const e of byFrame(json.end_effectors)) {
				const uuid = json.keyframes.find((k) => k.track_id && TRACK_TO_EE_JOINT[k.track_id] === e.joint && k.frame === e.frame)?.uuid;
				if (!uuid) continue;
				payloads[uuid] = {
					kind: "ee",
					frame: e.frame,
					joint: e.joint,
					jp: e.jp,
					jr: e.jr
				};
			}
			for (const e of byFrame(json.root2d)) {
				const uuid = json.keyframes.find((k) => k.track_id === "root2d" && k.frame === e.frame)?.uuid;
				if (!uuid) continue;
				payloads[uuid] = {
					kind: "root2d",
					frame: e.frame,
					x: e.x,
					z: e.z
				};
			}
			for (const k of json.keyframes) {
				if (!payloads[k.uuid]) continue;
				dots.push({
					uuid: k.uuid,
					track_id: k.track_id,
					frame: k.frame,
					value: null,
					opacity: 1,
					locked: false
				});
			}
			return {
				keyframes: dots,
				payloads
			};
		}
		/** Carve a NEW empty prompt card out of the timeline's prompt lane so the
		*  user can type a distinct motion description for that segment — the
		*  demo's PRIMARY authoring surface (multi-prompt composition, one clip
		*  stitched from a sequence of text "cards").
		*
		*  WHY THIS EXISTS: viser's built-in click-to-append path (Timeline.tsx)
		*  only fires when the click lands at or past the last prompt's end_frame.
		*  After MotionCardEditor seeds one prompt spanning ``[0, T-1]`` (the whole
		*  bar, edge-to-edge — the demo behavior), there is NO frame ≥ last.end_frame
		*  reachable inside the bar, so appending is impossible and the user "can
		*  only put in dots" (keyframe dots, on the constraint lanes). This helper
		*  is the explicit, always-reachable "add a card" affordance.
		*
		*  Strategy — split the LAST prompt (highest end_frame) at its midpoint into
		*  two contiguous segments; the RIGHT half becomes a new EMPTY card
		*  (``text: ""``) the user types into, the LEFT half keeps the original
		*  text. The lane stays edge-to-edge (no gaps) and the new card is
		*  immediately editable. When there are no prompts, seeds one empty card
		*  spanning ``[0, T-1]``. When the last prompt is too narrow to split
		*  (≤1 frame wide), appends a 1-frame card after it.
		*
		*  Pure: returns a NEW array, never mutates the input. ``newId`` is
		*  injectable for deterministic tests; defaults to a crypto-random UUID
		*  (same shape viser's makeTimelineId produces). */
		function carveNewPromptCard(prompts, totalFrames, newId = defaultNewId) {
			const T = Math.max(1, Math.floor(totalFrames));
			if (prompts.length === 0) return [{
				uuid: newId(),
				text: "",
				start_frame: 0,
				end_frame: T - 1,
				color: null
			}];
			const sorted = [...prompts].sort((a, b) => a.start_frame - b.start_frame);
			const last = sorted[sorted.length - 1];
			const mid = Math.floor((last.start_frame + last.end_frame) / 2);
			if (mid <= last.start_frame || mid >= last.end_frame) {
				const newStart = last.end_frame + 1;
				const appended = {
					uuid: newId(),
					text: "",
					start_frame: newStart,
					end_frame: newStart,
					color: null
				};
				return [...prompts, appended];
			}
			const left = {
				...last,
				end_frame: mid
			};
			const right = {
				uuid: newId(),
				text: "",
				start_frame: mid,
				end_frame: last.end_frame,
				color: null
			};
			return prompts.flatMap((p) => p.uuid === last.uuid ? [left, right] : [p]);
		}
		function defaultNewId() {
			const c = typeof crypto !== "undefined" ? crypto : void 0;
			if (c && "randomUUID" in c) return c.randomUUID();
			return "tl-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
		}
		/** Serialize the timeline's PROMPT segments into the multi-prompt transport
		*  JSON that melite-kimodo-nodes consumes. This is the demo's PRIMARY authoring
		*  surface — each prompt segment is a motion "card" (a text description over
		*  a frame range), and the model composes a multi-segment motion that follows
		*  the sequence (kimodo_model.py _generate iterates the list with transition
		*  blending between segments).
		*
		*  Mirrors demo/ui.py:1646-1659: segments are sorted ascending by start_frame;
		*  per-segment duration in seconds follows the demo's convention (non-last
		*  segments use ``[start, end)`` = ``end - start`` frames; the LAST segment
		*  uses ``[start, end]`` inclusive = ``end - start + 1`` frames). Returns the
		*  empty string when fewer than 2 non-empty segments survive — the single
		*  ``prompt`` param handles the 0/1-segment case, and the node's override
		*  threshold is >=2 segments (so an empty payload here is the honest "no
		*  multi-prompt authoring yet" signal, not silent data loss). */
		function serializeMotionPrompts(segments, fps) {
			const valid = segments.filter((s) => s && typeof s.text === "string" && s.text.trim() && Number.isFinite(s.start_frame) && Number.isFinite(s.end_frame)).slice().sort((a, b) => a.start_frame - b.start_frame);
			if (valid.length < 2) return "";
			const safeFps = fps > 0 ? fps : 30;
			const n = valid.length;
			const out = valid.map((s, i) => {
				const frames = s.end_frame - s.start_frame + (i === n - 1 ? 1 : 0);
				return {
					text: s.text.trim(),
					duration_sec: Math.max(1, frames) / safeFps
				};
			});
			return JSON.stringify(out);
		}
		/** Reverse of serializeMotionPrompts: rebuild timeline prompt cards from the
		*  persisted `motion_prompts` JSON (an array of `{ text, duration_sec }`).
		*  Returns null if the payload is missing/corrupt/empty — the caller seeds a
		*  blank card in that case. Frame boundaries are reconstructed by accumulating
		*  durations from frame 0 — the exact boundaries may differ slightly from the
		*  original (the serialization rounds), but the TEXT and the segment COUNT are
		*  preserved, which is what matters for state sync across reopens. */
		function hydrateMotionPrompts(raw, fps, totalFrames) {
			if (!raw || typeof raw !== "string") return null;
			const trimmed = raw.trim();
			if (!trimmed) return null;
			let parsed;
			try {
				parsed = JSON.parse(trimmed);
			} catch {
				return null;
			}
			if (!Array.isArray(parsed) || parsed.length === 0) return null;
			const safeFps = fps > 0 ? fps : 30;
			const segments = [];
			let cursor = 0;
			for (let i = 0; i < parsed.length; i++) {
				const seg = parsed[i];
				if (!seg || typeof seg.text !== "string") return null;
				const dur = typeof seg.duration_sec === "number" ? seg.duration_sec : 1;
				const frames = Math.max(1, Math.round(dur * safeFps));
				const start = cursor;
				const end = i === parsed.length - 1 ? Math.max(start + frames - 1, totalFrames - 1) : start + frames - 1;
				segments.push({
					text: seg.text,
					start_frame: start,
					end_frame: end
				});
				cursor = end + 1;
			}
			return segments;
		}
		/** NO-OVERLAP INVARIANT (2026-08-15, "the prompt cards can overlap — they
		*  get tangled; they should automatically get untangled"): heal any set of
		*  segments into a strict sequence — card N+1 starts at least one frame
		*  after card N ends. Cards keep their ORDER (sorted by start) and their
		*  DURATION (an untangled card translates, never stretches); nothing is
		*  ever truncated — the tail may land past the envelope, which is the
		*  pull-the-tail rule's business, not this one. PURE + IDEMPOTENT and
		*  returns the SAME array when nothing overlaps (so a useEffect around it
		*  cannot loop). The bar clamps gestures so crossings never happen in the
		*  first place; this heals every other writer (the envelope rescale's
		*  rounding, legacy persisted state, future code). */
		function untanglePrompts(segments) {
			if (segments.length < 2) return segments;
			const sorted = [...segments].sort((a, b) => a.start_frame - b.start_frame || a.end_frame - b.end_frame);
			let cursor = -Infinity;
			let changed = false;
			const healed = /* @__PURE__ */ new Map();
			const indexByRef = /* @__PURE__ */ new Map();
			segments.forEach((s, i) => indexByRef.set(s, i));
			for (const p of sorted) {
				const dur = Math.max(1, p.end_frame - p.start_frame);
				const s = Math.max(cursor + 1, p.start_frame);
				const e = s + dur;
				if (s !== p.start_frame || e !== p.end_frame) {
					changed = true;
					healed.set(indexByRef.get(p), {
						...p,
						start_frame: s,
						end_frame: e
					});
				}
				cursor = e;
			}
			return changed ? segments.map((p, i) => healed.get(i) ?? p) : segments;
		}
		//#endregion
		//#region ../../web-kit/formats/src/openPoseCanvas.ts
		/** openPoseCanvas — the COCO-18 stick-figure renderer (pure DOM canvas,
		* ex-lib/text-to-pose). Fetch-free by law. */
		const OPENPOSE_SKELETON = [
			[0, 1],
			[0, 14],
			[0, 15],
			[1, 2],
			[1, 5],
			[2, 3],
			[3, 4],
			[5, 6],
			[6, 7],
			[8, 9],
			[9, 10],
			[11, 12],
			[12, 13],
			[14, 16],
			[15, 17],
			[1, 8],
			[1, 11],
			[8, 11]
		];
		const OPENPOSE_COLORS = [
			"#8B00FF",
			"#FF6B00",
			"#00FF6B",
			"#FFFF00",
			"#FFFFFF"
		];
		/**
		* Render COCO-18 keypoints as an OpenPose-style stick figure on a canvas.
		* Returns a PNG Blob.
		*
		* @param keypoints Flat array of 54 numbers (18 joints × [x, y, confidence])
		* @param opts width, height, background, lineWidth, pointRadius
		*/
		function renderOpenPoseCanvas(keypoints, opts = {}) {
			const w = opts.width ?? 1024;
			const h = opts.height ?? 1024;
			const bg = opts.background ?? "transparent";
			const lw = opts.lineWidth ?? 4;
			const pr = opts.pointRadius ?? 5;
			const canvas = document.createElement("canvas");
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext("2d");
			if (bg === "transparent") ctx.clearRect(0, 0, w, h);
			else {
				ctx.fillStyle = bg;
				ctx.fillRect(0, 0, w, h);
			}
			const pts = [];
			for (let i = 0; i < 18; i++) {
				const x = keypoints[i * 3];
				const y = keypoints[i * 3 + 1];
				const c = keypoints[i * 3 + 2];
				pts.push({
					x: typeof x === "number" && isFinite(x) ? x / 1024 * w : -9999,
					y: typeof y === "number" && isFinite(y) ? y / 1024 * h : -9999,
					c: typeof c === "number" ? c : 0
				});
			}
			ctx.lineCap = "round";
			ctx.lineJoin = "round";
			OPENPOSE_SKELETON.forEach(([a, b], idx) => {
				const pa = pts[a], pb = pts[b];
				if (pa.c < .1 || pb.c < .1) return;
				if (pa.x < 0 || pb.x < 0) return;
				ctx.strokeStyle = OPENPOSE_COLORS[idx % OPENPOSE_COLORS.length];
				ctx.lineWidth = lw;
				ctx.beginPath();
				ctx.moveTo(pa.x, pa.y);
				ctx.lineTo(pb.x, pb.y);
				ctx.stroke();
			});
			pts.forEach((p) => {
				if (p.c < .1 || p.x < 0) return;
				ctx.fillStyle = "#00FFFF";
				ctx.beginPath();
				ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
				ctx.fill();
			});
			const dataUrl = canvas.toDataURL("image/png");
			const bin = atob(dataUrl.split(",")[1]);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			return new Blob([bytes], { type: "image/png" });
		}
		//#endregion
		//#region ../../web-kit/formats/src/b64.ts
		init_api();
		//#endregion
		//#region ../../web-kit/formats/src/poseTransforms.ts
		init_lib();
		const KP$1 = {
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
		KP$1.NOSE, KP$1.NECK, KP$1.R_SHOULDER, KP$1.R_ELBOW, KP$1.R_WRIST, KP$1.L_SHOULDER, KP$1.L_ELBOW, KP$1.L_WRIST, KP$1.R_HIP, KP$1.R_KNEE, KP$1.R_ANKLE, KP$1.L_HIP, KP$1.L_KNEE, KP$1.L_ANKLE, KP$1.R_EYE, KP$1.L_EYE, KP$1.R_EAR, KP$1.L_EAR;
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
		//#endregion
		//#region ../../web-kit/formats/src/prompt-tags.json
		var prompt_tags_default$1 = {
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
		/** Category display order for the dropdown (matches the JSON key order). */
		const TAG_CATEGORY_ORDER$1 = [
			"shot",
			"camera",
			"lighting",
			"style",
			"motion",
			"mood",
			"color",
			"subject"
		];
		/**
		* Flatten the JSON tag map into a single list of { value, category }.
		* Computed once at module load (the JSON is static) and frozen so
		* callers can't mutate the canonical list.
		*/
		function flatten$1(json) {
			const out = [];
			for (const cat of TAG_CATEGORY_ORDER$1) {
				const arr = json[cat];
				if (!Array.isArray(arr)) continue;
				for (const value of arr) if (typeof value === "string" && value.length > 0) out.push({
					value,
					category: cat
				});
			}
			return out;
		}
		Object.freeze(flatten$1(prompt_tags_default$1));
		//#endregion
		//#region src/ui/studio/motionDoc.ts
		/** Canonical JSON for content comparison (the h3 A1 law): keys sorted
		*  recursively, arrays order-preserved (row order is semantic),
		*  undefined-valued keys SKIPPED, top-level undefined digests null.
		*  Verbatim with h3's pendingOps.ts — one digest law, estate-wide. */
		function canonicalJson(v) {
			if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
			if (v !== null && typeof v === "object") {
				const rec = v;
				return `{${Object.keys(rec).filter((k) => rec[k] !== void 0).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(",")}}`;
			}
			return JSON.stringify(v) ?? "null";
		}
		/** The wire form of motion_constraints is the persist effect's own JSON
		*  STRING (older docs may hold the object); a corrupt string degrades to
		*  null → empty constraints, never a crash (the corrupt-sentinel law). */
		function parseWireJson(raw) {
			if (typeof raw !== "string") return raw;
			const trimmed = raw.trim();
			if (!trimmed) return null;
			try {
				return JSON.parse(trimmed);
			} catch {
				return null;
			}
		}
		/** The semantic prompt row — uuid/color are view identity, not
		*  statements; retirement compares text + frames only. */
		function semanticRow(p) {
			return {
				text: p.text,
				start_frame: p.start_frame,
				end_frame: p.end_frame
			};
		}
		/** The prompts channel's settlement form: both sides of a retirement
		*  comparison are normalized through the SAME serialize→hydrate law at
		*  the current envelope, so the projection's last-segment stretch
		*  (hydrateMotionPrompts extends the last card to targetT-1) can never
		*  wedge a STATEABLE op live forever — a settled wire retires its op
		*  however the envelope has since moved. Below the 2-segment threshold
		*  the wire carries no frames, so the raw rows compare (the seed law:
		*  one card over [0, targetT-1] retires when the doc seeds the same
		*  text); a multi-EMPTY composition is the one unstateable residue —
		*  the wire cannot carry empty cards' existence, so that op stays live
		*  by design until a stateable gesture supersedes it or the stage
		*  switch clears it (the authoring surface the seed exists for). */
		function promptsSettle(rows, ctx) {
			const safeFps = ctx.fps > 0 ? ctx.fps : 30;
			const wire = serializeMotionPrompts(rows, safeFps);
			if (wire !== "") {
				const hydrated = hydrateMotionPrompts(wire, safeFps, Math.max(1, Math.floor(ctx.targetT)));
				if (hydrated && hydrated.length > 0) return hydrated;
			}
			return rows;
		}
		/** Deterministic view identity: prompts hydrate in sequence order, so
		*  the index IS the stable uuid (Date.now() churn would break the bar's
		*  drag identity across re-projections). */
		function viewRows(segments) {
			return segments.map((s, i) => ({
				uuid: `motion-prompt-${i}`,
				text: s.text,
				start_frame: s.start_frame,
				end_frame: s.end_frame,
				color: null
			}));
		}
		/** Pure projection: the bench row hydrated (the doc, verbatim).
		*  Prompts: the persisted multi-segment payload; else the single
		*  `prompt` param seeding one card over [0, targetT-1] (the demo's
		*  authoring surface — always one editable card before any authoring). */
		function projectMotionDoc(params, fps, targetT) {
			const safeFps = fps > 0 ? fps : 30;
			const safeT = Math.max(1, Math.floor(targetT));
			const constraintJson = parseWireJson(params?.[MOTION_CONSTRAINTS_PARAM]);
			const hydrated = constraintJson ? hydrateConstraints(constraintJson) : null;
			const segments = hydrateMotionPrompts(params?.[MOTION_PROMPTS_PARAM], safeFps, safeT);
			return {
				prompts: segments && segments.length > 0 ? viewRows(segments) : viewRows([{
					text: typeof params?.prompt === "string" ? params.prompt : "",
					start_frame: 0,
					end_frame: Math.max(0, safeT - 1)
				}]),
				keyframes: hydrated?.keyframes ?? [],
				payloads: hydrated?.payloads ?? {}
			};
		}
		/** The prompts channel's DOOR payload: the wire params one onSave
		*  carries — motion_prompts ("" below the 2-segment override threshold)
		*  plus the single-prompt mirror param the node reads in that case. */
		function serializePromptsParams(rows, fps) {
			const safeFps = fps > 0 ? fps : 30;
			return {
				[MOTION_PROMPTS_PARAM]: serializeMotionPrompts(rows, safeFps),
				prompt: rows.find((p) => p.text.trim() !== "")?.text ?? ""
			};
		}
		/** The constraints channel's wire form: the transport JSON string (empty
		*  string when no live constraint exists — the persist form). */
		function serializeConstraintsParam(doc) {
			const json = serializeConstraints(doc.keyframes, doc.payloads);
			return (json.fullbody?.length ?? 0) === 0 && (json.end_effectors?.length ?? 0) === 0 && (json.root2d?.length ?? 0) === 0 ? "" : JSON.stringify(json);
		}
		/** The retirement currency of one channel against a projected doc.
		*  Constraints: the wire string, digested as parsed content (a
		*  re-ordered-key settlement — the same facts, different bytes — still
		*  retires the op). Prompts: the projection's semantic rows VERBATIM —
		*  the projection IS doc space (it already rode hydrateMotionPrompts;
		*  re-normalizing it would drift the +1 frame convention). */
		function serializeChannel(doc, channel, _ctx) {
			if (channel === "prompts") return doc.prompts.map(semanticRow);
			return serializeConstraintsParam(doc);
		}
		/** The settlement law applied to an op's stored value: raw authored rows
		*  normalize into doc space at the current envelope (the stretch law),
		*  so a stateable op retires however the envelope has since moved. */
		function opCurrency(value, channel, ctx) {
			if (channel === "prompts") return promptsSettle(value, ctx);
			return value;
		}
		/** The settlement's common currency: strings digest through their PARSED
		*  content, and the constraints object digests with its EMPTY ARRAYS
		*  stripped (serializeConstraints omits empty groups; a foreign writer
		*  may carry them — the same facts in different key shapes are one
		*  statement). null/undefined/"" all state "nothing on this channel". */
		function settleCurrency(v) {
			const parsed = typeof v === "string" ? parseWireJson(v) : v;
			if (parsed === null || parsed === void 0 || parsed === "") return {};
			if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
				const rec = parsed;
				const out = {};
				for (const k of Object.keys(rec)) {
					if (Array.isArray(rec[k]) && rec[k].length === 0) continue;
					out[k] = rec[k];
				}
				return out;
			}
			return parsed;
		}
		/** Content-equal under the door's semantics (canonical digest). */
		function settledEquals(a, b) {
			return canonicalJson(settleCurrency(a)) === canonicalJson(settleCurrency(b));
		}
		/** THE SUPERSEDE LAW (motion's refinement of the h3 log — 2026-11-05):
		*  a channel holds ONE live statement. Appending an op retires every
		*  older op on that channel: the door can only ever settle the NEWEST
		*  payload, so an older statement is dead on arrival — kept live it
		*  would re-mask the shown doc the moment the newer op retired (the
		*  zombie-resurface hazard: undo-to-doc-shape would resurrect the last
		*  gesture). Commit order still rides seq (A2); this trims the log. */
		function supersedeOps(ops, op) {
			return [...ops.filter((o) => o.channel !== op.channel), op];
		}
		/** The live ops: ops whose value the projected doc does not yet contain.
		*  Derived per render — never bookkept, so nothing can leak or go stale
		*  (an op is retired by the settlement itself). */
		function liveOps(doc, ops, ctx) {
			return ops.filter((op) => !settledEquals(serializeChannel(doc, op.channel, ctx), opCurrency(op.value, op.channel, ctx)));
		}
		/** The shown document: the projection with the live ops applied (latest
		*  op per channel wins; re-hydration re-runs so the shown doc is always
		*  well-formed view state, never raw payload). */
		function overlayMotionDoc(doc, ops, ctx) {
			const live = liveOps(doc, ops, ctx);
			const latest = (channel) => {
				let out;
				for (const op of live) if (op.channel === channel && (out === void 0 || op.seq > out.seq)) out = op;
				return out;
			};
			const promptsOp = latest("prompts");
			const constraintsOp = latest("constraints");
			if (promptsOp === void 0 && constraintsOp === void 0) return doc;
			const segments = promptsOp === void 0 ? doc.prompts : promptsOp.value;
			const constraintJson = constraintsOp === void 0 ? null : parseWireJson(constraintsOp.value);
			const hydrated = constraintJson ? hydrateConstraints(constraintJson) : null;
			return {
				prompts: viewRows(segments),
				keyframes: hydrated?.keyframes ?? (constraintsOp === void 0 ? doc.keyframes : []),
				payloads: hydrated?.payloads ?? (constraintsOp === void 0 ? doc.payloads : {})
			};
		}
		/** The no-overlap heal rides the write door (the dead effect's law,
		*  kept): every committed prompts shape is a strict sequence. */
		function healPrompts(rows) {
			return untanglePrompts(rows);
		}
		//#endregion
		//#region src/ui/studio/useMotionDoc.ts
		/**
		* useMotionDoc — the one-truth hook (the h3-timeline useShownDoc pattern
		* ported to motion's channels; nativity audit F7, 2026-11-05).
		*
		* THE LAW (DSH doc law: presenters are pure functions of durable truth;
		* the adapter owns writes; live incrementality is transient and marked):
		* the bench doc (stage.params) is the ONLY document state. This hook
		* holds NO mirror — it projects the row (projectMotionDoc), overlays the
		* transient op log (overlayMotionDoc), and commits every gesture
		* straight through onSave while appending the exact channel statement as
		* an op. An op retires when the durable doc itself contains it, so an
		* external bench write re-hydrates naturally (the projection re-reads
		* stage.params on every change — there is no once-only hydration gate).
		* No guard, no echo ref, no seed-once latch — a stale refresh cannot
		* rewrite stated content because there is no second state to rewrite.
		*
		* REPLACES the tlPrompts/tlKeyframes/tlIntervals/constraintPayloads
		* mirrors, the once-only constraints hydration + didHydratePrompts seed
		* latch, the echo-guard persist effects, and the derived `prompt`
		* write-back (the prompts door now carries motion_prompts + prompt in
		* ONE fused statement).
		*/
		function useMotionDoc(stage, onSave, fps, targetT) {
			const projected = (0, react.useMemo)(() => projectMotionDoc(stage.params, fps, targetT), [
				canonicalJson(stage.params),
				fps,
				targetT
			]);
			const [ops, setOps] = (0, react.useState)([]);
			const seqRef = (0, react.useRef)(0);
			const projectedRef = (0, react.useRef)(projected);
			projectedRef.current = projected;
			const opsRef = (0, react.useRef)(ops);
			opsRef.current = ops;
			const fpsRef = (0, react.useRef)(fps);
			fpsRef.current = fps;
			const settleCtxRef = (0, react.useRef)({
				fps,
				targetT
			});
			settleCtxRef.current = {
				fps,
				targetT
			};
			const shownOf = () => {
				const base = projectedRef.current;
				return overlayMotionDoc(base, liveOps(base, opsRef.current, settleCtxRef.current), settleCtxRef.current);
			};
			const stageIdRef = (0, react.useRef)(stage.id);
			if (stageIdRef.current !== stage.id) {
				stageIdRef.current = stage.id;
				opsRef.current = [];
				setOps([]);
			}
			const live = (0, react.useMemo)(() => liveOps(projected, ops, settleCtxRef.current), [
				projected,
				ops,
				fps,
				targetT
			]);
			const shown = (0, react.useMemo)(() => overlayMotionDoc(projected, live, settleCtxRef.current), [
				projected,
				live,
				fps,
				targetT
			]);
			const appendOp = (op) => {
				opsRef.current = supersedeOps(opsRef.current, op);
				setOps(opsRef.current);
			};
			return {
				shown,
				commitPrompts: (0, react.useMemo)(() => (update) => {
					const prevRows = shownOf().prompts;
					const next = healPrompts(update(prevRows));
					const semantic = next.map((p) => ({
						text: p.text,
						start_frame: p.start_frame,
						end_frame: p.end_frame
					}));
					const prevSemantic = prevRows.map((p) => ({
						text: p.text,
						start_frame: p.start_frame,
						end_frame: p.end_frame
					}));
					if (canonicalJson(promptsSettle(semantic, settleCtxRef.current)) === canonicalJson(prevSemantic)) return;
					onSave(serializePromptsParams(next, fpsRef.current));
					appendOp({
						channel: "prompts",
						value: semantic,
						seq: seqRef.current++
					});
				}, [onSave]),
				commitConstraints: (0, react.useMemo)(() => (update) => {
					const prevDoc = shownOf();
					const wire = serializeConstraintsParam(update(prevDoc));
					if (wire === serializeConstraintsParam(prevDoc)) return;
					onSave({ motion_constraints: wire });
					appendOp({
						channel: "constraints",
						value: wire,
						seq: seqRef.current++
					});
				}, [onSave])
			};
		}
		//#endregion
		//#region \0dsh-css:packages/motion/motion/src/ui/studio/component.module.css.mjs
		const css$3 = "@keyframes ihGs4q_motionSpin{to{transform:rotate(360deg)}}.ihGs4q_shellPad{gap:8px;padding:12px 16px}.ihGs4q_railGrid{border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 45%, transparent);grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:10px 12px;display:grid}.ihGs4q_railPanel{grid-column:1/-1;min-width:0}.ihGs4q_railGroupLabelMt{text-transform:uppercase;letter-spacing:.14em;color:color-mix(in srgb, var(--dsw-alias-label-secondary) 40%, transparent);grid-column:span 2;margin-top:4px;padding:0 4px 2px;font-size:9px;font-weight:600}.ihGs4q_contents{display:contents}.ihGs4q_bgSquareWrap{grid-column:1/-1;justify-content:center;padding:4px 0;display:flex}.ihGs4q_bodySquareWrap{grid-column:span 2;justify-content:center;padding:4px 0;display:flex}.ihGs4q_bodyNotice{border:1px solid color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 10%, transparent);color:var(--dsw-alias-danger,#dc2626);border-radius:4px;grid-column:span 2;padding:4px 6px;font-size:9px;line-height:1.6}.ihGs4q_bodyEmptyIcon{width:20px;height:20px;color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent)}.ihGs4q_wireBtn{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 90%, transparent);border-radius:4px;justify-content:center;align-items:center;width:20px;height:20px;display:flex}.ihGs4q_wireBtn:hover,.ihGs4q_wireBtnOn{color:var(--dsw-alias-accent,#3b82f6)}.ihGs4q_wireBtnOff{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent)}.ihGs4q_centerRow{flex:1;gap:8px;min-height:0;display:flex}.ihGs4q_stageFrame{min-width:0;transition:color .12s,background-color .12s,border-color .12s}.ihGs4q_stageFrameDrag{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 80%, transparent);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 40%, transparent)}.ihGs4q_ovBg{z-index:0}.ihGs4q_ovCam{z-index:30}.ihGs4q_ovDrop{pointer-events:none;z-index:20}.ihGs4q_ovRect{pointer-events:none;z-index:40}.ihGs4q_bgImg{pointer-events:none;object-fit:cover;width:100%;height:100%}.ihGs4q_dropVeil{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 10%, transparent);backdrop-filter:blur(1px);justify-content:center;align-items:center;width:100%;height:100%;display:flex}.ihGs4q_dropVeilLabel{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 80%, transparent);color:var(--dsw-alias-accent,#3b82f6);border-radius:6px;padding:6px 12px;font-size:11px;font-weight:500}.ihGs4q_stageLoading{height:100%;color:color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent);flex-direction:column;justify-content:center;align-items:center;gap:8px;display:flex}.ihGs4q_skelAvatar{border-radius:999px;width:96px;height:96px}.ihGs4q_skelAvatarSm{border-radius:999px;width:80px;height:80px}.ihGs4q_skelLine{width:112px;height:12px}.ihGs4q_stageVeil{background:color-mix(in srgb, var(--melite-stage-bg) 60%, transparent);width:100%;height:100%;color:color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent);flex-direction:column;justify-content:center;align-items:center;gap:8px;display:flex}.ihGs4q_warnIcon{width:24px;height:24px;color:color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 70%, transparent)}.ihGs4q_veilText{font-size:12px}.ihGs4q_camPill{align-items:center;gap:4px;padding:4px;display:flex}.ihGs4q_camPill>span{flex:none;display:inline-flex}.ihGs4q_camDivider{background:color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 60%, transparent);width:1px;height:16px;margin:0 2px}.ihGs4q_exportRect{pointer-events:auto;cursor:move;touch-action:none;border:2px solid var(--dsw-alias-accent,#3b82f6);position:absolute}.ihGs4q_cornerHandle{background:var(--dsw-alias-accent,#3b82f6);border:2px solid #fff;border-radius:999px;width:12px;height:12px;position:absolute}.ihGs4q_cornerNW{cursor:nwse-resize;top:-6px;left:-6px}.ihGs4q_cornerNE{cursor:nesw-resize;top:-6px;right:-6px}.ihGs4q_cornerSW{cursor:nesw-resize;bottom:-6px;left:-6px}.ihGs4q_cornerSE{cursor:nwse-resize;bottom:-6px;right:-6px}.ihGs4q_crossV{pointer-events:none;background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);width:1px;height:12px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.ihGs4q_crossH{pointer-events:none;background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);width:12px;height:1px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.ihGs4q_rectHint{border:1px solid color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 80%, transparent);color:var(--dsw-alias-accent,#3b82f6);backdrop-filter:blur(4px);border-radius:999px;padding:4px 12px;font-size:10px;box-shadow:0 8px 28px -12px #00000073}.ihGs4q_timelineShell{border-color:color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent);border-radius:8px}.ihGs4q_transportHead{border-color:color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 20%, transparent);flex-wrap:wrap;padding:6px 12px}.ihGs4q_playBtn{width:32px;height:32px;color:var(--dsw-alias-label-primary);background:#ffffff1a;border-radius:999px;flex-shrink:0;justify-content:center;align-items:center;transition:color .12s,background-color .12s,border-color .12s;display:flex}.ihGs4q_playBtn:hover{background:#fff3}.ihGs4q_playBtn:disabled{cursor:not-allowed;opacity:.4}.ihGs4q_playIcon{width:14px;height:14px;margin-left:2px}.ihGs4q_timeWrap{flex-shrink:0;font-size:11px}.ihGs4q_timeText{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent);font-family:ui-monospace,monospace}.ihGs4q_noMotion{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent);align-items:center;gap:4px;display:flex}.ihGs4q_fpsChip{color:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent);background:#ffffff1a;border-radius:4px;flex-shrink:0;padding:2px 6px;font-family:ui-monospace,monospace;font-size:10px;display:none}@media (width>=640px){.ihGs4q_fpsChip{display:block}}.ihGs4q_hintWrap{align-items:center;gap:8px;display:flex}.ihGs4q_hintTitle{text-transform:uppercase;letter-spacing:.025em;color:color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent);flex-shrink:0;font-size:10px;font-weight:600}.ihGs4q_addCardBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 15%, transparent);color:var(--dsw-alias-accent,#3b82f6);border-radius:999px;align-items:center;gap:4px;padding:2px 10px;font-size:10px;font-weight:600;transition:color .12s,background-color .12s,border-color .12s;display:flex}.ihGs4q_addCardBtn:hover{background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 25%, transparent)}.ihGs4q_addCardBtn:disabled{cursor:not-allowed;opacity:.4}.ihGs4q_timelineEmpty{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent);justify-content:center;align-items:center;gap:6px;padding:24px 12px;font-size:11px;display:flex}.ihGs4q_editHintBar{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 20%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent);flex-shrink:0;align-items:flex-start;gap:8px;padding:8px 12px;font-size:10px;display:flex}.ihGs4q_editHintIcon{width:12px;height:12px;color:color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 70%, transparent);flex-shrink:0;margin-top:2px}.ihGs4q_editHintStrong{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 80%, transparent)}.ihGs4q_i12{width:12px;height:12px}.ihGs4q_i14{width:14px;height:14px}.ihGs4q_spinIcon{width:14px;height:14px;animation:1s linear infinite ihGs4q_motionSpin}";
		const tagId$3 = "@melite/motion-motion/component.module.css@f2e7bed9";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/motion-motion";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var component_module_css_default = {
			"addCardBtn": "ihGs4q_addCardBtn",
			"bgImg": "ihGs4q_bgImg",
			"bgSquareWrap": "ihGs4q_bgSquareWrap",
			"bodyEmptyIcon": "ihGs4q_bodyEmptyIcon",
			"bodyNotice": "ihGs4q_bodyNotice",
			"bodySquareWrap": "ihGs4q_bodySquareWrap",
			"camDivider": "ihGs4q_camDivider",
			"camPill": "ihGs4q_camPill",
			"centerRow": "ihGs4q_centerRow",
			"contents": "ihGs4q_contents",
			"cornerHandle": "ihGs4q_cornerHandle",
			"cornerNE": "ihGs4q_cornerNE",
			"cornerNW": "ihGs4q_cornerNW",
			"cornerSE": "ihGs4q_cornerSE",
			"cornerSW": "ihGs4q_cornerSW",
			"crossH": "ihGs4q_crossH",
			"crossV": "ihGs4q_crossV",
			"dropVeil": "ihGs4q_dropVeil",
			"dropVeilLabel": "ihGs4q_dropVeilLabel",
			"editHintBar": "ihGs4q_editHintBar",
			"editHintIcon": "ihGs4q_editHintIcon",
			"editHintStrong": "ihGs4q_editHintStrong",
			"exportRect": "ihGs4q_exportRect",
			"fpsChip": "ihGs4q_fpsChip",
			"hintTitle": "ihGs4q_hintTitle",
			"hintWrap": "ihGs4q_hintWrap",
			"i12": "ihGs4q_i12",
			"i14": "ihGs4q_i14",
			"motionSpin": "ihGs4q_motionSpin",
			"noMotion": "ihGs4q_noMotion",
			"ovBg": "ihGs4q_ovBg",
			"ovCam": "ihGs4q_ovCam",
			"ovDrop": "ihGs4q_ovDrop",
			"ovRect": "ihGs4q_ovRect",
			"playBtn": "ihGs4q_playBtn",
			"playIcon": "ihGs4q_playIcon",
			"railGrid": "ihGs4q_railGrid",
			"railGroupLabelMt": "ihGs4q_railGroupLabelMt",
			"railPanel": "ihGs4q_railPanel",
			"rectHint": "ihGs4q_rectHint",
			"shellPad": "ihGs4q_shellPad",
			"skelAvatar": "ihGs4q_skelAvatar",
			"skelAvatarSm": "ihGs4q_skelAvatarSm",
			"skelLine": "ihGs4q_skelLine",
			"spinIcon": "ihGs4q_spinIcon",
			"stageFrame": "ihGs4q_stageFrame",
			"stageFrameDrag": "ihGs4q_stageFrameDrag",
			"stageLoading": "ihGs4q_stageLoading",
			"stageVeil": "ihGs4q_stageVeil",
			"timeText": "ihGs4q_timeText",
			"timeWrap": "ihGs4q_timeWrap",
			"timelineEmpty": "ihGs4q_timelineEmpty",
			"timelineShell": "ihGs4q_timelineShell",
			"transportHead": "ihGs4q_transportHead",
			"veilText": "ihGs4q_veilText",
			"warnIcon": "ihGs4q_warnIcon",
			"wireBtn": "ihGs4q_wireBtn",
			"wireBtnOff": "ihGs4q_wireBtnOff",
			"wireBtnOn": "ihGs4q_wireBtnOn"
		};
		//#endregion
		//#region src/ui/studio/motionCopy.ts
		/**
		* motionCopy.ts — THE MOTION STUDIO COPY DICTIONARY (the rail-law
		* audit's §2a, 2026-10-31). Client UI copy is locale-owned (the
		* estate's decision, mirrored from card-base's square.ts): presentation
		* code owns no copy literals; it consumes them here through the typed
		* seat. A second locale plugs into this dictionary without touching
		* a single studio component.
		*
		* THE BOUND: static user-visible FACES live here (labels, titles,
		* aria names, button faces, empty states, hints). Parameterized
		* sentences whose shape is fixed but whose slots are live (the frame
		* chip, the fps readout, the export summary, the rect/output aria
		* names, the body-notice fallback) live here as typed dict functions
		* (the square.ts pattern) — the site passes exactly the params the
		* entry declares. `tip=` hover help and `desc=` option sub-lines are
		* not census seats (the client-copy census walk does not seat them);
		* they stay at the site, except the exact twins that share a flagged
		* face — those ride the same key so one string has one owner.
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const motionCopy = {
			/** Background picker: keep the stage's own background. */
			bgPreserve: "Preserve",
			/** Background picker: alpha PNG (no background). */
			bgTransparent: "Transparent",
			/** Background picker: flat black. */
			bgBlack: "Black",
			/** Background picker: flat white. */
			bgWhite: "White",
			/** Background picker: the mannequin stage dark. */
			bgDark: "Dark",
			/** Render-mode card: the raw mesh pass. */
			modeMesh: "Raw mesh",
			/** Render-mode card: the COCO-18 skeleton pass. */
			modeOpenPose: "OpenPose",
			/** Render-mode card: the grayscale depth pass. */
			modeDepth: "Depth",
			/** Export dialog head. */
			dialogTitle: "Export Motion",
			/** Frame chip: "frame <current>/<total>". */
			frameChip: (p) => `frame ${p.current}/${p.total}`,
			/** Dismiss action (dialog X aria name + footer button). */
			close: "Close",
			/** Scope card: the framed rect at the user's angle. */
			scopeSingle: "Single view",
			/** Scope card: the same rect walked around the azimuth ring. */
			scopeBatch: "8-angle batch",
			/** Scope card: the raw motion NPZ + baked GLB files. */
			scopeDownloads: "Downloads",
			/** Downloads scope hover law when no run exists yet. */
			downloadsNeedsRunTitle: "Run the card first — the raw NPZ exists after a run",
			/** Visual-framing section head. */
			frameShotTitle: "Frame the shot",
			/** Live-framing panel head. */
			rectOnStageTitle: "Rectangle on the stage",
			/** Framing help, lead fragment (renders before the styled subject). */
			liveHelpDragThe: "Drag the",
			/** Framing help, styled subject (the stage rectangle). */
			liveHelpSubject: "rectangle over the character",
			/** Framing help, body fragment (renders after the styled subject). */
			liveHelpMoves: "— its body moves it, its corners resize it (aspect-locked). The rectangle is just the framing tool:",
			/** Framing help, second styled fragment (the typed-pixel promise). */
			liveHelpPixels: "any size on screen exports the typed pixels below",
			/** Framing help, tail (the camera is the user's own). */
			liveHelpCamera: ". The camera is yours — orbit/zoom for the angle.",
			/** Rect position field label ("x pos %" / "y pos %"). */
			rectPosLabel: (p) => p.part + " pos %",
			/** Rect position input aria name ("Rectangle x position (percent)"). */
			rectPosAria: (p) => `Rectangle ${p.part} position (percent)`,
			/** Output-size field label: width. */
			outWidthLabel: "width px",
			/** Output-size field label: height. */
			outHeightLabel: "height px",
			/** Output-size input aria name ("Output width (pixels)"). */
			outDimAria: (p) => `Output ${p.dim === "w" ? "width" : "height"} (pixels)`,
			/** Typed-size readout caption. */
			outputReadout: "output",
			/** Frame preset: refit the default rectangle. */
			resetFrame: "Reset frame",
			/** Frame preset: cover the whole stage. */
			wholeStage: "Whole stage",
			/** Render-modes section head. */
			renderModesTitle: "Render modes",
			/** Render-modes warning when no mode is selected. */
			pickAtLeastOne: "pick at least one",
			/** Frame scrubber section head. */
			frameSectionTitle: "Frame",
			/** Frame scrubber pause action (aria + hover twin). */
			pausePreview: "Pause preview",
			/** Frame scrubber play action (aria + hover twin). */
			playPreview: "Play preview",
			/** Background section head (dialog + rail share the face). */
			background: "Background",
			/** Export summary: the single-view file list. */
			summarySingle: (p) => "Stage frame — " + p.modes,
			/** Export summary: the batch file list (count walks the azimuth ring). */
			summaryBatch: (p) => `${p.count} angles, same rect — ${p.modes}`,
			/** Export summary: the empty-modes face. */
			noModesSelected: "no modes selected",
			/** Export summary: the downloads file list. */
			summaryDownloads: (p) => "Raw motion NPZ" + (p.withGlb ? " + baked GLB" : ""),
			/** Summary row: the baked GLB is downloadable. */
			glbPreviewAvailable: "GLB preview available for download",
			/** Export button busy face. */
			exporting: "Exporting…",
			/** Export button idle face ("Export the frame" / "Export 8 angles" / "Export files"). */
			exportAction: (p) => "Export " + (p.scope === "single" ? "the frame" : p.scope === "batch" ? "8 angles" : "files"),
			/** Rail group label: the view toggles. */
			viewGroup: "View",
			/** Rail toggle: the joint skeleton overlay. */
			skeletonToggle: "Skeleton",
			/** Rail toggle: pin the figure at the origin. */
			inPlaceToggle: "In-place",
			/** Rail group label: the pose tools. */
			poseGroup: "Pose",
			/** Pose toggle face when edit mode is on. */
			poseDone: "Done",
			/** Pose toggle face when edit mode is off. */
			refinePose: "Refine pose",
			/** Pose action: stamp the edited pose as a timeline keyframe. */
			stamp: "Stamp",
			/** Pose action face (the edit-hint twin shares it). */
			repose: "Repose",
			/** Pose action busy face. */
			reposing: "Reposing…",
			/** Pose action: discard the refined pose at this frame. */
			resetPose: "Reset pose",
			/** Spec form section: generation params. */
			sectionGeneration: "Generation",
			/** Spec form section: guidance params. */
			sectionGuidance: "Guidance",
			/** Spec form section: clock params. */
			sectionClock: "Clock",
			/** Rail group label: the output tools. */
			outputGroup: "Output",
			/** Rail toggle: the export panel. */
			railExport: "Export",
			/** Rail group label: the preview-body input subcard. */
			previewBody: "Preview body",
			/** Wire-button aria name for the preview-body slot. */
			wireBodyAria: "Wire the preview body from an earlier card",
			/** Body notice fallback: "<notice> — previewing on the neutral mannequin." */
			bodyNoticeSuffix: (p) => p.notice + " — previewing on the neutral mannequin.",
			/** Stage drop veil: what a drop does. */
			dropHint: "Drop a GLB to set the preview body — an image to set the background",
			/** Stage loading veil aria name (the bind pose). */
			loadingMannequin: "Loading mannequin",
			/** Rail hover twin of the mannequin loading face. */
			loadingMannequinBusy: "Loading mannequin…",
			/** Stage loading veil aria name (the motion). */
			loadingMotion: "Loading motion",
			/** Camera pill: step −45° (tip + aria share the face). */
			rotateLeft: "Rotate view left (45°)",
			/** Camera pill: full-body framing (tip + aria share the face). */
			framingFull: "Full body framing",
			/** Camera pill: upper-half framing. */
			framingUpper: "Upper half framing",
			/** Camera pill: step +45° (tip + aria share the face). */
			rotateRight: "Rotate view right (45°)",
			/** Export-frame rectangle aria name. */
			exportRectAria: "Export frame — drag to move, drag a corner to resize",
			/** Export-frame rectangle hint bar. */
			rectHint: "Drag the rectangle over the character · corners resize (aspect-locked) · any size exports the typed pixels · orbit for the angle",
			/** Timeline empty face (no total frames yet). */
			emptyTimeline: "Run the card — the timeline appears with the motion",
			/** Transport pause action (aria + hover twin). */
			pauseSpace: "Pause (Space)",
			/** Transport play action (aria + hover twin). */
			playSpace: "Play (Space)",
			/** Transport empty face (no motion yet). */
			noMotion: "No motion yet — run the card",
			/** Timeline fps chip ("30 fps · 120f"). */
			fpsChip: (p) => `${p.fps} fps · ${p.frames}f`,
			/** Timeline bar head. */
			timelineTitle: "Timeline · prompt cards",
			/** Timeline action: carve a new prompt card. */
			addPromptCard: "Add prompt card",
			/** Edit-hint lead (renders before the styled Repose word). */
			editHintLead: "Drag joints to refine the pose at this frame (IK moves the chain).",
			/** Edit-hint tail (renders after the styled Repose word). */
			editHintTail: "patches rotations for the edited frame and saves it as the chain start. Hit Run when ready — kimodo conditions on it. Finger/toe tip rotations are approximate (translate edits)."
		};
		//#endregion
		//#region \0dsh-css:packages/motion/motion/src/ui/studio/export-dialog.module.css.mjs
		const css$2 = ".Tjpl1G_panel{border:1px solid color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 60%, transparent);background:var(--dsw-alias-bg-module-platform);border-radius:12px;flex-direction:column;flex-shrink:0;width:min(340px,42vw);min-height:0;max-height:100%;display:flex;overflow:hidden;box-shadow:0 25px 50px -12px #00000073}.Tjpl1G_head{border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent);flex-shrink:0;justify-content:space-between;align-items:center;padding:12px 20px;display:flex}.Tjpl1G_headTitle{align-items:center;gap:8px;display:flex}.Tjpl1G_headIcon{width:16px;height:16px;color:var(--dsw-alias-accent,#3b82f6)}.Tjpl1G_headText{font-size:14px;font-weight:500}.Tjpl1G_frameChip{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 60%, transparent);color:color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent);border-radius:4px;padding:2px 6px;font-family:ui-monospace,monospace;font-size:10px}.Tjpl1G_closeBtn{color:var(--dsw-alias-label-secondary)}.Tjpl1G_closeBtn:hover{color:var(--dsw-alias-label-primary)}.Tjpl1G_body{flex-direction:column;flex:1;gap:16px;min-height:0;padding:20px;display:flex;overflow-y:auto}.Tjpl1G_stack2{flex-direction:column;gap:8px;display:flex}.Tjpl1G_secTitle{text-transform:uppercase;letter-spacing:.05em;color:var(--dsw-alias-label-secondary);align-items:center;gap:4px;font-size:10px;font-weight:600;display:flex}.Tjpl1G_secHead{justify-content:space-between;align-items:center;display:flex}.Tjpl1G_scopeGrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;display:grid}.Tjpl1G_scopeBtn{text-align:left;border:1px solid #0000;border-radius:8px;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:10px;transition:color .12s,background-color .12s,border-color .12s;display:flex}.Tjpl1G_scopeBtn:disabled{cursor:not-allowed;opacity:.4}.Tjpl1G_scopeBtnActive{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 10%, transparent)}.Tjpl1G_scopeBtnIdle{border-color:color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent)}.Tjpl1G_scopeBtnIdle:hover{border-color:var(--dsw-alias-border,#e2e4e9);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 30%, transparent)}.Tjpl1G_scopeBtnRow{align-items:center;gap:6px;display:flex}.Tjpl1G_scopeLabel{font-size:11px;font-weight:500}.Tjpl1G_scopeCheck{width:12px;height:12px;color:var(--dsw-alias-accent,#3b82f6);margin-left:auto}.Tjpl1G_scopeDesc{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent);font-size:9px}.Tjpl1G_livePanel{border:1px solid color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 4%, transparent);border-radius:8px;flex-direction:column;gap:8px;padding:10px 12px;display:flex}.Tjpl1G_livePanelHead{color:var(--dsw-alias-accent,#3b82f6);align-items:center;gap:6px;font-size:10px;font-weight:500;display:flex}.Tjpl1G_liveHelp{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 80%, transparent);margin:0;font-size:10px;line-height:1.375}.Tjpl1G_liveHelpStrong{color:color-mix(in srgb, var(--dsw-alias-label-primary) 90%, transparent)}.Tjpl1G_fieldGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;display:grid}.Tjpl1G_field{flex-direction:column;gap:2px;display:flex}.Tjpl1G_fieldLabel{text-transform:uppercase;letter-spacing:.05em;color:color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent);font-size:9px;font-weight:600}.Tjpl1G_numInput{font-variant-numeric:tabular-nums;width:100%;font-family:ui-monospace,monospace;font-size:10px}.Tjpl1G_outRow{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 80%, transparent);align-items:center;gap:8px;font-family:ui-monospace,monospace;font-size:10px;display:flex}.Tjpl1G_outDim{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 60%, transparent)}.Tjpl1G_outVal{color:var(--dsw-alias-accent,#3b82f6)}.Tjpl1G_presetRow{gap:6px;display:flex}.Tjpl1G_presetBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent);color:var(--dsw-alias-label-secondary);border-radius:4px;padding:4px 8px;font-size:10px;transition:color .12s,background-color .12s,border-color .12s}.Tjpl1G_presetBtn:hover{color:var(--dsw-alias-label-primary)}.Tjpl1G_modesWarn{color:color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 70%, transparent);font-size:9px}.Tjpl1G_modeGrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;display:grid}.Tjpl1G_modeCard{text-align:left;border:1px solid #0000;border-radius:8px;flex-direction:column;align-items:flex-start;gap:2px;padding:8px;transition:color .12s,background-color .12s,border-color .12s;display:flex}.Tjpl1G_modeCardActive{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 10%, transparent)}.Tjpl1G_modeCardIdle{border-color:color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent)}.Tjpl1G_modeCardIdle:hover{border-color:var(--dsw-alias-border,#e2e4e9);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 30%, transparent)}.Tjpl1G_scrubRow{align-items:center;gap:6px;display:flex}.Tjpl1G_scrubPlay{color:var(--dsw-alias-label-secondary);transition:color .12s}.Tjpl1G_scrubPlay:hover{color:var(--dsw-alias-accent,#3b82f6)}.Tjpl1G_scrubCount{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent);font-family:ui-monospace,monospace;font-size:10px}.Tjpl1G_stepBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent);color:var(--dsw-alias-label-secondary);border-radius:4px;padding:4px;transition:color .12s}.Tjpl1G_stepBtn:hover{color:var(--dsw-alias-label-primary)}.Tjpl1G_stepBtn:disabled{opacity:.3}.Tjpl1G_range{height:12px;accent-color:var(--dsw-alias-accent,#3b82f6);flex:1}.Tjpl1G_bgGrid{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;display:grid}.Tjpl1G_bgBtn{border:1px solid #0000;border-radius:4px;padding:6px 0;font-size:10px;transition:color .12s,background-color .12s,border-color .12s}.Tjpl1G_bgBtnActive{border-color:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 50%, transparent);background:color-mix(in srgb, var(--dsw-alias-accent,#3b82f6) 10%, transparent);color:var(--dsw-alias-accent,#3b82f6)}.Tjpl1G_bgBtnIdle{border-color:color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent)}.Tjpl1G_bgBtnIdle:hover{border-color:var(--dsw-alias-border,#e2e4e9);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 30%, transparent)}.Tjpl1G_summary{border:1px solid color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 30%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 40%, transparent);border-radius:8px;flex-direction:column;gap:4px;padding:8px 12px;display:flex}.Tjpl1G_summaryRow{color:color-mix(in srgb, var(--dsw-alias-label-secondary) 70%, transparent);align-items:center;gap:6px;font-size:10px;display:flex}.Tjpl1G_foot{border-top:1px solid color-mix(in srgb, var(--dsw-alias-border,#e2e4e9) 40%, transparent);flex-shrink:0;justify-content:flex-end;align-items:center;gap:8px;padding:12px 20px;display:flex}.Tjpl1G_footGhost{border:1px solid var(--dsw-alias-border,#e2e4e9);height:32px;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:0 12px;font-size:12px;font-weight:500}.Tjpl1G_footGhost:hover{color:var(--dsw-alias-label-primary)}.Tjpl1G_footPrimary{background:var(--dsw-alias-accent,#3b82f6);height:32px;color:var(--dsw-alias-bg-module-platform);border-radius:6px;align-items:center;gap:6px;padding:0 12px;font-size:12px;font-weight:500;display:flex}.Tjpl1G_footPrimary:disabled{cursor:not-allowed;opacity:.5}.Tjpl1G_i12{width:12px;height:12px}.Tjpl1G_i14{width:14px;height:14px}.Tjpl1G_i16{width:16px;height:16px}";
		const tagId$2 = "@melite/motion-motion/export-dialog.module.css@5ec77289";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/motion-motion";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var export_dialog_module_css_default = {
			"bgBtn": "Tjpl1G_bgBtn",
			"bgBtnActive": "Tjpl1G_bgBtnActive",
			"bgBtnIdle": "Tjpl1G_bgBtnIdle",
			"bgGrid": "Tjpl1G_bgGrid",
			"body": "Tjpl1G_body",
			"closeBtn": "Tjpl1G_closeBtn",
			"field": "Tjpl1G_field",
			"fieldGrid": "Tjpl1G_fieldGrid",
			"fieldLabel": "Tjpl1G_fieldLabel",
			"foot": "Tjpl1G_foot",
			"footGhost": "Tjpl1G_footGhost",
			"footPrimary": "Tjpl1G_footPrimary",
			"frameChip": "Tjpl1G_frameChip",
			"head": "Tjpl1G_head",
			"headIcon": "Tjpl1G_headIcon",
			"headText": "Tjpl1G_headText",
			"headTitle": "Tjpl1G_headTitle",
			"i12": "Tjpl1G_i12",
			"i14": "Tjpl1G_i14",
			"i16": "Tjpl1G_i16",
			"liveHelp": "Tjpl1G_liveHelp",
			"liveHelpStrong": "Tjpl1G_liveHelpStrong",
			"livePanel": "Tjpl1G_livePanel",
			"livePanelHead": "Tjpl1G_livePanelHead",
			"modeCard": "Tjpl1G_modeCard",
			"modeCardActive": "Tjpl1G_modeCardActive",
			"modeCardIdle": "Tjpl1G_modeCardIdle",
			"modeGrid": "Tjpl1G_modeGrid",
			"modesWarn": "Tjpl1G_modesWarn",
			"numInput": "Tjpl1G_numInput",
			"outDim": "Tjpl1G_outDim",
			"outRow": "Tjpl1G_outRow",
			"outVal": "Tjpl1G_outVal",
			"panel": "Tjpl1G_panel",
			"presetBtn": "Tjpl1G_presetBtn",
			"presetRow": "Tjpl1G_presetRow",
			"range": "Tjpl1G_range",
			"scopeBtn": "Tjpl1G_scopeBtn",
			"scopeBtnActive": "Tjpl1G_scopeBtnActive",
			"scopeBtnIdle": "Tjpl1G_scopeBtnIdle",
			"scopeBtnRow": "Tjpl1G_scopeBtnRow",
			"scopeCheck": "Tjpl1G_scopeCheck",
			"scopeDesc": "Tjpl1G_scopeDesc",
			"scopeGrid": "Tjpl1G_scopeGrid",
			"scopeLabel": "Tjpl1G_scopeLabel",
			"scrubCount": "Tjpl1G_scrubCount",
			"scrubPlay": "Tjpl1G_scrubPlay",
			"scrubRow": "Tjpl1G_scrubRow",
			"secHead": "Tjpl1G_secHead",
			"secTitle": "Tjpl1G_secTitle",
			"stack2": "Tjpl1G_stack2",
			"stepBtn": "Tjpl1G_stepBtn",
			"summary": "Tjpl1G_summary",
			"summaryRow": "Tjpl1G_summaryRow"
		};
		//#endregion
		//#region src/ui/studio/MotionExportDialog.tsx
		/**
		* MotionExportDialog — the Motion Card's export surface.
		*
		* The user MANUALLY frames a shot and picks render modes — there is no
		* default export.
		*
		* Render modes (any subset, user-selected — Export is disabled until ≥1):
		* • {tag}_mesh.png     — raw mesh render (background per the picker)
		* • {tag}_openpose.png — COCO-18 skeleton at the SAME camera (pixel-aligned)
		* • {tag}_depth.png    — grayscale depth pass (MeshDepthMaterial)
		*
		* ONE FRAMING (2026-08-15, round 2 — the preset square is GONE): the STAGE
		* RECTANGLE over the live 3D stage (rendered by MotionCardEditor while this
		* dialog is open). The camera is the user's own orbit — export is SCREENSHOT
		* SEMANTICS: render the scene with the camera AS IS (buffer upscaled, aspect
		* untouched), crop the rect, scale its long edge to the output resolution.
		* The output inherits the rect's aspect — 2:3 portrait, 16:9 wide, whatever
		* was framed.
		*
		* SIZING (2026-08-15 round 3 — PIXELS, "height and width should always be
		* pixels"): the OUTPUT SIZE (outW × outH, typed in px) is the export truth.
		* The stage rectangle is just the framing TOOL — its PIXEL aspect is locked
		* to outW:outH by the parent (MotionCardEditor refits on every size change
		* and every corner drag), so it can sit ANY size on screen and still export
		* the typed pixels ("I can't really output a 768 by 1024 because I don't
		* have room" — room was never needed; the rect's on-screen size ≠ the
		* output resolution). Drag its BODY to move, drag ANY of its FOUR corners
		* to resize (aspect-locked, opposite corner anchored), type the POSITION in
		* percent here, type the SIZE in pixels here.
		*
		* PRE-RUN EXPORT: the rest pose (T=1) is a full export subject — the stage
		* renders the neutral mannequin before any GPU run, so framing + exporting
		* works immediately ("do I have to actually make motion to output a frame?"
		* — no). Only the Downloads scope needs a run (no NPZ asset exists yet —
		* its button is disabled until npzUrl).
		*
		* Scope:
		* • Single view — the framed rect at the user's angle, current frame.
		* • 8-angle batch — the SAME rect, automated around the azimuth ring: the
		*   camera is re-aimed at each preset (position + lookAt only), then the
		*   identical render + crop runs. ZERO extra image manipulation — the
		*   framing work is done once and reused eight times ("it is just
		*   automated and done for the user").
		* • Downloads — the raw motion NPZ + the auto-baked GLB preview.
		*
		* PIXEL-ALIGNMENT CONTRACT: mesh + openpose + depth come from the SAME
		* camera state. Mesh/depth are off-screen passes of the live three.js
		* scene (threeCtxRef); openpose projects the COCO-18 joints through that
		* exact camera matrix + the viewer's group transform (lift + optional
		* in-place root pin), then remaps into the crop region so the skeleton
		* sits on the mesh.
		*
		* BACKGROUNDS: Preserve (default — the stage's OWN background, including a
		* user-uploaded custom background image), Transparent, or a flat color.
		*
		* LAYOUT: the panel is IN-FLOW — a flex sibling of the stage inside the
		* editor, never a fixed overlay. Opening it PUSHES the viewport narrower
		* (the mesh is never covered — "it literally goes over the mesh we need
		* to see" fixed at the layout level, not with z-index).
		*
		* DESTINATION: browser download — the ONE delivery path.
		*/
		/** Long-edge PRESETS are GONE (2026-08-15 round 4, "do we need resolution
		*  presets anymore when we type the pixel resolutions?"): the typed px
		*  inputs are the one size UI — nothing shadows them. */
		/** "preserve" = the stage's OWN background (a user-uploaded custom image or
		*  the default dark) — carried into the export untouched; "transparent" =
		*  nulled for the mesh pass (alpha PNG); hex = a flat color swapped in for
		*  the render and restored after. */
		const BACKGROUNDS = [
			{
				label: motionCopy.bgPreserve,
				value: "preserve"
			},
			{
				label: motionCopy.bgTransparent,
				value: "transparent"
			},
			{
				label: motionCopy.bgBlack,
				value: "#000000"
			},
			{
				label: motionCopy.bgWhite,
				value: "#ffffff"
			},
			{
				label: motionCopy.bgDark,
				value: _melite_card_base_client.STAGE_BACKGROUND_DARK
			}
		];
		const RENDER_MODES = [
			{
				id: "mesh",
				label: motionCopy.modeMesh,
				desc: "Mannequin render"
			},
			{
				id: "openpose",
				label: motionCopy.modeOpenPose,
				desc: "COCO-18 skeleton"
			},
			{
				id: "depth",
				label: motionCopy.modeDepth,
				desc: "Grayscale depth map"
			}
		];
		const TARGET_HEIGHT = .9;
		const DEPTH_NEAR = 1.5;
		const DEPTH_FAR = 5;
		const MAX_RENDER = 2048;
		let _depthMat = null;
		function depthMaterial() {
			return _depthMat ??= new _melite_three_client_client.MeshDepthMaterial();
		}
		const DEFAULT_STAGE_RECT = {
			x: .25,
			y: .1,
			w: .5,
			h: .8
		};
		function MotionExportDialog({ open, onClose, npz, npzUrl, glbUrl, frameIdx, onFrameChange, displayJointsM, liftY, inPlace, threeCtxRef, stageRect, onStageRectChange, outW, outH, onOutSize, onFramePreset }) {
			const [scope, setScope] = (0, react.useState)("single");
			const [bgIdx, setBgIdx] = (0, react.useState)(0);
			const [exporting, setExporting] = (0, react.useState)(false);
			const [previewing, setPreviewing] = (0, react.useState)(false);
			const [enabledModes, setEnabledModes] = (0, react.useState)(/* @__PURE__ */ new Set());
			const toast = (0, _melite_card_base_client.useToastStore)((s) => s.addToast);
			const frameRef = (0, react.useRef)(frameIdx);
			frameRef.current = frameIdx;
			(0, react.useEffect)(() => {
				if (!previewing || !onFrameChange) return;
				const frameDur = 1e3 / (npz.fps || 30);
				const id = window.setInterval(() => {
					const next = frameRef.current + 1;
					if (next >= npz.T) {
						setPreviewing(false);
						return;
					}
					onFrameChange(next);
				}, frameDur);
				return () => window.clearInterval(id);
			}, [
				previewing,
				onFrameChange,
				npz.fps,
				npz.T
			]);
			(0, react.useEffect)(() => {
				if (!open) setPreviewing(false);
			}, [open]);
			const stageDims = (0, react.useCallback)(() => {
				const ctx = threeCtxRef.current;
				if (!ctx) throw new Error("3D context not ready — retry the export");
				const el = ctx.gl.domElement;
				return {
					w: el.clientWidth || el.width || 1,
					h: el.clientHeight || el.height || 1
				};
			}, [threeCtxRef]);
			/** Screenshot pass at the LIVE camera: buffer upscaled, aspect untouched
			*  (the render size keeps the stage ratio), camera never moved. Background
			*  per the picker: "preserve" leaves the stage's own (a custom image
			*  carries into the export), "transparent" nulls it (alpha PNG), a hex
			*  swaps a flat color in for the render and restores after. */
			const renderLive = (0, react.useCallback)((w, h, bg) => {
				const ctx = threeCtxRef.current;
				if (!ctx) throw new Error("3D context not ready");
				const { gl, scene } = ctx;
				const camera = ctx.camera;
				const origBg = scene.background;
				const origW = gl.domElement.width;
				const origH = gl.domElement.height;
				try {
					if (bg === "transparent") scene.background = null;
					else if (bg !== "preserve") scene.background = new _melite_three_client_client.Color(bg);
					gl.setSize(w, h, false);
					gl.render(scene, camera);
					return gl.domElement.toDataURL("image/png");
				} finally {
					scene.background = origBg;
					gl.setSize(origW, origH, false);
					gl.render(scene, camera);
				}
			}, [threeCtxRef]);
			/** Depth variant of the screenshot pass (same untouched camera, tight
			*  near/far so the body fills the grayscale range). */
			const renderDepthLive = (0, react.useCallback)((w, h) => {
				const ctx = threeCtxRef.current;
				if (!ctx) throw new Error("3D context not ready");
				const { gl, scene } = ctx;
				const camera = ctx.camera;
				const origNear = camera.near;
				const origFar = camera.far;
				const origOverride = scene.overrideMaterial;
				const origBg = scene.background;
				const origW = gl.domElement.width;
				const origH = gl.domElement.height;
				try {
					camera.near = DEPTH_NEAR;
					camera.far = DEPTH_FAR;
					camera.updateProjectionMatrix();
					gl.setSize(w, h, false);
					scene.overrideMaterial = depthMaterial();
					scene.background = null;
					gl.render(scene, camera);
					return gl.domElement.toDataURL("image/png");
				} finally {
					scene.overrideMaterial = origOverride;
					scene.background = origBg;
					gl.setSize(origW, origH, false);
					camera.near = origNear;
					camera.far = origFar;
					camera.updateProjectionMatrix();
					gl.render(scene, camera);
				}
			}, [threeCtxRef]);
			/** Project the displayed COCO-18 joints through the LIVE camera into
			*  (w, h) pixels (w/h == the stage ratio == camera.aspect — no swap),
			*  applying the viewer's group transform (lift + in-place pin). */
			const projectToPixelsLive = (0, react.useCallback)((w, h) => {
				const ctx = threeCtxRef.current;
				if (!ctx) throw new Error("3D context not ready");
				const camera = ctx.camera;
				const root0 = npz.posedJoints;
				const rootF = npz.posedJoints.subarray(frameIdx * 77 * 3, frameIdx * 77 * 3 + 3);
				const gx = inPlace ? root0[0] - rootF[0] : 0;
				const gz = inPlace ? root0[2] - rootF[2] : 0;
				const coco = soma77ToCoco18(displayJointsM);
				const out = /* @__PURE__ */ new Float32Array(54);
				const v = new _melite_three_client_client.Vector3();
				for (let i = 0; i < 18; i++) {
					v.set(coco[i * 3] + gx, coco[i * 3 + 1] + liftY, coco[i * 3 + 2] + gz);
					v.project(camera);
					const visible = v.z >= -1 && v.z <= 1;
					out[i * 3] = (v.x + 1) / 2 * w;
					out[i * 3 + 1] = (1 - v.y) / 2 * h;
					out[i * 3 + 2] = visible ? .9 : 0;
				}
				return out;
			}, [
				threeCtxRef,
				npz,
				frameIdx,
				displayJointsM,
				liftY,
				inPlace
			]);
			const cameraForView = (0, react.useCallback)((view) => {
				const ctx = threeCtxRef.current;
				if (!ctx) throw new Error("3D context not ready — retry the export");
				const camera = ctx.camera;
				const root = inPlace ? npz.posedJoints : npz.posedJoints.subarray(frameIdx * 77 * 3, frameIdx * 77 * 3 + 3);
				const tx = root[0];
				const tz = root[2];
				const [px, py, pz] = azimuthCameraPos$1(view);
				camera.position.set(px + tx, py, pz + tz);
				camera.lookAt(tx, TARGET_HEIGHT, tz);
				return camera;
			}, [
				threeCtxRef,
				npz,
				frameIdx,
				inPlace
			]);
			/** Run `fn` with the camera at an azimuth preset (batch), or with the
			*  user's own camera untouched (single view — null). Saves position +
			*  orientation, restores + repaints after, so the live stage never shows
			*  a stale batch angle. */
			const withCameraAt = (0, react.useCallback)((view, fn) => {
				if (view === null) return fn();
				const ctx = threeCtxRef.current;
				if (!ctx) throw new Error("3D context not ready");
				const camera = ctx.camera;
				const origPos = camera.position.clone();
				const origQuat = camera.quaternion.clone();
				cameraForView(view);
				try {
					return fn();
				} finally {
					camera.position.copy(origPos);
					camera.quaternion.copy(origQuat);
					ctx.gl.render(ctx.scene, camera);
				}
			}, [threeCtxRef, cameraForView]);
			const toggleMode = (m) => setEnabledModes((prev) => {
				const next = new Set(prev);
				if (next.has(m)) next.delete(m);
				else next.add(m);
				return next;
			});
			const downloadDataUrl = (dataUrl, filename) => {
				const a = document.createElement("a");
				a.href = dataUrl;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				a.remove();
			};
			const downloadBlob = (blob, filename) => {
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(url);
			};
			/** Load a PNG data URL into a canvas (for cropping). */
			const dataUrlToCanvas = (url) => new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					const c = document.createElement("canvas");
					c.width = img.width;
					c.height = img.height;
					c.getContext("2d").drawImage(img, 0, 0);
					resolve(c);
				};
				img.onerror = reject;
				img.src = url;
			});
			/** Crop a full screenshot to the STAGE RECT (free aspect), scale to
			*  (ow, oh) — the long edge is the chosen resolution. */
			const cropToRectOutput = async (fullUrl, rect, ow, oh) => {
				const full = await dataUrlToCanvas(fullUrl);
				const FW = full.width;
				const FH = full.height;
				const o = document.createElement("canvas");
				o.width = ow;
				o.height = oh;
				const ctx = o.getContext("2d");
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = "high";
				ctx.drawImage(full, rect.x * FW, rect.y * FH, rect.w * FW, rect.h * FH, 0, 0, ow, oh);
				return o.toDataURL("image/png");
			};
			/** ONE delivery path for every export: the browser download. */
			const deliver = async (dataUrl, filename) => {
				downloadDataUrl(dataUrl, filename);
			};
			const deliverBlob = async (blob, filename) => {
				downloadBlob(blob, filename);
			};
			/** THE export path (one framing, 2026-08-15 round 3): one pass per mode
			*  through the screenshot flow — the user's camera when `view` is null,
			*  an azimuth preset when it isn't (the batch) — buffer upscaled at the
			*  stage ratio, cropped to the stage rect, scaled to the TYPED PIXEL size
			*  (outW × outH — exactly what the user asked for, not a derived edge).
			*  The rect's pixel aspect == outW:outH (the parent locks it), so the crop
			*  maps 1:1 with no distortion. The SAME crop for every angle. */
			const exportOneLive = (0, react.useCallback)(async (tag, view) => {
				const bg = BACKGROUNDS[bgIdx].value;
				const opBg = bg === "preserve" ? (() => {
					const s = threeCtxRef.current?.scene.background;
					return s instanceof _melite_three_client_client.Color ? `#${s.getHexString()}` : _melite_card_base_client.STAGE_BACKGROUND_DARK;
				})() : bg;
				const ow = outW;
				const oh = outH;
				const edge = Math.max(ow, oh);
				const { w: sw, h: sh } = stageDims();
				const need = Math.max(ow / Math.max(stageRect.w * sw, 2), oh / Math.max(stageRect.h * sh, 2));
				const k = Math.min(need, MAX_RENDER / Math.max(sw, sh));
				const FW = Math.max(2, Math.round(sw * k));
				const FH = Math.max(2, Math.round(sh * k));
				for (const m of RENDER_MODES.map((r) => r.id)) {
					if (!enabledModes.has(m)) continue;
					const filename = `${tag}_${m}.png`;
					if (m === "openpose") {
						const px = withCameraAt(view, () => projectToPixelsLive(FW, FH));
						const kp = [];
						const minX = stageRect.x * FW;
						const minY = stageRect.y * FH;
						const spanX = stageRect.w * FW;
						const spanY = stageRect.h * FH;
						for (let i = 0; i < 18; i++) {
							const ox = (px[i * 3] - minX) / spanX * ow;
							const oy = (px[i * 3 + 1] - minY) / spanY * oh;
							kp.push(ox * 1024 / ow, oy * 1024 / oh, px[i * 3 + 2]);
						}
						const blob = renderOpenPoseCanvas(kp, {
							width: ow,
							height: oh,
							background: opBg,
							lineWidth: Math.max(2, Math.round(edge / 256)),
							pointRadius: Math.max(3, Math.round(edge / 200))
						});
						await deliverBlob(blob, filename);
					} else {
						const fullUrl = withCameraAt(view, () => m === "depth" ? renderDepthLive(FW, FH) : renderLive(FW, FH, bg));
						const outUrl = await cropToRectOutput(fullUrl, stageRect, ow, oh);
						await deliver(outUrl, filename);
					}
					await new Promise((r) => setTimeout(r, 80));
				}
				return {
					ow,
					oh
				};
			}, [
				outW,
				outH,
				bgIdx,
				enabledModes,
				stageRect,
				stageDims,
				renderLive,
				renderDepthLive,
				projectToPixelsLive,
				withCameraAt
			]);
			const handleExport = (0, react.useCallback)(async () => {
				setExporting(true);
				try {
					if (scope === "single") {
						await exportOneLive("stage", null);
						toast("success", `Exported the framed rect (${[...enabledModes].join(" + ")}) at ${outW} × ${outH}`);
					} else if (scope === "batch") {
						toast("info", "Rendering 8 angles…");
						for (const p of AZIMUTH_PRESETS$1) await exportOneLive(String(p.angle), p.cameraView);
						toast("success", `Exported ${AZIMUTH_PRESETS$1.length} angles — same rect (${[...enabledModes].join(" + ")}) at ${outW} × ${outH}`);
					} else {
						if (!npzUrl) throw new Error("no motion asset yet — run the card first");
						const resp = await fetch(npzUrl);
						if (!resp.ok) throw new Error(`Motion asset fetch failed: ${resp.status}`);
						downloadBlob(await resp.blob(), `kimodo-motion-${Date.now()}.npz`);
						if (glbUrl) {
							const gresp = await fetch(glbUrl);
							if (gresp.ok) downloadBlob(await gresp.blob(), `kimodo-motion-${Date.now()}.glb`);
						}
						toast("success", "Motion NPZ" + (glbUrl ? " + GLB" : "") + " downloaded");
					}
				} catch (e) {
					toast("error", `Export failed: ${e.message}`);
				} finally {
					setExporting(false);
				}
			}, [
				scope,
				enabledModes,
				exportOneLive,
				outW,
				outH,
				npzUrl,
				glbUrl,
				toast
			]);
			if (!open) return null;
			const noModes = enabledModes.size === 0;
			const setRectPos = (part, pct) => {
				if (!onStageRectChange) return;
				if (!Number.isFinite(pct)) return;
				const r = { ...stageRect };
				const v = Math.max(0, Math.min(100, pct)) / 100;
				if (part === "x") r.x = Math.min(v, 1 - r.w);
				else r.y = Math.min(v, 1 - r.h);
				onStageRectChange(r);
			};
			const setOutDim = (dim, px) => {
				if (!onOutSize) return;
				if (!Number.isFinite(px)) return;
				const v = Math.max(8, Math.min(4096, Math.round(px)));
				onOutSize(dim === "w" ? v : outW, dim === "h" ? v : outH);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: export_dialog_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: export_dialog_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: export_dialog_module_css_default.headTitle,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { className: export_dialog_module_css_default.headIcon }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: export_dialog_module_css_default.headText,
									children: motionCopy.dialogTitle
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: export_dialog_module_css_default.frameChip,
									children: motionCopy.frameChip({
										current: frameIdx + 1,
										total: npz.T
									})
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: onClose,
							"aria-label": motionCopy.close,
							className: export_dialog_module_css_default.closeBtn,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { className: export_dialog_module_css_default.i16 })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: export_dialog_module_css_default.body,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: export_dialog_module_css_default.scopeGrid,
								children: [
									{
										id: "single",
										label: motionCopy.scopeSingle,
										icon: _melite_card_base_client.Camera,
										desc: "The framed rectangle"
									},
									{
										id: "batch",
										label: motionCopy.scopeBatch,
										icon: _melite_card_base_client.Layers,
										desc: "Same rect, the ring — automated"
									},
									{
										id: "downloads",
										label: motionCopy.scopeDownloads,
										icon: _melite_card_base_client.FileBox,
										desc: npzUrl ? "NPZ + GLB" : "needs a run"
									}
								].map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									onClick: () => setScope(m.id),
									disabled: m.id === "downloads" && !npzUrl,
									title: m.id === "downloads" && !npzUrl ? motionCopy.downloadsNeedsRunTitle : void 0,
									className: (0, _melite_card_base_client.cn)(export_dialog_module_css_default.scopeBtn, scope === m.id ? export_dialog_module_css_default.scopeBtnActive : export_dialog_module_css_default.scopeBtnIdle),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: export_dialog_module_css_default.scopeBtnRow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(m.icon, { className: export_dialog_module_css_default.i14 }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: export_dialog_module_css_default.scopeLabel,
												children: m.label
											}),
											scope === m.id && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { className: export_dialog_module_css_default.scopeCheck })
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: export_dialog_module_css_default.scopeDesc,
										children: m.desc
									})]
								}, m.id))
							}),
							scope !== "downloads" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: export_dialog_module_css_default.stack2,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: export_dialog_module_css_default.secTitle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Crop, { className: export_dialog_module_css_default.i12 }),
											" ",
											motionCopy.frameShotTitle
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: export_dialog_module_css_default.livePanel,
										"data-testid": "export-live-panel",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: export_dialog_module_css_default.livePanelHead,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Frame, { className: export_dialog_module_css_default.i12 }),
													" ",
													motionCopy.rectOnStageTitle
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
												className: export_dialog_module_css_default.liveHelp,
												children: [
													motionCopy.liveHelpDragThe,
													" ",
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: export_dialog_module_css_default.liveHelpStrong,
														children: motionCopy.liveHelpSubject
													}),
													" ",
													motionCopy.liveHelpMoves,
													" ",
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: export_dialog_module_css_default.liveHelpStrong,
														children: motionCopy.liveHelpPixels
													}),
													motionCopy.liveHelpCamera
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: export_dialog_module_css_default.fieldGrid,
												"data-testid": "export-rect-inputs",
												children: ["x", "y"].map((part) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
													className: export_dialog_module_css_default.field,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: export_dialog_module_css_default.fieldLabel,
														children: motionCopy.rectPosLabel({ part })
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
														type: "number",
														min: 0,
														max: 100,
														step: 1,
														"aria-label": motionCopy.rectPosAria({ part }),
														"data-testid": `export-rect-${part}`,
														value: Math.round(stageRect[part] * 100),
														onChange: (e) => setRectPos(part, Number(e.target.value)),
														disabled: !onStageRectChange,
														className: export_dialog_module_css_default.numInput
													})]
												}, part))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: export_dialog_module_css_default.fieldGrid,
												"data-testid": "export-out-inputs",
												children: ["w", "h"].map((dim) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
													className: export_dialog_module_css_default.field,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: export_dialog_module_css_default.fieldLabel,
														children: dim === "w" ? motionCopy.outWidthLabel : motionCopy.outHeightLabel
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
														type: "number",
														min: 8,
														max: 4096,
														step: 1,
														"aria-label": motionCopy.outDimAria({ dim }),
														"data-testid": `export-out-${dim}`,
														value: dim === "w" ? outW : outH,
														onChange: (e) => setOutDim(dim, Number(e.target.value)),
														disabled: !onOutSize,
														className: export_dialog_module_css_default.numInput
													})]
												}, dim))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: export_dialog_module_css_default.outRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: export_dialog_module_css_default.outDim,
													children: motionCopy.outputReadout
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													"data-testid": "export-rect-readout",
													className: export_dialog_module_css_default.outVal,
													children: [
														outW,
														" × ",
														outH
													]
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: export_dialog_module_css_default.presetRow,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "ghost",
													onClick: () => onFramePreset ? onFramePreset("reset") : onStageRectChange?.(DEFAULT_STAGE_RECT),
													className: export_dialog_module_css_default.presetBtn,
													children: motionCopy.resetFrame
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "ghost",
													onClick: () => onFramePreset ? onFramePreset("whole") : onStageRectChange?.({
														x: 0,
														y: 0,
														w: 1,
														h: 1
													}),
													className: export_dialog_module_css_default.presetBtn,
													children: motionCopy.wholeStage
												})]
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: export_dialog_module_css_default.stack2,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: export_dialog_module_css_default.secHead,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: export_dialog_module_css_default.secTitle,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Layers, { className: export_dialog_module_css_default.i12 }),
												" ",
												motionCopy.renderModesTitle
											]
										}), noModes && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: export_dialog_module_css_default.modesWarn,
											children: motionCopy.pickAtLeastOne
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: export_dialog_module_css_default.modeGrid,
										children: RENDER_MODES.map((m) => {
											const on = enabledModes.has(m.id);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												onClick: () => toggleMode(m.id),
												className: (0, _melite_card_base_client.cn)(export_dialog_module_css_default.modeCard, on ? export_dialog_module_css_default.modeCardActive : export_dialog_module_css_default.modeCardIdle),
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: export_dialog_module_css_default.scopeBtnRow,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: export_dialog_module_css_default.scopeLabel,
														children: m.label
													}), on && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutlineRegular, { className: export_dialog_module_css_default.scopeCheck })]
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: export_dialog_module_css_default.scopeDesc,
													children: m.desc
												})]
											}, m.id);
										})
									})]
								}),
								onFrameChange && npz.T > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: export_dialog_module_css_default.stack2,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: export_dialog_module_css_default.secHead,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: export_dialog_module_css_default.secTitle,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Film, { className: export_dialog_module_css_default.i12 }),
												" ",
												motionCopy.frameSectionTitle
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: export_dialog_module_css_default.scrubRow,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
												tip: previewing ? motionCopy.pausePreview : motionCopy.playPreview,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
													variant: "ghost",
													onClick: () => setPreviewing((p) => !p),
													"aria-label": previewing ? motionCopy.pausePreview : motionCopy.playPreview,
													className: export_dialog_module_css_default.scrubPlay,
													children: previewing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPauseOutlineRegular, { className: export_dialog_module_css_default.i12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PlayAlt, { className: export_dialog_module_css_default.i12 })
												})
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: export_dialog_module_css_default.scrubCount,
												children: [
													frameIdx + 1,
													" / ",
													npz.T
												]
											})]
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: export_dialog_module_css_default.scrubRow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												onClick: () => onFrameChange(Math.max(0, frameIdx - 1)),
												disabled: frameIdx <= 0,
												className: export_dialog_module_css_default.stepBtn,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { className: export_dialog_module_css_default.i12 })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "range",
												min: 0,
												max: npz.T - 1,
												value: frameIdx,
												onChange: (e) => onFrameChange(Number(e.target.value)),
												className: export_dialog_module_css_default.range
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "ghost",
												onClick: () => onFrameChange(Math.min(npz.T - 1, frameIdx + 1)),
												disabled: frameIdx >= npz.T - 1,
												className: export_dialog_module_css_default.stepBtn,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { className: export_dialog_module_css_default.i12 })
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: export_dialog_module_css_default.stack2,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: export_dialog_module_css_default.secTitle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Palette, { className: export_dialog_module_css_default.i12 }),
											" ",
											motionCopy.background
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: export_dialog_module_css_default.bgGrid,
										children: BACKGROUNDS.map((b, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											onClick: () => setBgIdx(i),
											className: (0, _melite_card_base_client.cn)(export_dialog_module_css_default.bgBtn, bgIdx === i ? export_dialog_module_css_default.bgBtnActive : export_dialog_module_css_default.bgBtnIdle),
											children: b.label
										}, b.label))
									})]
								})
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: export_dialog_module_css_default.summary,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: export_dialog_module_css_default.summaryRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.RotateCw, { className: export_dialog_module_css_default.i12 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: scope === "single" ? motionCopy.summarySingle({ modes: noModes ? motionCopy.noModesSelected : [...enabledModes].map((m) => `stage_${m}.png`).join(" + ") }) : scope === "batch" ? motionCopy.summaryBatch({
										count: AZIMUTH_PRESETS$1.length,
										modes: noModes ? motionCopy.noModesSelected : [...enabledModes].map((m) => `{angle}_${m}.png`).join(" + ")
									}) : motionCopy.summaryDownloads({ withGlb: Boolean(glbUrl) }) })]
								}), glbUrl && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: export_dialog_module_css_default.summaryRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Box, { className: export_dialog_module_css_default.i12 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: motionCopy.glbPreviewAvailable })]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: export_dialog_module_css_default.foot,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							onClick: onClose,
							className: export_dialog_module_css_default.footGhost,
							children: motionCopy.close
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							onClick: handleExport,
							disabled: exporting || scope !== "downloads" && noModes || scope === "downloads" && !npzUrl,
							className: export_dialog_module_css_default.footPrimary,
							children: exporting ? motionCopy.exporting : motionCopy.exportAction({ scope })
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/ui/studio/motionParams.ts
		/** Shared motion-studio param keys + stage constants.
		*
		*  Moved verbatim from `component.tsx` (the MotionCardEditor godfile split):
		*  the three module-level constants the studio + its seam hooks/panels share.
		*  `component.tsx` re-exports them so the original path keeps its surface.
		*/
		/** stage.params key for the Motion Card background image (option b). A user
		*  image rendered behind the mannequin in place of the dark stage (STAGE_BACKGROUND_DARK).
		*  UI-only — never sent to ComfyUI: it admits at the compose door
		*  through the kimodo DECL's studio.writes (the bg-brick cure), and
		*  the graph builder consumes none of it, so it never rides the wire.
		*  Holds either a data: URL (file picker) or an asset URL (e.g. a
		*  scene-flow output). */
		const MOTION_BG_IMAGE_PARAM = "motion_bg_image";
		/** stage.params key for the Motion Card preview BODY (2026-08-15 character
		*  import): a SOMAX-rigged character GLB the motion previews ON — the
		*  studio's live viewport skins it client-side (lib/glbSkin.ts → the same
		*  LBS as the neutral mannequin), and the runner's post-run preview bake
		*  bakes each output NPZ onto it instead of the mannequin (the explicit-
		*  import carve-out of the 2026-07-31 mannequin-default policy).
		*
		*  A REAL wire-level param, NOT UI-only: kimodo_motion's family signature
		*  declares it (the card lane's input kind → glb, form_motion_kimodo
		*  input slot), so the agent can set it headlessly. In the studio it renders as
		*  an INPUT SUBCARD (a InputSquare — the same square the image inputs use,
		*  per the user directive): file pick / asset drop / OS drop / WIRE to an
		*  upstream 3D card's GLB output (wired XOR attached — the SlotGrid
		*  contract). Holds a data: URL (upload) or an asset URL. */
		const MOTION_PREVIEW_GLB_PARAM = "preview_glb";
		/** The stage floor's lift above y=0, in STAGE UNITS (metres on the
		* mannequin's skeleton scale): the floor plate sits this far above
		* the world origin so it never z-fights the grid plane. */
		const FLOOR_LIFT_Y$1 = .02;
		//#endregion
		//#region src/ui/studio/useMotionUndoStack.ts
		/**
		* useMotionUndoStack — the undo/redo cluster, re-homed onto the one-truth
		* doc doors (2026-11-05, nativity audit F7).
		*
		* Snapshots ALL authoring state before each mutation so the user can step
		* back through timeline edits (prompt add/move/resize/delete/split/merge,
		* keyframe add/move/delete) and joint-edit operations (enter edit mode,
		* stamp, repose, discard). The doc channels (prompts, keyframes, payloads)
		* are captured from the SHOWN document and restored through the commit
		* doors — an undo is a stated edit like any gesture, never a mirror
		* write. The joints/kept-edit/deformed-image cluster stays component UI
		* state (viewer-local, not doc state). Read via refs so pushUndo stays
		* stable (zero re-render cascade).
		*/
		function useMotionUndoStack({ captureDoc, restoreDoc, keptEdit, editedDeformedB64, editableJointsRef, setEditableJoints, setKeptEdit, setEditedDeformedB64, stageId }) {
			const undoStack = (0, react.useRef)([]);
			const redoStack = (0, react.useRef)([]);
			const scopeRef = (0, react.useRef)(stageId);
			if (scopeRef.current !== stageId) {
				scopeRef.current = stageId;
				undoStack.current = [];
				redoStack.current = [];
			}
			const [undoVersion, setUndoVersion] = (0, react.useState)(0);
			const captureDocRef = (0, react.useRef)(captureDoc);
			const restoreDocRef = (0, react.useRef)(restoreDoc);
			captureDocRef.current = captureDoc;
			restoreDocRef.current = restoreDoc;
			const keptEditRef = (0, react.useRef)(null);
			const editedDeformedB64Ref = (0, react.useRef)(null);
			keptEditRef.current = keptEdit;
			editedDeformedB64Ref.current = editedDeformedB64;
			const captureSnapshot = (0, react.useCallback)(() => {
				const editableJoints = editableJointsRef.current ? new Float32Array(editableJointsRef.current) : null;
				const doc = captureDocRef.current();
				return {
					prompts: doc.prompts.map((p) => ({ ...p })),
					keyframes: doc.keyframes.map((k) => ({ ...k })),
					payloads: Object.fromEntries(Object.entries(doc.payloads).map(([k, v]) => [k, { ...v }])),
					editableJoints,
					keptEdit: keptEditRef.current ? {
						joints: new Float32Array(keptEditRef.current.joints),
						frame: keptEditRef.current.frame
					} : null,
					editedDeformedB64: editedDeformedB64Ref.current
				};
			}, [editableJointsRef]);
			/** Snapshot current state before a mutation. Call this FIRST in every
			*  mutation handler (before the setState that changes authoring state). */
			const pushUndo = (0, react.useCallback)(() => {
				undoStack.current.push(captureSnapshot());
				redoStack.current = [];
				if (undoStack.current.length > 80) undoStack.current.shift();
				setUndoVersion((v) => v + 1);
			}, [captureSnapshot]);
			const restoreSnapshot = (0, react.useCallback)((snap) => {
				restoreDocRef.current({
					prompts: snap.prompts.map((p) => ({ ...p })),
					keyframes: snap.keyframes.map((k) => ({ ...k })),
					payloads: Object.fromEntries(Object.entries(snap.payloads).map(([k, v]) => [k, { ...v }]))
				});
				setEditableJoints(snap.editableJoints);
				editableJointsRef.current = snap.editableJoints;
				setKeptEdit(snap.keptEdit);
				setEditedDeformedB64(snap.editedDeformedB64);
			}, [
				editableJointsRef,
				setEditableJoints,
				setKeptEdit,
				setEditedDeformedB64
			]);
			const handleUndo = (0, react.useCallback)(() => {
				if (undoStack.current.length === 0) return;
				redoStack.current.push(captureSnapshot());
				restoreSnapshot(undoStack.current.pop());
				setUndoVersion((v) => v + 1);
			}, [captureSnapshot, restoreSnapshot]);
			const handleRedo = (0, react.useCallback)(() => {
				if (redoStack.current.length === 0) return;
				undoStack.current.push(captureSnapshot());
				restoreSnapshot(redoStack.current.pop());
				setUndoVersion((v) => v + 1);
			}, [captureSnapshot, restoreSnapshot]);
			(0, react.useEffect)(() => {
				const handler = (e) => {
					const el = e.target;
					if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el?.isContentEditable) return;
					if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
						e.preventDefault();
						handleUndo();
					} else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "z" && e.shiftKey)) {
						e.preventDefault();
						handleRedo();
					}
				};
				window.addEventListener("keydown", handler);
				return () => window.removeEventListener("keydown", handler);
			}, [handleUndo, handleRedo]);
			const dragUndoRef = (0, react.useRef)(null);
			const dragUndoTimeout = (0, react.useRef)(null);
			return {
				pushUndo,
				handleUndo,
				handleRedo,
				maybePushDragUndo: (0, react.useCallback)((key) => {
					if (dragUndoRef.current === key) return;
					if (dragUndoTimeout.current) clearTimeout(dragUndoTimeout.current);
					dragUndoRef.current = key;
					pushUndo();
					dragUndoTimeout.current = setTimeout(() => {
						dragUndoRef.current = null;
					}, 300);
				}, [pushUndo]),
				captureSnapshot,
				restoreSnapshot,
				undoVersion
			};
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewers/motionImageStore.ts
		init_clientStore();
		const STORAGE_KEY = "motion-images";
		function load() {
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (!raw) return {};
				const parsed = JSON.parse(raw);
				if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
			} catch {}
			return {};
		}
		function persist(images) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
			} catch {}
		}
		const useMotionImageStore = createClientStore((set, get) => ({
			images: load(),
			setImage: (key, dataUrl) => {
				const images = {
					...get().images,
					[key]: dataUrl
				};
				persist(images);
				set({ images });
			},
			clearImage: (key) => {
				if (!(key in get().images)) return;
				const images = { ...get().images };
				delete images[key];
				persist(images);
				set({ images });
			}
		}));
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
				text: [
					"txt",
					"csv",
					"md",
					"json"
				],
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
				galleryText: [
					"txt",
					"csv",
					"md",
					"json"
				],
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
				"model",
				"text"
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
		//#region src/ui/studio/useMotionMedia.ts
		/**
		* useMotionMedia — the asset/media cluster moved verbatim from
		* `component.tsx` (MotionCardEditor lines ~188–421 + ~580–735).
		*
		* Owns: the preview-body input subcard state derivations (slot resolve,
		* wire resolution, manual attach, file picks), the skin load (neutral +
		* character import + body-to-somax convert queue), the motion NPZ load +
		* chunked precompute, playback space key, tile-thumbnail capture, and the
		* stage background image (multi-source attach + THREE background push).
		*
		* Owns no primitive state (the remnant orchestrates all useState/useRef);
		* internal-only refs (thumbnail guard, bg texture) live here. Free-variable
		* reads became explicit hook args. Behavior is IDENTICAL.
		*/
		function useMotionMedia({ stage, upstreams, onSave, onWireSlot, runCompiledGeneration, toast, bodyGlb, setBodyGlbState, setBodyNotice, skin, setSkin, npz, setNpz, allVertsM, setAllVertsM, setError, setLoading, setFrameIdx, setPlaying, setEditMode, setKeptEdit, setEditedDeformedB64, threeCtxRef, npzUrl, bgImage, setBgImage, setBgDragOver }) {
			const setBodyGlb = (0, react.useCallback)((url) => {
				setBodyGlbState(url);
				setBodyNotice(null);
				onSave(url ? { [MOTION_PREVIEW_GLB_PARAM]: url } : { [MOTION_PREVIEW_GLB_PARAM]: "" });
			}, [
				onSave,
				setBodyGlbState,
				setBodyNotice
			]);
			const bodyBinding = (0, react.useMemo)(() => stage.inputBindings?.find((binding) => binding.slot === MOTION_PREVIEW_GLB_PARAM), [stage.inputBindings]);
			const bodySlotIdx = (0, react.useMemo)(() => {
				const slots = stage.inputSlots ?? [];
				const bindingIndex = bodyBinding === void 0 ? -1 : slots.indexOf(bodyBinding.slot);
				const declaredIndex = stage.params["preview_glb"] === void 0 ? -1 : slots.indexOf(MOTION_PREVIEW_GLB_PARAM);
				return Math.max(bindingIndex, declaredIndex);
			}, [
				bodyBinding,
				stage.inputSlots,
				stage.params
			]);
			const bodyWiredId = (0, react.useMemo)(() => {
				if (bodyBinding !== void 0) return "stage" in bodyBinding.source ? bodyBinding.source.stage : "";
				return bodySlotIdx >= 0 ? stage.inputs[bodySlotIdx] ?? "" : "";
			}, [
				bodyBinding,
				bodySlotIdx,
				stage.inputs
			]);
			const bodyWiredUpstream = bodyWiredId ? upstreams.find((u) => u.id === bodyWiredId) : void 0;
			const bodyWired = !!bodyWiredUpstream;
			const bodyWiredUrl = bodyWiredUpstream?.result ? [...Object.values(bodyWiredUpstream.result.artifacts ?? {}), ...bodyWiredUpstream.result.assetUrls].find((u) => typeof u === "string" && isModelUrl(u)) ?? null : null;
			const bodySrc = bodyWired ? bodyWiredUrl ?? "" : bodyGlb ?? "";
			const previewParam = stage.params?.[MOTION_PREVIEW_GLB_PARAM];
			(0, react.useEffect)(() => {
				const v = previewParam;
				setBodyGlbState(typeof v === "string" && v.length > 0 ? v : null);
				setBodyNotice(null);
			}, [
				stage.id,
				previewParam,
				setBodyGlbState,
				setBodyNotice
			]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				const abortController = new AbortController();
				setSkin(null);
				if (!bodySrc) {
					loadSomaSkin().then((s) => {
						if (!cancelled) setSkin(s);
					}).catch((e) => {
						if (!cancelled) setError(e instanceof Error ? e.message : /* v8 ignore next -- DOMException instanceof Error === true in happy-dom and the fetch lane wraps all else (probe 2026-09-19) */ "Failed to load skin");
					});
					return () => {
						cancelled = true;
						abortController.abort();
					};
				}
				loadGlbSkin(bodySrc).then((s) => {
					if (!cancelled) setSkin(s);
				}).catch(async (e) => {
					if (cancelled) return;
					if (e instanceof NotSomaxGlbError) {
						setBodyNotice(`Body isn't SOMAX-rigged — converting through the queue… (${e.message})`);
						try {
							const result = await runCompiledGeneration({
								flow: "body-to-somax",
								glb: bodySrc
							}, abortController.signal);
							const rigged = result.urls.find(_melite_card_base_client.isMeshUrl) ?? null;
							if (rigged === null) throw new Error(`body-to-somax run ${result.runId} produced no rigged GLB`);
							const converted = await loadGlbSkin(rigged);
							if (cancelled) return;
							setSkin(converted);
							setBodyNotice(null);
							toast("success", "Body converted to SOMAX rig — previewing your character.");
							return;
						} catch (conversionError) {
							if (cancelled) return;
							const detail = conversionError instanceof Error ? conversionError.message : String(conversionError);
							setBodyNotice(`auto-convert failed — ${detail}`);
							toast("error", `SOMAX conversion failed — ${detail}. Showing the neutral mannequin.`);
							loadSomaSkin().then((s) => {
								if (!cancelled) setSkin(s);
							}).catch((fallbackError) => {
								if (!cancelled) setError(fallbackError instanceof Error ? fallbackError.message : /* v8 ignore next -- DOMException instanceof Error === true (probe 2026-09-19) */ "Failed to load skin");
							});
							return;
						}
					}
					/* v8 ignore next 1 -- the branch above diverts every NotSomaxGlbError; DOMException instanceof Error === true in happy-dom and the fetch lane wraps all else (probe 2026-09-19) */
					const msg = e instanceof NotSomaxGlbError ? e.message : e instanceof Error ? e.message : "Failed to load character GLB";
					setBodyNotice(msg);
					toast("error", `Preview body not loaded — ${msg}. Showing the neutral mannequin.`);
					loadSomaSkin().then((s) => {
						if (!cancelled) setSkin(s);
					}).catch((fallbackError) => {
						if (!cancelled) setError(fallbackError instanceof Error ? fallbackError.message : /* v8 ignore next -- DOMException instanceof Error === true (probe 2026-09-19) */ "Failed to load skin");
					});
				});
				return () => {
					cancelled = true;
					abortController.abort();
				};
			}, [
				bodySrc,
				runCompiledGeneration,
				toast,
				setSkin,
				setError,
				setBodyNotice
			]);
			(0, react.useEffect)(() => {
				if (!npzUrl) {
					setNpz(null);
					setAllVertsM(null);
					setError(null);
					setLoading(false);
					setEditMode(false);
					setPlaying(false);
					setKeptEdit(null);
					setEditedDeformedB64(null);
					return;
				}
				let cancelled = false;
				setLoading(true);
				setError(null);
				(async () => {
					try {
						if (!skin) return;
						const [m, s] = await Promise.all([loadMotionNpz(npzUrl), Promise.resolve(skin)]);
						if (cancelled) return;
						setSkin(s);
						const stride0 = s.vertexCount * 3;
						const seedVerts = new Float32Array(m.T * stride0);
						deformFrame(m.globalRotMats.subarray(0, 693), m.posedJoints.subarray(0, 231), s, seedVerts.subarray(0, stride0));
						for (let i = 0; i < stride0; i++) seedVerts[i] *= 100;
						const f0 = seedVerts.subarray(0, stride0);
						for (let t = 1; t < m.T; t++) seedVerts.set(f0, t * stride0);
						setNpz(m);
						setFrameIdx(0);
						setPlaying(false);
						setKeptEdit(null);
						setEditedDeformedB64(null);
						setAllVertsM(seedVerts);
						const verts = await precomputeDeformedVertsChunked(m, s, true);
						if (cancelled) return;
						setAllVertsM(verts);
						setPlaying(true);
					} catch (e) {
						if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load motion");
					} finally {
						if (!cancelled) setLoading(false);
					}
				})();
				return () => {
					cancelled = true;
				};
			}, [
				npzUrl,
				skin,
				setNpz,
				setAllVertsM,
				setError,
				setLoading,
				setFrameIdx,
				setPlaying,
				setEditMode,
				setKeptEdit,
				setEditedDeformedB64,
				setSkin
			]);
			(0, react.useEffect)(() => {
				if (!npz) return;
				const onKey = (e) => {
					const el = e.target;
					if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el?.isContentEditable) return;
					if (e.code === "Space") {
						e.preventDefault();
						setPlaying((p) => !p);
					}
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [npz, setPlaying]);
			const setThumb = useMotionImageStore((s) => s.setImage);
			const thumbCapturedForUrl = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!npzUrl || !npz || !allVertsM) return;
				if (thumbCapturedForUrl.current === npzUrl) return;
				let idleId = 0;
				idleId = requestIdleCallback(() => {
					const ctx = threeCtxRef.current;
					if (!ctx) return;
					try {
						ctx.gl.render(ctx.scene, ctx.camera);
						ctx.gl.domElement.toBlob((blob) => {
							if (!blob || blob.size < 100) return;
							(0, _melite_card_base_client.readAsDataURL)(blob).then((url) => {
								if (url.length > 100) {
									thumbCapturedForUrl.current = npzUrl;
									setThumb(stage.id, url);
								}
							}).catch(() => {});
						}, "image/png");
					} catch {}
				}, { timeout: 2e3 });
				return () => cancelIdleCallback(idleId);
			}, [
				npz,
				allVertsM,
				npzUrl,
				stage.id,
				setThumb,
				threeCtxRef
			]);
			const setBg = (0, react.useCallback)((url) => {
				setBgImage(url);
				onSave(url ? { [MOTION_BG_IMAGE_PARAM]: url } : { [MOTION_BG_IMAGE_PARAM]: "" });
			}, [onSave, setBgImage]);
			const bgParam = stage.params?.[MOTION_BG_IMAGE_PARAM];
			(0, react.useEffect)(() => {
				const v = bgParam;
				setBgImage(typeof v === "string" && v.length > 0 ? v : null);
			}, [
				stage.id,
				bgParam,
				setBgImage
			]);
			const handleBgFile = (0, react.useCallback)((file) => {
				(0, _melite_card_base_client.readAsDataURL)(file).then(setBg);
			}, [setBg]);
			const attachBody = (0, react.useCallback)((url) => {
				if (url) onWireSlot?.(MOTION_PREVIEW_GLB_PARAM, null, null);
				setBodyGlb(url);
			}, [onWireSlot, setBodyGlb]);
			const handleStageDrop = (0, react.useCallback)((e) => {
				e.preventDefault();
				setBgDragOver(false);
				const asset = (0, _melite_card_base_client.parseAssetDrop)(e.dataTransfer.getData(_melite_card_base_client.ASSET_DRAG_MIME));
				if (asset.url !== void 0) {
					if ((0, _melite_card_base_client.isMeshUrl)(asset.url)) attachBody(asset.url);
					else setBg(asset.url);
					return;
				}
				const file = e.dataTransfer.files?.[0];
				if (!file) return;
				if (isModelUrl(file.name) || file.type === "model/gltf-binary") {
					(0, _melite_card_base_client.readAsDataURL)(file).then(attachBody);
					return;
				}
				handleBgFile(file);
			}, [
				setBg,
				handleBgFile,
				attachBody,
				setBgDragOver
			]);
			const handleBodyFile = (0, react.useCallback)((file) => {
				if (!isModelUrl(file.name) && file.type !== "model/gltf-binary") {
					toast("error", "Preview body must be a .glb or .gltf (SOMAX-rigged character).");
					return;
				}
				(0, _melite_card_base_client.readAsDataURL)(file).then(attachBody).catch((err) => toast("error", `Could not read GLB: ${err instanceof Error ? err.message : String(err)}`));
			}, [attachBody, toast]);
			const priorStages = upstreams;
			const bgTexRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const ctx = threeCtxRef.current;
				if (!ctx) return;
				if (bgTexRef.current) {
					bgTexRef.current.dispose();
					bgTexRef.current = null;
				}
				if (bgImage) {
					const tex = new _melite_three_client_client.TextureLoader().load(bgImage);
					tex.colorSpace = _melite_three_client_client.SRGBColorSpace;
					bgTexRef.current = tex;
					ctx.scene.background = tex;
				} else ctx.scene.background = new _melite_three_client_client.Color(_melite_card_base_client.STAGE_BACKGROUND_DARK);
			}, [
				bgImage,
				npzUrl,
				allVertsM,
				threeCtxRef
			]);
			return {
				setBodyGlb,
				bodySlotIdx,
				bodyWiredId,
				bodyWiredUpstream,
				bodyWired,
				bodyWiredUrl,
				bodySrc,
				attachBody,
				handleBodyFile,
				priorStages,
				setBg,
				handleBgFile,
				handleStageDrop
			};
		}
		//#endregion
		//#region src/ui/studio/usePoseEditing.ts
		/**
		* usePoseEditing — the edit-mode (Phase B) verbs + live reskin moved
		* verbatim from `component.tsx` (MotionCardEditor lines ~844–1037,
		* minus discardKeptEdit/stampConstraintAtFrame which live in useMotionStage).
		*
		* Owns no primitive state (the remnant orchestrates all useState/useRef);
		* it owns the memos, verbs, and the client-side re-skin effect.
		* Free-variable reads became explicit hook args. The live-bind joint edit
		* rides the constraints commit door (one-truth rework, 2026-11-05).
		*/
		function usePoseEditing({ effectiveNpz, frameIdx, tlKeyframes: _tlKeyframes, constraintPayloads, keptEdit, currentJointsM, fullbodyKfAtFrame, pushUndo, toast, skin, onSave, editMode, setEditMode, editableJoints, setEditableJoints, editableJointsRef, setSelectedJoint, setEditedDeformedB64, reposing: _reposing, setReposing, setKeptEdit, setPlaying, commitConstraints }) {
			const toggleEdit = () => {
				/* v8 ignore next 1 -- Refine is disabled exactly when currentJointsM is null (probe 2026-09-19) */
				if (!currentJointsM) return;
				if (editMode) {
					setKeptEdit(editableJoints ? {
						joints: editableJoints,
						frame: frameIdx
					} : null);
					setEditMode(false);
					setSelectedJoint(null);
				} else {
					pushUndo();
					const fromKept = keptEdit && keptEdit.frame === frameIdx ? keptEdit.joints : null;
					const stampedPayload = fullbodyKfAtFrame ? constraintPayloads[fullbodyKfAtFrame.uuid] : null;
					const baseM = stampedPayload && stampedPayload.kind === "fullbody" ? decodeF32(stampedPayload.jp) : currentJointsM;
					const next = fromKept ? fromKept : jointsToCm(baseM);
					editableJointsRef.current = next;
					setEditableJoints(next);
					setSelectedJoint(null);
					setEditMode(true);
					setPlaying(false);
				}
			};
			const handleJointMove = (0, react.useCallback)((e) => {
				const prev = editableJointsRef.current;
				if (!prev) return;
				const next = e.fullJoints ? e.fullJoints : prev.slice();
				if (!e.fullJoints) {
					next[e.idx * 3] = e.position.x;
					next[e.idx * 3 + 1] = e.position.y;
					next[e.idx * 3 + 2] = e.position.z;
				}
				editableJointsRef.current = next;
				setEditableJoints(next);
				const src = effectiveNpz;
				const kf = fullbodyKfAtFrame;
				if (!src || !kf) return;
				const editedM = jointsFromCm(next);
				const payload = stampEditedPose(editedM, patchFrame(src.posedJoints, src.globalRotMats, editedM, frameIdx).globalRotMats.subarray(frameIdx * 77 * 9, (frameIdx + 1) * 77 * 9), frameIdx, src.T);
				commitConstraints((doc) => ({
					...doc,
					payloads: {
						...doc.payloads,
						[kf.uuid]: payload
					}
				}));
			}, [
				effectiveNpz,
				fullbodyKfAtFrame,
				frameIdx,
				editableJointsRef,
				setEditableJoints,
				commitConstraints
			]);
			usePoseReskinEffect({
				skin,
				effectiveNpz,
				editMode,
				editableJoints,
				keptEdit,
				frameIdx,
				setEditedDeformedB64
			});
			return {
				toggleEdit,
				handleJointMove,
				displayJointsM: (0, react.useMemo)(() => {
					if (editMode && editableJoints) return jointsFromCm(editableJoints);
					if (keptEdit && keptEdit.frame === frameIdx) return jointsFromCm(keptEdit.joints);
					return currentJointsM;
				}, [
					editMode,
					editableJoints,
					keptEdit,
					frameIdx,
					currentJointsM
				]),
				handleRepose: (0, react.useCallback)(async () => {
					if (!effectiveNpz || !editableJoints || !editMode) return;
					setReposing(true);
					try {
						const editedM = jointsFromCm(editableJoints);
						const patched = patchFrame(effectiveNpz.posedJoints, effectiveNpz.globalRotMats, editedM, frameIdx);
						const T = frameIdx + 1;
						onSave({ prev_motion_artifact: npzToDataUrl(await writeNpz({
							posed_joints: {
								data: patched.posedJoints.subarray(0, T * 77 * 3),
								shape: [
									T,
									77,
									3
								]
							},
							global_rot_mats: {
								data: patched.globalRotMats.subarray(0, T * 77 * 9),
								shape: [
									T,
									77,
									3,
									3
								]
							},
							fps: { data: new Float32Array([effectiveNpz.fps]) }
						})) });
						toast("success", `Reposed from edited pose at frame ${frameIdx + 1}. Hit Run to generate.`);
					} catch (e) {
						toast("error", `Repose failed: ${e.message}`);
					} finally {
						setReposing(false);
					}
				}, [
					effectiveNpz,
					editableJoints,
					editMode,
					frameIdx,
					onSave,
					toast,
					setReposing
				])
			};
		}
		/** The re-skin effect, split for readability — same deps + body as inline. */
		function usePoseReskinEffect({ skin, effectiveNpz, editMode, editableJoints, keptEdit, frameIdx, setEditedDeformedB64 }) {
			(0, react.useEffect)(() => {
				if (!skin || !effectiveNpz) return;
				const active = editMode ? editableJoints : keptEdit && keptEdit.frame === frameIdx ? keptEdit.joints : null;
				if (!active) {
					setEditedDeformedB64(null);
					return;
				}
				const fi = Math.min(frameIdx, effectiveNpz.T - 1);
				const editedM = jointsFromCm(active);
				const patched = patchFrame(effectiveNpz.posedJoints, effectiveNpz.globalRotMats, editedM, fi);
				const out = new Float32Array(skin.vertexCount * 3);
				deformFrame(patched.globalRotMats.subarray(fi * 77 * 9, (fi + 1) * 77 * 9), editedM, skin, out);
				setEditedDeformedB64(vertsToB64(out, true));
			}, [
				editableJoints,
				editMode,
				keptEdit,
				skin,
				effectiveNpz,
				frameIdx,
				setEditedDeformedB64
			]);
		}
		//#endregion
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
		//#region ../../web-kit/timeline/src/timeline/motionTimelineState.ts
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
		/** UUID for locally-added keyframes/prompts/intervals. */
		function makeTimelineId() {
			const c = typeof crypto !== "undefined" ? crypto : void 0;
			if (c && "randomUUID" in c) return c.randomUUID();
			return "tl-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarLayout.ts
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
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarScale.ts
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
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarDrag.ts
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
			const grabPlayhead = (e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				dragRef.current = {
					kind: "scrub",
					startX: e.clientX,
					moved: false
				};
				onScrubStart?.();
			};
			return {
				dragId,
				dragRef,
				suppressClickRef,
				lastPromptRef,
				firstPromptRef,
				promptsRef,
				startDrag,
				grabPlayhead
			};
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/icons.tsx
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
		function Mic({ className, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base$1("mic", className),
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
				...base$1("zap", className),
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })
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
		//#region \0dsh-css:packages/web-kit/timeline/src/timeline/timeline.module.css.mjs
		const css$1 = ".t2WLSa_root{user-select:none;display:flex}.t2WLSa_gutter{border-right:1px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;display:flex}.t2WLSa_zoomRow{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:center;align-items:center;gap:2px;display:flex}.t2WLSa_zoomBtn{width:20px;height:20px;color:var(--dsw-alias-label-secondary);font-size:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;line-height:1;display:inline-flex}.t2WLSa_zoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary)}.t2WLSa_zoomBtn svg{width:14px;height:14px}.t2WLSa_zoomPct{min-width:32px;height:auto;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;cursor:pointer;background:0 0;border:none;border-radius:4px;padding:0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px}.t2WLSa_zoomPct:hover{color:var(--dsw-alias-brand-primary)}.t2WLSa_laneHeadShell{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_laneHeadShell:last-child{border-bottom:0}.t2WLSa_laneHeadShell>svg{width:14px;height:14px;color:var(--dsw-alias-brand-primary);flex:none}.t2WLSa_laneHeadShell[data-lane-head=audio]>svg{width:12px;height:12px;color:var(--dsw-alias-state-business-primary)}.t2WLSa_gutterLabel{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.t2WLSa_detachBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-left:auto;padding:0;display:inline-flex}.t2WLSa_detachBtn:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_detachBtn svg{width:10px;height:10px}.t2WLSa_uploadBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.t2WLSa_uploadBtn:hover{background:color-mix(in srgb, var(--dsw-alias-label-tertiary) 14%, transparent);color:var(--dsw-alias-label-primary)}.t2WLSa_uploadBtn svg{width:10px;height:10px}.t2WLSa_laneDot{border-radius:9999px;flex:none;width:6px;height:6px}.t2WLSa_contentWrap{flex:1;min-width:0;position:relative}.t2WLSa_scroller{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;height:100%;overflow:auto hidden}.t2WLSa_scroller::-webkit-scrollbar{height:8px}.t2WLSa_scroller::-webkit-scrollbar-track{background:0 0}.t2WLSa_scroller::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}.t2WLSa_content{position:relative}.t2WLSa_ruler{border-bottom:1px solid var(--dsw-alias-border-l2);position:relative}.t2WLSa_tick{position:absolute;top:0;bottom:0}.t2WLSa_tickLine{background:var(--dsw-alias-border-l2);width:1px;height:100%}.t2WLSa_tickLabel{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;position:absolute;top:2px;left:4px}.t2WLSa_timecode{z-index:10;font-variant-numeric:tabular-nums;height:100%;color:var(--dsw-alias-brand-primary);align-items:center;padding-left:6px;padding-right:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;display:flex;position:sticky;left:0}.t2WLSa_promptsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_canAdd{cursor:copy}.t2WLSa_emptyCenter{justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.t2WLSa_emptyHint{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_promptClip{touch-action:none;cursor:grab;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_promptClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_clipSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);border-width:0}.t2WLSa_clipSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_clipMoving{z-index:30;cursor:grabbing;border:1px solid var(--dsw-alias-brand-primary);box-shadow:0 20px 25px -5px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 8px 10px -6px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent)}.t2WLSa_edgeL{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:0;bottom:0;left:0}.t2WLSa_edgeL:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeDead{cursor:default;opacity:.35}.t2WLSa_edgeDead:hover{background:0 0}.t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_promptClip:hover .t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_seamDot{z-index:35;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:0;transform:translate(-50%,-50%)}.t2WLSa_edgeR{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:16px;bottom:0;right:0}.t2WLSa_edgeR:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeWide{width:16px}.t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent)}.t2WLSa_clipEditor{background:color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);height:24px;box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);pointer-events:auto;border:none;border-radius:4px;align-items:center;padding:0 6px;display:inline-flex;position:absolute;top:50%;left:8px;right:8px;transform:translateY(-50%)}.t2WLSa_clipEditor input{width:100%;min-width:0;height:100%;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;padding:0;font-size:11px;line-height:1.5}.t2WLSa_clipEditor input::placeholder{color:var(--dsw-alias-label-tertiary)}.t2WLSa_previewWrap{z-index:10;pointer-events:none;position:absolute;inset:0;overflow:hidden}.t2WLSa_previewVideo{object-fit:cover;opacity:.6;width:100%;height:100%;position:absolute;inset:0}.t2WLSa_scrim{background:linear-gradient(to top, color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent), color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent) 50%, color-mix(in srgb, var(--dsw-alias-bg-base) 10%, transparent));position:absolute;inset:0}.t2WLSa_clipTextCol{z-index:20;flex-direction:column;gap:2px;padding:0 12px 6px;display:flex;position:absolute;bottom:0;left:0;right:0}.t2WLSa_clipTextStack{z-index:10;pointer-events:none;flex-direction:column;justify-content:center;gap:2px;padding:0 12px;display:flex;position:absolute;inset:0}.t2WLSa_clipTitle{text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500;overflow:hidden}.t2WLSa_clipEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_clipDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_knobDot{z-index:20;background:var(--dsw-alias-brand-primary);width:6px;height:6px;box-shadow:0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);pointer-events:none;border-radius:9999px;position:absolute;top:4px;right:6px}.t2WLSa_refAudioBadge{z-index:20;width:10px;height:10px;color:var(--dsw-alias-state-business-primary);pointer-events:none;position:absolute;top:12px;right:4px}.t2WLSa_refBadge{z-index:20;pointer-events:none;align-items:center;gap:1px;display:flex;position:absolute;top:22px;right:2px}.t2WLSa_refBadge svg{width:8px;height:8px;color:var(--dsw-alias-state-success-primary)}.t2WLSa_refCount{color:var(--dsw-alias-state-success-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;line-height:1}.t2WLSa_promptDelete{z-index:40;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:inline-flex;position:absolute;top:4px;right:4px}.t2WLSa_promptDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_promptClip:hover .t2WLSa_promptDelete{opacity:1}.t2WLSa_promptDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_beatsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_beatsAdd{cursor:crosshair}.t2WLSa_beatsEmpty{align-items:center;padding-left:12px;display:flex;position:absolute;inset:0}.t2WLSa_hintLine{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_beatClip{border:1px solid var(--dsw-alias-border-l2);cursor:pointer;border-radius:6px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_beatClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_beatSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent)}.t2WLSa_beatSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_beatLabel{color:var(--dsw-alias-label-secondary);pointer-events:none;align-items:center;padding:0 6px;font-size:10px;line-height:1.25;display:flex;position:absolute;inset:0}.t2WLSa_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.t2WLSa_beatEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_audioLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_audioClip{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);cursor:grab;touch-action:none;border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_audioClip:active{cursor:grabbing}.t2WLSa_audioCard{border-radius:6px;top:3px;bottom:3px}.t2WLSa_audioCardIcon{pointer-events:none;display:flex;position:absolute;top:50%;left:5px;transform:translateY(-50%)}.t2WLSa_audioCardIcon svg{width:13px;height:13px}.t2WLSa_audioCard .t2WLSa_audioClipLabel{flex-direction:column;justify-content:center;align-items:flex-start;gap:1px;font-size:10px;display:flex;left:23px;right:4px}.t2WLSa_audioCard .t2WLSa_audioTime{margin-left:0}.t2WLSa_gainFill{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;position:absolute;bottom:0;left:0;right:0}.t2WLSa_audioClipLabel{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));pointer-events:none;align-items:center;padding:0 4px;font-size:9px;line-height:1;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioName{text-overflow:ellipsis;white-space:nowrap;font-weight:500;overflow:hidden}.t2WLSa_audioTime{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, var(--dsw-alias-label-tertiary));flex:none;margin-left:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.t2WLSa_audioClipDelete{background:color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);width:14px;height:14px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:0 0 0 4px;justify-content:center;align-items:center;padding:0;display:none;position:absolute;top:0;right:0}.t2WLSa_audioClipDelete:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_audioClip:hover .t2WLSa_audioClipDelete{display:flex}.t2WLSa_audioClipDelete svg{width:8px;height:8px}.t2WLSa_audioSlice{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_sliceLabel{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-secondary));pointer-events:none;justify-content:center;align-items:center;padding:0 4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioDrop{border:1px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.t2WLSa_dropHint{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);padding:0 8px;font-size:9px;overflow:hidden}.t2WLSa_kfLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_kfLane:last-child{border-bottom:0}.t2WLSa_kfLane[data-kf-cards=true]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 3%, transparent)}.t2WLSa_kfDropWell{border:1px dashed color-mix(in srgb, var(--dsw-alias-label-tertiary) 25%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.t2WLSa_kfWrap{position:absolute;top:0;bottom:0}.t2WLSa_kfBtn{cursor:grab;background:0 0;border:none;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:flex;position:absolute;top:50%;left:0;transform:translate(-50%,-50%)}.t2WLSa_kfBtn:active{cursor:grabbing;transform:translate(-50%)}.t2WLSa_kfDiamond{width:10px;height:10px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4);border:1px solid;display:block;transform:rotate(45deg)}.t2WLSa_kfMoving{transform:rotate(45deg)scale(1.25)}.t2WLSa_kfDelete{z-index:10;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:14px;height:14px;padding:0;display:inline-flex;position:absolute;top:0;left:6px}.t2WLSa_kfDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_kfWrap:hover .t2WLSa_kfDelete{opacity:1}.t2WLSa_kfDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_playhead{z-index:40;pointer-events:auto;position:absolute;top:0;bottom:0}.t2WLSa_playheadCap{border:1px solid var(--dsw-alias-border-l4);pointer-events:auto;cursor:grab;touch-action:none;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:50%;transform:translate(-50%)}.t2WLSa_playheadCap:active{cursor:grabbing}.t2WLSa_playheadCap:before{content:\"\";border-radius:9999px;position:absolute;inset:-5px}.t2WLSa_miniBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);width:20px;height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;font-size:13px;line-height:1;display:inline-flex}.t2WLSa_miniBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_miniFitBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0 6px;font-size:10px;font-weight:600;display:inline-flex}.t2WLSa_miniFitBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_scrubBar{align-items:center;gap:8px;width:100%;display:flex}.t2WLSa_scrubToggle{cursor:pointer;background:0 0;border:none;flex:none;padding:4px 2px;font-size:11px;line-height:1}.t2WLSa_scrubTrack{cursor:pointer;touch-action:none;flex:1;min-width:0;height:18px;position:relative}.t2WLSa_scrubFill{background:var(--dsw-alias-interactive-bg-active);border-radius:2px;height:4px;position:absolute;top:7px;left:0}.t2WLSa_scrubHead{background:var(--dsw-alias-label-primary);border-radius:1px;width:2px;height:10px;margin-left:-1px;position:absolute;top:4px}.t2WLSa_scrubReadout{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;font-size:11px}.t2WLSa_commissionHead{align-items:center;gap:6px;padding:0 8px;display:flex;overflow:hidden}.t2WLSa_commissionKind{letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;text-overflow:ellipsis;font-size:10px;font-weight:600;overflow:hidden}.t2WLSa_commissionLane{width:100%;position:relative}.t2WLSa_commissionSpan{border-left:3px solid var(--dsw-alias-brand-primary);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);border-radius:4px;align-items:center;gap:4px;padding:0 6px;display:flex;position:absolute;top:3px;bottom:3px;left:0;overflow:hidden}.t2WLSa_commissionWindows .t2WLSa_commissionSegment{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);border-radius:3px;flex:1 1 0;min-width:0;padding:1px 4px}.t2WLSa_commissionSegment{color:var(--dsw-alias-label-secondary);white-space:nowrap;text-overflow:ellipsis;font-variant-numeric:tabular-nums;font-size:10px;line-height:1.5;overflow:hidden}";
		const tagId$1 = "@melite/motion-motion/timeline.module.css@4f42746b";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/motion-motion";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var timeline_module_css_default = {
			"audioCard": "t2WLSa_audioCard",
			"audioCardIcon": "t2WLSa_audioCardIcon",
			"audioClip": "t2WLSa_audioClip",
			"audioClipDelete": "t2WLSa_audioClipDelete",
			"audioClipLabel": "t2WLSa_audioClipLabel",
			"audioDrop": "t2WLSa_audioDrop",
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
			"commissionHead": "t2WLSa_commissionHead",
			"commissionKind": "t2WLSa_commissionKind",
			"commissionLane": "t2WLSa_commissionLane",
			"commissionSegment": "t2WLSa_commissionSegment",
			"commissionSpan": "t2WLSa_commissionSpan",
			"commissionWindows": "t2WLSa_commissionWindows",
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
			"hintLine": "t2WLSa_hintLine",
			"kfBtn": "t2WLSa_kfBtn",
			"kfDelete": "t2WLSa_kfDelete",
			"kfDiamond": "t2WLSa_kfDiamond",
			"kfDropWell": "t2WLSa_kfDropWell",
			"kfLane": "t2WLSa_kfLane",
			"kfMoving": "t2WLSa_kfMoving",
			"kfWrap": "t2WLSa_kfWrap",
			"knobDot": "t2WLSa_knobDot",
			"laneDot": "t2WLSa_laneDot",
			"laneHeadShell": "t2WLSa_laneHeadShell",
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
		//#region ../../web-kit/timeline/src/timelineCopy.ts
		/**
		* timelineCopy.ts — THE TIMELINE KIT COPY DICTIONARY (the copy-scope
		* extension, 2026-11-05). Client UI copy is locale-owned (the estate's
		* decision, the DSH verify-client-ui-i18n law): presentation code owns
		* no copy literals; it consumes them here through the typed seat. A
		* second locale plugs into this dictionary without touching a single
		* timeline component.
		*
		* THE BOUND: static user-visible FACES of the melite-authored
		* components live here (lane heads, zoom aria names, clip and keyframe
		* labels, empty/hint states, the scrub bar's transport copy).
		* Parameterized sentences whose shape is fixed but whose slots are live
		* live here as typed dict functions (the square.ts pattern) — the site
		* passes exactly the params the entry declares. Two exclusions carry
		* the estate's documented bounds: `tip=` hover help is not a census
		* seat and stays at the site (the motionCopy bound), and the vendored
		* `viser-timeline/` subtree is NVIDIA upstream kept pull-diff-clean —
		* its remaining rendered faces (the canvas seconds unit, the "(Empty)"
		* placeholder) are upstream's, argued at the copy wall's pin, never
		* this dictionary's. (F2, 2026-11-05: the zoom cluster re-homed out of
		* the vendored dir to `TimelineScrollbar.tsx`; its copy joined this
		* dictionary — `zoomFitTip`/`zoomFitLabel` beside the aria names.)
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const timelineCopy = {
			/** A new audio track's fallback label (F-B4, the 2026-11-05 timeline
			*  nativity audit: melite-authored copy planted outside the dict at
			*  store/timelineAudio.ts — the pin's own admitted debt seat). */
			audioTrackFallback: (n) => `Audio ${n}`,
			/** The prompts lane's gutter head (the bar's default label). */
			lanePrompts: "Prompts",
			/** The beats lane's gutter head (the bar's default label). */
			laneBeats: "Beats",
			/** A chapter marker's auto label when the caller names none. */
			markerAutoLabel: (p) => `Marker ${p.index}`,
			/** The keyframe lanes' empty hint (the bar's default). */
			laneHintDefault: "Double-click a lane to pin a pose constraint at the playhead",
			/** The prompts lane's empty hint (the bar's default). */
			emptyPromptsHint: "No prompt cards — the Add button carves one",
			/** The beats lane's empty hint (the bar's default). */
			beatsHintDefault: "double-click to add a beat — prompt segments join into the call's one prompt",
			/** The zoom-out button's accessible name. */
			zoomOutAria: "Zoom out",
			/** The zoom-in button's accessible name. */
			zoomInAria: "Zoom in",
			/** The fit-to-window button's hover title + accessible name. */
			zoomFitTip: "Fit to window (reset zoom)",
			/** The fit-to-window button's rendered glyph text. */
			zoomFitLabel: "fit",
			/** A stem-carrying layer's hover title (the bed-under-every-cut law). */
			audioBedTitle: (p) => `${p.stem} — one bed under every cut; each window hears its own slice in time`,
			/** A layer head's hover title before a stem is wired. */
			audioDropTitle: "drop an audio / music track — sliced to each window in time",
			/** The add door's accessible name for one layer. */
			addClipAria: (p) => `Add ${p.label} clip`,
			/** The add door's hover title for one layer. */
			addClipTitle: (p) => `Add a ${p.label} clip — from flow, from media, or from file`,
			/** (2026-11-06, the lane-add parity law) a track head's add door —
			*  accessible name. `track` is the lane's own gutter name. */
			addTrackAria: (p) => `Add ${p.track} pin`,
			/** (2026-11-06, the lane-add parity law) a track head's add door —
			*  hover title (the same three-entry source grammar the audio
			*  heads ride). */
			addTrackTitle: (p) => `Add a ${p.track} pin — from flow, from media, or from file`,
			/** The detach button's accessible name for one layer. */
			detachAria: (p) => `Detach ${p.label}`,
			/** The ruler tick's second-suffixed label. */
			tickSeconds: (p) => `${p.value}s`,
			/** A first clip's dead left-edge hover title (the frame-0 wall). */
			firstCallTitle: "First call — nothing before it to trim into",
			/** The extend-seam dot's hover title. */
			seamExtendTitle: "extend — latent tail carries across this seam",
			/** The clip editor's placeholder. */
			promptPlaceholder: "Enter prompt…",
			/** A clip's face when its prompt text is empty. */
			emptyClip: "(empty)",
			/** A clip's duration chip ("2.4s"). */
			clipSeconds: (p) => `${p.seconds}s`,
			/** The knob-override dot's hover title. */
			knobOverrideTitle: "This call overrides run knobs (per-call)",
			/** The reference-image badge's hover title (singular/plural). */
			refImagesTitle: (p) => `${p.count} reference image${p.count === 1 ? "" : "s"} (guide + extras)`,
			/** The clip delete button's accessible name. */
			deletePromptCardAria: "Delete this prompt card",
			/** An audio clip's hover title (name · window · gain — drag law). */
			audioClipTitle: (p) => `${p.name} · ${p.start}–${p.end}s${p.gain !== null ? ` · gain ${p.gain}` : ""} — drag to move`,
			/** The audio clip delete button's accessible name. */
			deleteClipAria: (p) => `Delete ${p.name}`,
			/** A stem slice's hover title (which call hears which window). */
			audioSliceTitle: (p) => `call #${p.call} · window hears bed ${p.start}–${p.end}s`,
			/** A stem slice's rendered range ("1.0–3.5s"). */
			sliceRange: (p) => `${p.start}–${p.end}s`,
			/** The empty audio lane's drop hint. */
			audioDropHint: "drop or upload audio — clips land where you drop them, drag to move",
			/** A keyframe pin's accessible name. */
			keyframeAria: (p) => `${p.track} keyframe at frame ${p.frame}`,
			/** (SD-8 lane parity, 2026-11-08) the kf head row's hover voice —
			*  the audio heads carry bed/drop titles; the kf head names its own
			*  pin verb. */
			kfLaneTitle: (p) => `Double-click the lane to pin a ${p.track} constraint at the playhead`,
			/** A keyframe delete button's accessible name. */
			deleteKeyframeAria: (p) => `Delete ${p.track} keyframe at frame ${p.frame}`,
			/** The toggle's accessible name while playing. */
			scrubPauseAria: "Pause",
			/** The toggle's accessible name while paused. */
			scrubPlayAria: "Play",
			/** The scrub track's accessible name. */
			scrubAria: "Timeline scrub",
			/** The track's value text ("1.2s of 9.8s"). */
			scrubValuetext: (p) => `${p.current} of ${p.duration}`,
			/** The readout's frame column (" · frame 24/96"). */
			scrubFramesSuffix: (p) => ` · frame ${p.frame}/${p.total}`,
			/** The sub-minute second unit ("5.2s"). */
			secondsUnit: "s"
		};
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/LaneHead.tsx
		/**
		* LaneHead — THE ONE LANE HEAD SHELL (SD-8 lane parity, operator item
		* c 2026-11-08: the keyframes bar's format was "not shared with the
		* audio sort of bar"). The gutter's four bespoke head grammars
		* (.laneHead / .laneHeadBeats / .audioHead / .laneRow) collapse into
		* this one anatomy: a glyph-or-dot slot, a label, an accent tint, a
		* title voice, and door/detach slots — every gutter head renders
		* through it, so no bespoke grammar can grow back. The heights stay
		* tenant-derived (the head takes the SAME number the lane body takes;
		* the height-mirror arm pins the pairing).
		*/
		/** One head, one grammar (SD-8). */
		function LaneHead(props) {
			const { variant, glyph, dotColor, label, accent, height, title, iconAttr, door, detach, rowId } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(timeline_module_css_default.laneHeadShell),
				"data-lane-head": variant,
				"data-lane-head-id": rowId,
				"data-audio-icon": iconAttr,
				style: {
					height,
					...accent ? { color: accent } : {}
				},
				title,
				children: [
					glyph,
					dotColor && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: timeline_module_css_default.laneDot,
						"data-lane-dot": variant,
						style: { background: dotColor },
						"aria-hidden": true
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: timeline_module_css_default.gutterLabel,
						children: label
					}),
					door,
					detach
				]
			});
		}
		/** One commission row's BODY: the span (or the N window segments) the
		*  commission covers, drawn in bar space.
		*  @param props.row the commission
		*  @param props.frameToPx the bar's own frame→pixel scale
		*  @param props.totalFrames the doc's length (the single-span width)
		*/
		function CommissionLane(props) {
			const { row, frameToPx, totalFrames } = props;
			const segments = row.segments !== void 0 && row.segments.length > 0 ? row.segments : [row.detail ?? row.label];
			const width = Math.max(2, frameToPx(totalFrames) - frameToPx(0));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: timeline_module_css_default.commissionLane,
				"data-commission-lane": row.id,
				style: { height: 30 },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: clsx(timeline_module_css_default.commissionSpan, segments.length > 1 && timeline_module_css_default.commissionWindows),
					style: {
						width,
						...row.accent ? { borderLeftColor: row.accent } : {}
					},
					children: segments.map((segment, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: timeline_module_css_default.commissionSegment,
						"data-commission-segment": `${row.id}-${String(i)}`,
						children: segment
					}, `${row.id}-${String(i)}`))
				})
			});
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarChrome.tsx
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
			const { scale, scrollRef, frameIdx, promptsHeight, promptsLabel, beats, beatsLabel, beatsHeight, audioLayers, onAudioDetach, tracks, audioClipCards, onTrackAdd, kfLaneCards, commissions } = props;
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
									"aria-label": timelineCopy.zoomOutAria,
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
									"aria-label": timelineCopy.zoomInAria,
									className: timeline_module_css_default.zoomBtn,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZoomIn, {})
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LaneHead, {
						variant: "prompts",
						glyph: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Film, { "aria-hidden": true }),
						label: promptsLabel,
						height: promptsHeight
					}),
					commissions?.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LaneHead, {
						variant: "commission",
						rowId: row.id,
						glyph: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Film, { "aria-hidden": true }),
						label: row.label,
						accent: row.accent,
						height: 30,
						title: row.title
					}, row.id)),
					beats && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LaneHead, {
						variant: "beats",
						glyph: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListMusic, { "aria-hidden": true }),
						label: beatsLabel,
						height: beatsHeight
					}),
					audioLayers?.map((L) => {
						const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LaneHead, {
							variant: "audio",
							iconAttr: L.icon ?? "music",
							glyph: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { "aria-hidden": true }),
							label: L.label,
							accent: L.accent,
							height: audioClipCards ? 44 : 26,
							title: L.stem ? timelineCopy.audioBedTitle({ stem: L.stem }) : timelineCopy.audioDropTitle,
							door: L.onUpload && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								"data-audio-upload": L.id,
								"aria-label": timelineCopy.addClipAria({ label: L.label }),
								title: timelineCopy.addClipTitle({ label: L.label }),
								className: timeline_module_css_default.uploadBtn,
								onClick: (e) => {
									L.onUpload?.(e.currentTarget);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Upload, { "aria-hidden": true })
							}),
							detach: (L.stem || (L.clips?.length ?? 0) > 0) && onAudioDetach && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => onAudioDetach(L.id),
								"aria-label": timelineCopy.detachAria({ label: L.label }),
								className: timeline_module_css_default.detachBtn,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
							})
						}, L.id);
					}),
					tracks.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LaneHead, {
						variant: "kf",
						dotColor: rgb(t.color ?? [
							176,
							180,
							186
						]),
						label: t.name,
						height: kfLaneCards ? 44 : 24,
						title: timelineCopy.kfLaneTitle({ track: t.name }),
						door: onTrackAdd && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							size: "sm",
							"data-track-upload": t.uuid,
							"aria-label": timelineCopy.addTrackAria({ track: t.name }),
							title: timelineCopy.addTrackTitle({ track: t.name }),
							className: timeline_module_css_default.uploadBtn,
							onClick: (e) => {
								onTrackAdd?.(t.uuid, e.currentTarget);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Upload, { "aria-hidden": true })
						})
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
		/** The ruler: ticks + sticky timecode. NOT a scrub surface (operator
		*  2026-11: the scrub gesture belongs to the playhead CAP alone — the
		*  white circle at the top of the line — never the bar's middle); its
		*  gestures are the double-click ADD (bar line 947) and the
		*  single-click SEEK (P6: a click on the time line moves the playhead —
		*  a jump, never a drag — or faces why not). */
		function TimelineRuler(props) {
			const { ticks, stepSec, fps, frameIdx, barBg, frameToPx, frameAt, onPromptAdd, onSeekFrame } = props;
			const [clickVoice, setClickVoice] = (0, react.useState)("");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
				fill: true,
				tip: onPromptAdd ? "Drag the playhead cap to scrub — double-click here to add a call at that frame" : "Drag the playhead cap to scrub",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-testid": "motion-timeline-ruler",
					className: timeline_module_css_default.ruler,
					style: { height: 28 },
					onClick: (e) => {
						const f = frameAt(e.clientX);
						if (f == null) return;
						if (onSeekFrame) {
							onSeekFrame(f);
							setClickVoice(`playhead ${fmtTimecode(f, fps)}`);
						} else setClickVoice("ruler click seeks when the tenant wires the seek seat — drag the playhead cap to scrub");
					},
					onDoubleClick: (e) => {
						if (!onPromptAdd) return;
						const f = frameAt(e.clientX);
						if (f != null) onPromptAdd(f);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"data-testid": "motion-timeline-click-voice",
							"aria-live": "polite",
							className: timeline_module_css_default.timecode,
							style: { display: clickVoice ? void 0 : "none" },
							children: clickVoice
						}),
						ticks.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.tick,
							style: { left: frameToPx(s * fps) },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_module_css_default.tickLine }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.tickLabel,
								children: timelineCopy.tickSeconds({ value: stepSec < 1 ? s.toFixed(1) : String(s) })
							})]
						}, s)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"data-testid": "motion-timeline-timecode",
							className: timeline_module_css_default.timecode,
							style: {
								background: barBg,
								boxShadow: "2px 0 6px -2px color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent)"
							},
							children: fmtTimecode(frameIdx, fps)
						})
					]
				})
			}) });
		}
		/** The playhead, spanning every row (bar line 1517). The cap at its
		*  top is THE scrub handle (operator 2026-11: the gesture lives on
		*  the white circle, never the bar's middle) — the line itself
		*  SWALLOWS its pixels (E2-10: pointer-dead is pass-through, and the
		*  pass-through woke every seat beneath — the ruler's seek over the
		*  ruler band, clip drags over clips, click-away deselect over empty
		*  track. The line intercepts and eats the gesture: no session, no
		*  seek, no select. The cap is carved out — a press bubbling from the
		*  cap still opens the scrub). */
		function TimelinePlayhead(props) {
			const { frameIdx, frameToPx, playhead, onGrab } = props;
			const fromCap = (e) => e.target?.closest?.("[data-testid=\"motion-timeline-playhead-cap\"]") != null;
			const swallow = (e) => {
				if (fromCap(e)) return;
				e.stopPropagation();
				e.preventDefault();
				try {
					e.currentTarget.setPointerCapture(e.pointerId);
				} catch (captureErr) {}
			};
			const swallowClick = (e) => {
				if (fromCap(e)) return;
				e.stopPropagation();
				e.preventDefault();
			};
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
				onPointerDown: swallow,
				onPointerUp: swallowClick,
				onPointerCancel: swallowClick,
				onClick: swallowClick,
				onDoubleClick: swallowClick,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					"data-testid": "motion-timeline-playhead-cap",
					className: timeline_module_css_default.playheadCap,
					style: { background: playhead },
					onPointerDown: onGrab
				})
			}) });
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/viser-timeline/styles.ts
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
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarLanes.tsx
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
									title: isFirst ? timelineCopy.firstCallTitle : void 0,
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
									title: timelineCopy.seamExtendTitle
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
									placeholder: timelineCopy.promptPlaceholder,
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
													children: timelineCopy.emptyClip
												})
											}), wPx > 72 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: timeline_module_css_default.clipDur,
												children: timelineCopy.clipSeconds({ seconds: ((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1) })
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
											children: timelineCopy.emptyClip
										})
									}), wPx > 64 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.clipDur,
										children: timelineCopy.clipSeconds({ seconds: ((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1) })
									})]
								}),
								p.override && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									title: timelineCopy.knobOverrideTitle,
									className: timeline_module_css_default.knobDot
								}),
								p.audio && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Music, {
									"aria-hidden": true,
									className: timeline_module_css_default.refAudioBadge
								}),
								(p.refImages ?? 0) > 0 && !isEditing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									"data-testid": "tl-ref-badge",
									className: timeline_module_css_default.refBadge,
									title: timelineCopy.refImagesTitle({ count: p.refImages ?? 0 }),
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
										"aria-label": timelineCopy.deletePromptCardAria,
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
										children: timelineCopy.emptyClip
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
			const { audioLayers, prompts, fps, frameToPx, xToFrame, startDrag, audioClipCards, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, onAudioLaneActivate } = props;
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
					role: onAudioLaneActivate ? "button" : void 0,
					tabIndex: onAudioLaneActivate ? 0 : void 0,
					"aria-label": onAudioLaneActivate ? L.label : void 0,
					onKeyDown: onAudioLaneActivate ? (e) => {
						if (e.key !== "Enter" && e.key !== " ") return;
						e.preventDefault();
						e.stopPropagation();
						onAudioLaneActivate(L.id);
					} : void 0,
					onClick: (e) => {
						if (!e.target.closest("[data-audio-clip]")) {
							e.stopPropagation();
							onAudioLaneActivate?.(L.id);
						}
					},
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
							title: timelineCopy.audioClipTitle({
								name: c.name,
								start: a,
								end: b,
								gain: c.gain != null ? c.gain.toFixed(2) : null
							}),
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
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: timeline_module_css_default.audioTime,
										children: timelineCopy.clipSeconds({ seconds: a })
									})]
								}),
								onAudioClipDelete && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									size: "sm",
									"data-audio-clip-delete": c.id,
									"aria-label": timelineCopy.deleteClipAria({ name: c.name }),
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
							title: timelineCopy.audioSliceTitle({
								call: i,
								start: a,
								end: b
							}),
							className: timeline_module_css_default.audioSlice,
							style: {
								left: frameToPx(p.start_frame),
								width: `max(4px, ${frameToPx(Math.max(1, p.end_frame - p.start_frame))}px)`
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: timeline_module_css_default.sliceLabel,
								children: timelineCopy.sliceRange({
									start: a,
									end: b
								})
							})
						}, p.uuid);
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: timeline_module_css_default.audioDrop,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.dropHint,
							children: timelineCopy.audioDropHint
						})
					})
				}, L.id);
			}) });
		}
		/** Keyframe lanes: pin, drag, hover-X delete (bar line 1443). */
		function TimelineKeyframeLanes(props) {
			const { tracks, keyframes, laneHint, dragId, kfLaneCards, frameToPx, xToFrame, startDrag, onKeyframeAdd, onKeyframeDelete } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: tracks.map((track) => {
				const kfs = keyframes.filter((k) => k.track_id === track.uuid);
				const color = rgb(track.color ?? [
					176,
					180,
					186
				]);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-lane": track.uuid,
					className: timeline_module_css_default.kfLane,
					style: { height: kfLaneCards ? 44 : 24 },
					"data-kf-cards": kfLaneCards ? "true" : "false",
					onDoubleClick: (e) => {
						const f = xToFrame(e.clientX);
						if (f != null) onKeyframeAdd?.(track.uuid, f);
					},
					children: [kfs.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-testid": "kf-drop-well",
						className: timeline_module_css_default.kfDropWell,
						style: { borderColor: `color-mix(in srgb, ${color} 30%, transparent)` },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: timeline_module_css_default.dropHint,
							children: laneHint
						})
					}), kfs.map((kf) => {
						const isMoving = dragId === kf.uuid;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: timeline_module_css_default.kfWrap,
							style: { left: frameToPx(kf.frame) },
							"data-drop-hint": kf.dropHint,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: `${track.name} constraint @ frame ${kf.frame} — drag to move, click to jump, hover ✕ to delete${kf.dropHint ? `\n\n${kf.dropHint}` : ""}`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										"data-kf": kf.uuid,
										"aria-label": kf.ariaLabel ?? timelineCopy.keyframeAria({
											track: track.name,
											frame: kf.frame
										}),
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
								}),
								kf.thumbUrl !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
									src: kf.thumbUrl,
									alt: "",
									draggable: false,
									"data-kf-thumb": kf.uuid,
									style: {
										position: "absolute",
										left: 10,
										top: "50%",
										transform: "translateY(-50%)",
										width: 14,
										height: 14,
										borderRadius: 3,
										objectFit: "cover",
										pointerEvents: "none",
										boxShadow: "0 0 0 1px var(--dsw-alias-border-l4)"
									}
								}),
								kf.readout !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"data-kf-frame": kf.uuid,
									style: {
										position: "absolute",
										left: kf.thumbUrl !== void 0 ? 26 : 10,
										top: "50%",
										transform: "translateY(-50%)",
										fontSize: 9,
										lineHeight: 1,
										color: "var(--dsw-alias-label-secondary)",
										whiteSpace: "nowrap",
										fontVariantNumeric: "tabular-nums",
										pointerEvents: "none"
									},
									children: kf.readout
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: `Delete ${track.name} keyframe at frame ${kf.frame}`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "ghost",
										size: "sm",
										onPointerDown: (e) => e.stopPropagation(),
										onClick: (e) => {
											e.stopPropagation();
											onKeyframeDelete(kf.uuid);
										},
										"aria-label": timelineCopy.deleteKeyframeAria({
											track: track.name,
											frame: kf.frame
										}),
										className: timeline_module_css_default.kfDelete,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
									})
								})
							]
						}, kf.uuid);
					})]
				}, track.uuid);
			}) });
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBar.tsx
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
		function MotionTimelineBar({ prompts, keyframes, frameIdx, onFrameChange, onScrubStart, onScrubEnd, totalFrames, fps, initialSeconds, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, onExtend, tracks = MOTION_TIMELINE_TRACKS, promptsLabel = timelineCopy.lanePrompts, laneHint = timelineCopy.laneHintDefault, packed = false, emptyPromptsHint = timelineCopy.emptyPromptsHint, promptsHeight = 36, beats, beatsLabel = timelineCopy.laneBeats, beatsHeight = 26, beatsHint = timelineCopy.beatsHintDefault, onBeatAdd, onPromptAdd, previews, selectedId = null, onSelect, audioLayers, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, onAudioLaneActivate, onAudioDetach, onTrackAdd, audioClipCards = false, kfLaneCards = false, commissions, className, style, theme }) {
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
					audioClipCards,
					onTrackAdd,
					kfLaneCards,
					commissions
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
							onPromptAdd,
							onSeekFrame: onFrameChange
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
						commissions?.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommissionLane, {
							row,
							frameToPx: scale.frameToPx,
							totalFrames
						}, row.id)),
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
							onAudioClipDelete,
							onAudioLaneActivate
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelineKeyframeLanes, {
							tracks,
							keyframes,
							laneHint,
							dragId: drag.dragId,
							kfLaneCards,
							frameToPx: scale.frameToPx,
							xToFrame: scale.xToFrame,
							startDrag: drag.startDrag,
							onKeyframeAdd,
							onKeyframeDelete
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimelinePlayhead, {
							frameIdx,
							frameToPx: scale.frameToPx,
							playhead,
							onGrab: drag.grabPlayhead
						})
					]
				})]
			});
		}
		(0, react.forwardRef)(function FilmPlayer({ src, onTime, onDuration, onPlayingChange, onEnded, muted, loop, autoPlay, poster, className, "data-testid": tid }, ref) {
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
		(0, react.createContext)({ useGui: (selector) => selector({ theme: { dark_mode: true } }) });
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/TimelineScrollbar.tsx
		/**
		* TimelineScrollbar — the timeline's scrollbar + zoom chrome,
		* MELITE-AUTHORED. Re-homed out of the vendored
		* `viser-timeline/timeline-overlays.tsx` 2026-11-05 (F2, the nativity
		* audit): the section was never upstream code — it renders the estate's
		* DSH Button + card-base Tip, imports the kit's own CSS module, and
		* carries estate testids and copy. Housing it here returns the vendored
		* files to upstream-only content, so a later upstream pull diffs clean;
		* the zoom copy rides `timelineCopy.ts` (one owner — the dictionary
		* already held `zoomOutAria`/`zoomInAria` beside the overlays' literals).
		* The scrollbar body moved verbatim; only the imports and the zoom seats
		* (now `TimelineZoomCluster`) changed.
		*/
		//#endregion
		//#region src/ui/studio/useMotionStage.ts
		/**
		* useMotionStage — the 3D/stage cluster moved verbatim from `component.tsx`.
		*
		* Covers the mega-function's stage seams:
		* - jointsFlatCm memo (~788): T×77×3 cm flat for the skeleton overlay,
		*   with the kept-refine overlay.
		* - discardKeptEdit (~897): revert the kept refine at the current frame.
		* - stampConstraintAtFrame (~941): capture the edited pose as a fullbody
		*   keyframe at the current frame (create or update the bound diamond)
		*   — stated through the constraints commit door (one-truth rework,
		*   2026-11-05, nativity audit F7).
		* - Export framing (~1051–1178): typed-pixel output truth + aspect-locked
		*   stage rect (move + corner-resize math), coherence refits, and the
		*   ResizeObserver live-refit while framing.
		*
		* Free-variable reads became explicit hook args; the memo + verbs +
		* framing state/handlers are returned. Behavior is IDENTICAL.
		*/
		function useMotionStage({ effectiveNpz, keptEdit, editableJoints, frameIdx, fullbodyKfAtFrame, toast, pushUndo, setKeptEdit, setEditedDeformedB64, commitConstraints, exportOpen, stageRect, setStageRect }) {
			const jointsFlatCm = (0, react.useMemo)(() => {
				const src = effectiveNpz;
				if (!src) return null;
				const T = src.T;
				const flat = new Float32Array(T * 77 * 3);
				const s = src.posedJoints;
				for (let f = 0; f < T; f++) {
					const base = f * 77 * 3;
					for (let i = 0; i < 231; i++) flat[base + i] = s[base + i] * 100;
				}
				if (keptEdit && keptEdit.frame < T) {
					const base = keptEdit.frame * 77 * 3;
					for (let j = 0; j < 77; j++) {
						flat[base + j * 3] = keptEdit.joints[j * 3];
						flat[base + j * 3 + 1] = keptEdit.joints[j * 3 + 1];
						flat[base + j * 3 + 2] = keptEdit.joints[j * 3 + 2];
					}
				}
				return flat;
			}, [effectiveNpz, keptEdit]);
			const discardKeptEdit = (0, react.useCallback)(() => {
				pushUndo();
				setKeptEdit(null);
				setEditedDeformedB64(null);
			}, [
				pushUndo,
				setKeptEdit,
				setEditedDeformedB64
			]);
			const stampConstraintAtFrame = (0, react.useCallback)(() => {
				const src = effectiveNpz;
				if (!src || !editableJoints) {
					toast("error", "Enter edit mode and drag a joint first — nothing to stamp");
					return;
				}
				pushUndo();
				const editedM = jointsFromCm(editableJoints);
				const payload = stampEditedPose(editedM, patchFrame(src.posedJoints, src.globalRotMats, editedM, frameIdx).globalRotMats.subarray(frameIdx * 77 * 9, (frameIdx + 1) * 77 * 9), frameIdx, src.T);
				const existing = fullbodyKfAtFrame;
				if (existing) {
					commitConstraints((doc) => ({
						...doc,
						payloads: {
							...doc.payloads,
							[existing.uuid]: payload
						}
					}));
					toast("success", `Updated keyframe at frame ${frameIdx + 1} (full-body)`);
				} else {
					const uuid = makeTimelineId();
					commitConstraints((doc) => ({
						...doc,
						keyframes: [...doc.keyframes, {
							uuid,
							track_id: "fullbody",
							frame: frameIdx,
							value: null,
							opacity: 1,
							locked: false
						}],
						payloads: {
							...doc.payloads,
							[uuid]: payload
						}
					}));
					toast("success", `Stamped authored pose → keyframe at frame ${frameIdx + 1}`);
				}
			}, [
				effectiveNpz,
				editableJoints,
				frameIdx,
				fullbodyKfAtFrame,
				toast,
				pushUndo,
				commitConstraints
			]);
			const [exportOut, setExportOut] = (0, react.useState)({
				w: 768,
				h: 1024
			});
			const stageBoxRef = (0, react.useRef)(null);
			/** The stage's live pixel size — the mediator between the rect's
			*  normalized units and the output's pixels. */
			const stageSizeNow = () => {
				const b = stageBoxRef.current?.getBoundingClientRect();
				if (b && b.width > 0 && b.height > 0) return {
					w: b.width,
					h: b.height
				};
				return {
					w: 16,
					h: 9
				};
			};
			/** The rect's normalized w:h that carries the typed output's pixel
			*  aspect: (r.w·sw)/(r.h·sh) == outW/outH. */
			const rectAspectNorm = () => {
				const { w: sw, h: sh } = stageSizeNow();
				return exportOut.w / exportOut.h * (sh / sw);
			};
			/** The largest on-stage rect with the given normalized aspect, centered
			*  on (cx, cy) and clamped inside the stage. */
			const rectWithAspect = (aspect, cx, cy) => {
				const w = Math.min(1, aspect);
				const h = w / aspect;
				return {
					x: Math.max(0, Math.min(1 - w, cx - w / 2)),
					y: Math.max(0, Math.min(1 - h, cy - h / 2)),
					w,
					h
				};
			};
			/** Typed-size write channel (the dialog's px inputs — the preset row is
			*  gone, typed px is the only size UI): clamp 8..4096. The coherence
			*  effect below refits the rect's aspect. */
			const handleOutSize = (0, react.useCallback)((w, h) => {
				const cw = Math.max(8, Math.min(4096, Math.round(w)));
				const ch = Math.max(8, Math.min(4096, Math.round(h)));
				setExportOut((prev) => prev.w === cw && prev.h === ch ? prev : {
					w: cw,
					h: ch
				});
			}, []);
			/** Frame presets — the parent owns the aspect lock, so both land as a
			*  refit: "whole" = the max-fit rect; "reset" = 80% of it (breathing
			*  room), centered on the stage. */
			const handleFramePreset = (0, react.useCallback)((kind) => {
				const a = rectAspectNorm();
				if (kind === "whole") {
					setStageRect((r) => rectWithAspect(a, r.x + r.w / 2, r.y + r.h / 2));
					return;
				}
				const w = Math.min(1, a) * .8;
				const h = w / a;
				setStageRect({
					x: Math.max(0, Math.min(1 - w, .5 - w / 2)),
					y: Math.max(0, Math.min(1 - h, .5 - h / 2)),
					w,
					h
				});
			}, [exportOut, setStageRect]);
			(0, react.useEffect)(() => {
				setStageRect((r) => {
					const next = rectWithAspect(rectAspectNorm(), r.x + r.w / 2, r.y + r.h / 2);
					return r.x === next.x && r.y === next.y && r.w === next.w && r.h === next.h ? r : next;
				});
			}, [
				exportOpen,
				exportOut.w,
				exportOut.h,
				setStageRect
			]);
			(0, react.useEffect)(() => {
				if (!exportOpen || typeof ResizeObserver === "undefined") return;
				const el = stageBoxRef.current;
				/* v8 ignore next 1 -- stageBoxRef is always the stage frame div (the ref attaches with the export panel — probe 2026-09-19) */
				if (!el) return;
				const ro = new ResizeObserver(() => {
					setStageRect((r) => rectWithAspect(rectAspectNorm(), r.x + r.w / 2, r.y + r.h / 2));
				});
				ro.observe(el);
				return () => ro.disconnect();
			}, [
				exportOpen,
				exportOut.w,
				exportOut.h,
				setStageRect
			]);
			const rectDragRef = (0, react.useRef)(null);
			const beginRectDrag = (e, mode) => {
				if (e.button !== 0) return;
				e.preventDefault();
				e.stopPropagation();
				e.currentTarget.setPointerCapture?.(e.pointerId);
				rectDragRef.current = {
					mode,
					sx: e.clientX,
					sy: e.clientY,
					orig: { ...stageRect }
				};
			};
			const onRectPointerMove = (e) => {
				const d = rectDragRef.current;
				const box = stageBoxRef.current?.getBoundingClientRect();
				if (!d || !box || box.width === 0 || box.height === 0) return;
				const dx = (e.clientX - d.sx) / box.width;
				const dy = (e.clientY - d.sy) / box.height;
				const o = d.orig;
				const MIN = .02;
				if (d.mode === "move") {
					const nx = Math.max(0, Math.min(1 - o.w, o.x + dx));
					const ny = Math.max(0, Math.min(1 - o.h, o.y + dy));
					setStageRect((r) => r.x === nx && r.y === ny ? r : {
						...r,
						x: nx,
						y: ny
					});
					return;
				}
				const AN = rectAspectNorm();
				const candW = d.mode === "se" || d.mode === "ne" ? o.w + dx : o.w - dx;
				const candH = d.mode === "se" || d.mode === "sw" ? o.h + dy : o.h - dy;
				const s = Math.max(candW / o.w, candH / o.h);
				const maxW = d.mode === "se" || d.mode === "ne" ? 1 - o.x : o.x + o.w;
				const maxH = d.mode === "se" || d.mode === "sw" ? 1 - o.y : o.y + o.h;
				let w = Math.min(o.w * s, maxW);
				let h = Math.min(w / AN, maxH);
				w = Math.min(h * AN, maxW);
				h = w / AN;
				if (AN >= 1) {
					h = Math.max(MIN, h);
					w = h * AN;
				} else {
					w = Math.max(MIN, w);
					h = w / AN;
				}
				w = Math.min(w, maxW);
				h = Math.min(h, maxH);
				setStageRect({
					x: d.mode === "se" || d.mode === "ne" ? o.x : o.x + o.w - w,
					y: d.mode === "se" || d.mode === "sw" ? o.y : o.y + o.h - h,
					w,
					h
				});
			};
			const endRectDrag = () => {
				rectDragRef.current = null;
			};
			return {
				jointsFlatCm,
				discardKeptEdit,
				stampConstraintAtFrame,
				exportOut,
				handleOutSize,
				handleFramePreset,
				stageBoxRef,
				beginRectDrag,
				onRectPointerMove,
				endRectDrag
			};
		}
		//#endregion
		//#region src/ui/studio/useTimelineEnvelope.ts
		/**
		* useTimelineEnvelope — the authoring envelope math (baseT/targetT +
		* pull-the-tail extend). The doc cluster that used to live beside it —
		* the once-only constraints hydration, the didHydratePrompts seed latch,
		* the rescale guard, and the two echo-guard persist effects — died in
		* the one-truth rework (2026-11-05, nativity audit F7): the doc is
		* projected by useMotionDoc from stage.params (external writes
		* re-hydrate naturally), persistence rides the gesture commits, and the
		* seed is the projection's own default. What remains here is the frame
		* envelope: the real run's T once a motion exists, else the form's
		* duration_sec × fps, plus the pull-the-tail override that extends the
		* envelope and syncs duration_sec.
		*/
		function useTimelineEnvelope({ stage, effectiveNpz, onSave, toast }) {
			const baseT = (0, react.useMemo)(() => {
				if (effectiveNpz && effectiveNpz.T > 1) return effectiveNpz.T;
				const d = typeof stage.params?.duration_sec === "number" ? stage.params.duration_sec : 5;
				return Math.max(1, Math.round(d * 30));
			}, [effectiveNpz, stage.params?.duration_sec]);
			const [tlExtendT, setTlExtendT] = (0, react.useState)(0);
			const targetT = Math.max(baseT, tlExtendT);
			(0, react.useEffect)(() => {
				setTlExtendT(0);
			}, [baseT]);
			const lastExtendToastRef = (0, react.useRef)(0);
			return {
				targetT,
				onTimelineExtend: (0, react.useCallback)((newTotal) => {
					const t = Math.max(1, Math.floor(newTotal));
					setTlExtendT(t);
					onSave({ duration_sec: t / 30 });
					const now = Date.now();
					if (now - lastExtendToastRef.current > 1e3) {
						lastExtendToastRef.current = now;
						toast("info", `Timeline extended to ${(t / 30).toFixed(1)}s`);
					}
				}, [onSave, toast])
			};
		}
		//#endregion
		//#region src/ui/studio/useTimelineAuthoring.ts
		/**
		* useTimelineAuthoring — the timeline authoring verbs, re-homed onto the
		* one-truth commit doors (2026-11-05, nativity audit F7). Every verb is
		* ONE statement through commitConstraints / commitPrompts — there are no
		* mirror setters and no authoring guard: the doc hook owns hydration,
		* persistence, and the shown overlay, so a verb's only job is to compute
		* the next shape. The rescale-guard law ("a late envelope settle never
		* erases an authored drag") holds by construction — there is no effect
		* left that writes the doc channel.
		*
		* Free-variable reads became explicit hook args. Gesture/undo cadence is
		* IDENTICAL (pushUndo on the same verbs, maybePushDragUndo on drags).
		*/
		function useTimelineAuthoring({ effectiveNpz, toast, pushUndo, maybePushDragUndo, targetT, setFrameIdx, setPlaying, commitConstraints, commitPrompts }) {
			return {
				handleTimelineFrameChange: (0, react.useCallback)((f) => {
					setFrameIdx(f);
					setPlaying(false);
				}, [setFrameIdx, setPlaying]),
				onKeyframeAdd: (0, react.useCallback)((trackId, frame) => {
					const uuid = makeTimelineId();
					const src = effectiveNpz;
					if (!src) {
						toast("error", "Motion still loading — add a keyframe once the stage is live");
						return uuid;
					}
					pushUndo();
					const payload = snapshotConstraint(trackId, frame, src);
					/* v8 ignore next 4 -- all six lane uuids are known constants; hydrate drops orphans (probe 2026-09-19) */
					if (!payload) {
						toast("error", `Unknown constraint lane "${trackId}"`);
						return uuid;
					}
					commitConstraints((prev) => {
						const seated = prev.keyframes.find((k) => k.track_id === trackId && k.frame === payload.frame);
						if (seated) return {
							...prev,
							payloads: {
								...prev.payloads,
								[seated.uuid]: payload
							}
						};
						return {
							...prev,
							keyframes: [...prev.keyframes, {
								uuid,
								track_id: trackId,
								frame: payload.frame,
								value: null,
								opacity: 1,
								locked: false
							}],
							payloads: {
								...prev.payloads,
								[uuid]: payload
							}
						};
					});
					return uuid;
				}, [
					effectiveNpz,
					toast,
					pushUndo,
					commitConstraints
				]),
				onKeyframeMove: (0, react.useCallback)((id, frame) => {
					const f = Math.max(0, Math.floor(frame));
					maybePushDragUndo(`kf:${id}`);
					commitConstraints((prev) => {
						const p = prev.payloads[id];
						/* v8 ignore next 1 -- keyframes and payloads are written paired; hydrate drops orphans (probe 2026-09-19) */
						if (!p) return {
							...prev,
							keyframes: prev.keyframes.map((k) => k.uuid === id ? {
								...k,
								frame: f
							} : k)
						};
						return {
							...prev,
							keyframes: prev.keyframes.map((k) => k.uuid === id ? {
								...k,
								frame: f
							} : k),
							payloads: {
								...prev.payloads,
								[id]: {
									...p,
									frame: f
								}
							}
						};
					});
				}, [maybePushDragUndo, commitConstraints]),
				onKeyframeDelete: (0, react.useCallback)((id) => {
					pushUndo();
					commitConstraints((prev) => {
						/* v8 ignore next 2 -- keyframes and payloads are written paired
						* and hydrate drops orphans (probe 2026-09-19), so a payload-less
						* delete never reaches the doc door (infra-coverage #10,
						* 2026-11-06: deletion adjudication, same law as the move arm) */
						if (!(id in prev.payloads)) return {
							...prev,
							keyframes: prev.keyframes.filter((k) => k.uuid !== id)
						};
						const payloads = { ...prev.payloads };
						delete payloads[id];
						return {
							...prev,
							keyframes: prev.keyframes.filter((k) => k.uuid !== id),
							payloads
						};
					});
				}, [pushUndo, commitConstraints]),
				onPromptUpdate: (0, react.useCallback)((id, text) => {
					pushUndo();
					commitPrompts((prev) => prev.map((p) => p.uuid === id ? {
						...p,
						text
					} : p));
				}, [pushUndo, commitPrompts]),
				onPromptResize: (0, react.useCallback)((id, startFrame, endFrame) => {
					maybePushDragUndo(`pr:${id}`);
					commitPrompts((prev) => prev.map((p) => p.uuid === id ? {
						...p,
						start_frame: startFrame,
						end_frame: endFrame
					} : p));
				}, [maybePushDragUndo, commitPrompts]),
				onPromptMove: (0, react.useCallback)((id, startFrame, endFrame) => {
					maybePushDragUndo(`pm:${id}`);
					commitPrompts((prev) => prev.map((p) => p.uuid === id ? {
						...p,
						start_frame: startFrame,
						end_frame: endFrame
					} : p));
				}, [maybePushDragUndo, commitPrompts]),
				onPromptDelete: (0, react.useCallback)((id) => {
					pushUndo();
					commitPrompts((prev) => prev.filter((p) => p.uuid !== id));
				}, [pushUndo, commitPrompts]),
				addPromptCard: (0, react.useCallback)(() => {
					pushUndo();
					commitPrompts((prev) => carveNewPromptCard(prev, targetT));
				}, [
					targetT,
					pushUndo,
					commitPrompts
				])
			};
		}
		//#endregion
		//#region src/ui/studio/MotionRail.tsx
		function MotionRail({ effectiveNpz, showSkeleton, setShowSkeleton, inPlace, setInPlace, editMode, toggleEdit, fullbodyKfAtFrame, frameIdx, stampConstraintAtFrame, editableJoints, handleRepose, reposing, keptEdit, discardKeptEdit, kimodoSpec, kimodoError, paramValues, onParamEdit, exportOpen, setExportOpen, bgImage, handleBgFile, setBg, bodySrc, bodyWired, bodyWiredUpstream, bodyWiredUrl, handleBodyFile, toast, attachBody, onWireSlot, bodySlotIdx, onSave, stage, setBodyWireOpen, bodyNotice }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: component_module_css_default.railGrid,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, { children: motionCopy.viewGroup }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: effectiveNpz ? "Show the joint skeleton over the mesh" : motionCopy.loadingMannequinBusy,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: component_module_css_default.contents,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: showSkeleton ? "primary" : "outline",
								size: "sm",
								onClick: () => setShowSkeleton((s) => !s),
								disabled: !effectiveNpz,
								"aria-pressed": showSkeleton,
								children: [showSkeleton ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.EyeAlt, { className: component_module_css_default.i14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.EyeOff, { className: component_module_css_default.i14 }), motionCopy.skeletonToggle]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: !effectiveNpz ? motionCopy.loadingMannequinBusy : inPlace ? "Pinned at the origin — same motion, no travel (treadmill). Toggle to play the root's travel across the stage." : "Playing the root's travel across the stage. Toggle to pin the figure at the origin — same motion, no travel.",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: component_module_css_default.contents,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: inPlace ? "primary" : "outline",
								size: "sm",
								onClick: () => setInPlace((v) => !v),
								disabled: !effectiveNpz,
								"aria-pressed": inPlace,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Target, { className: component_module_css_default.i14 }), motionCopy.inPlaceToggle]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
						className: component_module_css_default.railGroupLabelMt,
						children: motionCopy.poseGroup
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: !effectiveNpz ? motionCopy.loadingMannequinBusy : editMode ? "Exit edit mode — keeps the refined pose on the character at this frame" : "Drag joints to refine the pose at this frame",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: component_module_css_default.contents,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: editMode ? "primary" : "outline",
								size: "sm",
								onClick: toggleEdit,
								disabled: !effectiveNpz,
								"aria-pressed": editMode,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Move, { className: component_module_css_default.i14 }), editMode ? motionCopy.poseDone : motionCopy.refinePose]
							})
						})
					}),
					editMode && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: fullbodyKfAtFrame ? `Update the full-body keyframe at frame ${frameIdx + 1} with this pose` : `Write this pose into the timeline as a full-body keyframe at frame ${frameIdx + 1}`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: component_module_css_default.contents,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								onClick: stampConstraintAtFrame,
								disabled: !editableJoints,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Target, { className: component_module_css_default.i14 }), motionCopy.stamp]
							})
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: "Chain the edited pose as the starting point — kimodo conditions the next generation on it. Hit Run when ready.",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: component_module_css_default.contents,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "sm",
								onClick: handleRepose,
								disabled: reposing || !editableJoints,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { className: reposing ? component_module_css_default.spinIcon : component_module_css_default.i14 }), reposing ? motionCopy.reposing : motionCopy.repose]
							})
						})
					})] }),
					!editMode && keptEdit && keptEdit.frame === frameIdx && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: "Discard the refined pose at this frame — revert to the raw motion",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							size: "sm",
							onClick: discardKeptEdit,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.RotateCcw, { className: component_module_css_default.i14 }), motionCopy.resetPose]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: component_module_css_default.railPanel,
						"data-testid": "mo-rail-panel",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SpecPanel, {
							model: "kimodo",
							spec: kimodoSpec,
							error: kimodoError,
							values: paramValues,
							onEdit: onParamEdit,
							sections: (0, _melite_card_base_client.panelSectionsOf)(kimodoSpec, {
								generation: {
									title: motionCopy.sectionGeneration,
									testid: "mo-gen-panel"
								},
								guidance: {
									title: motionCopy.sectionGuidance,
									testid: "mo-guide-panel"
								},
								general: {
									title: motionCopy.sectionClock,
									testid: "mo-clock-panel"
								}
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
						className: component_module_css_default.railGroupLabelMt,
						children: motionCopy.outputGroup
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
						tip: !effectiveNpz ? motionCopy.loadingMannequinBusy : exportOpen ? "Close the export panel" : "Frame a shot with the stage rectangle — no run needed; exports mesh / openpose / depth at the typed pixel size",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: component_module_css_default.contents,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: exportOpen ? "primary" : "outline",
								size: "sm",
								onClick: () => setExportOpen((o) => !o),
								disabled: !effectiveNpz,
								"aria-pressed": exportOpen,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { className: component_module_css_default.i14 }), motionCopy.railExport]
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: component_module_css_default.bgSquareWrap,
						"data-motion-bg": true,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SourceRow, {
							label: motionCopy.background,
							kind: "image",
							value: bgImage,
							onEdit: (v) => setBg(v === "" ? null : v),
							onFile: handleBgFile,
							loadMedia: _melite_card_base_client.fetchMediaLibrary
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.SectionLabel, {
						className: component_module_css_default.railGroupLabelMt,
						children: motionCopy.previewBody
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						"data-motion-body": true,
						className: component_module_css_default.bodySquareWrap,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.InputSquare, {
							label: MOTION_PREVIEW_GLB_PARAM,
							value: bodySrc || void 0,
							badge: bodyWired ? bodyWiredUpstream.title : void 0,
							metric: bodyWired && !bodyWiredUrl ? "waiting for upstream" : void 0,
							emptyIcon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PersonStanding, { className: component_module_css_default.bodyEmptyIcon }),
							accept: _melite_card_base_client.MESH_SQUARE_ACCEPT,
							showFileAction: true,
							onFile: handleBodyFile,
							onAsset: (url) => {
								if (!(0, _melite_card_base_client.isMeshUrl)(url)) {
									toast("error", "Preview body must be a .glb or .gltf (SOMAX-rigged character).");
									return;
								}
								attachBody(url);
							},
							onClear: bodyWired ? () => {
								onWireSlot?.(MOTION_PREVIEW_GLB_PARAM, null, null);
								onSave({
									...stage.params,
									[MOTION_PREVIEW_GLB_PARAM]: null
								});
							} : () => attachBody(null),
							actions: onWireSlot && bodySlotIdx >= 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
								tip: "Wire from an earlier card's GLB output",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "ghost",
									type: "button",
									onClick: (e) => {
										e.stopPropagation();
										setBodyWireOpen(true);
									},
									"aria-label": motionCopy.wireBodyAria,
									"data-motion-body-wire": true,
									className: (0, _melite_card_base_client.cn)(component_module_css_default.wireBtn, bodyWired ? component_module_css_default.wireBtnOn : component_module_css_default.wireBtnOff),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutlineRegular, { className: component_module_css_default.i12 })
								})
							})
						})
					}),
					bodyNotice && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						"data-motion-body-error": true,
						className: component_module_css_default.bodyNotice,
						children: bodyNotice.includes("converting through the queue") ? bodyNotice : motionCopy.bodyNoticeSuffix({ notice: bodyNotice })
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:packages/engines/comfyui/src/action_cards/motion/ui/viewer3d/PoseViewer3D.module.css.mjs
		const css = ".nTYLQW_loadingBox{background:var(--dsw-alias-bg-base);flex-direction:column;justify-content:center;align-items:center;gap:12px;display:flex}.nTYLQW_loadingIcon{width:32px;height:32px;color:color-mix(in srgb, var(--dsw-alias-bg-module) 30%, transparent);animation:.9s linear infinite nTYLQW_loading-rotate}@keyframes nTYLQW_loading-rotate{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.nTYLQW_loadingIcon{animation:none}}.nTYLQW_loadingLabel{color:color-mix(in srgb, var(--dsw-alias-bg-module) 40%, transparent);font-size:12px}.nTYLQW_errorBox{background:var(--dsw-alias-bg-base);color:color-mix(in srgb, var(--dsw-alias-bg-module) 60%, transparent);justify-content:center;align-items:center;font-size:12px;display:flex}";
		const tagId = "@melite/motion-motion/PoseViewer3D.module.css@35df78cf";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/motion-motion";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PoseViewer3D_module_css_default = {
			"errorBox": "nTYLQW_errorBox",
			"loading-rotate": "nTYLQW_loading-rotate",
			"loadingBox": "nTYLQW_loadingBox",
			"loadingIcon": "nTYLQW_loadingIcon",
			"loadingLabel": "nTYLQW_loadingLabel"
		};
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/actionCopy.ts
		/**
		* actionCopy.ts — THE MOTION/UI COPY DICTIONARY (the copy-scope
		* extension, 2026-11-05). Client UI copy is locale-owned (the estate's
		* decision, the DSH verify-client-i18n law): presentation code owns no
		* copy literals; it consumes them here through the typed seat. A second
		* locale plugs into this dictionary without touching a single
		* action-card viewer.
		*
		* THE BOUND: static user-visible FACES of the pose stage and the motion
		* poster/viewer live here. Parameterized sentences whose shape is fixed
		* but whose slots are live live here as typed dict functions (the
		* square.ts pattern). DATA never rides the dictionary: engine refusal
		* strings and decode-error detail text pass through as live values
		* (the `{error}` slots), never dictionary entries.
		*
		* UNIT LAW: this tree compiles as separate tsc build units
		* (motion/ui's rootDir is motion/ui; src's rootDir is src), so the
		* tree's copy seats one dictionary PER UNIT — this file owns the
		* motion/ui unit's faces; the poster shell's face lives in
		* src/actionCopy.ts. No string appears in both.
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const actionCopy = {
			/** The pose stage's mesh-loading face. */
			poseLoadingMesh: "Loading mesh…",
			/** The pose stage's mesh-failure lead (the detail is the live error). */
			poseMeshError: (p) => `Mesh error: ${p.error}`,
			/** The pose stage's no-data face. */
			poseNoMesh: "No mesh",
			/** The poster skeleton's accessible name while the snapshot renders. */
			posterLoadingLabel: "Loading motion preview",
			/** The rendered poster image's alt text. */
			posterAlt: "Motion preview",
			/** The viewer's failure-state title (the detail is the live error). */
			viewerUnavailable: "Motion preview unavailable",
			/** The viewer skeleton's accessible name while frames decode. */
			viewerLoading: "Loading motion",
			/** The play toggle's accessible name (the Space shortcut named). */
			playAria: "Play (Space)",
			/** The pause toggle's accessible name (the Space shortcut named). */
			pauseAria: "Pause (Space)",
			/** The scrub input's accessible name. */
			seekAria: "Seek",
			/** The transport's fps badge ("<fps> fps · <frames>f"). */
			fpsBadge: (p) => `${p.fps} fps · ${p.frames}f`
		};
		//#endregion
		//#region ../../web-kit/formats/lib/somaSkin.js
		init_lib();
		//#endregion
		//#region ../../web-kit/formats/lib/poseCodec.js
		const SOMA77_BONE_CONNECTIONS = [
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
		//#endregion
		//#region ../../web-kit/formats/lib/motionNpz.js
		/**
		* motionNpz — the Motion Card's client-side motion engine.
		*
		* Everything the Motion Card needs beyond the raw NPZ bytes, in one place:
		*
		*   • loadMotionNpz        — fetch + parse a kimodo motion NPZ (meters)
		*   • precomputeDeformedVerts — LBS every frame onto the neutral SOMAX skin
		*                             (extracted from MotionViewer — single source)
		*   • vertsToB64 / cm helpers — the PoseViewer3D boundary (cm + base64)
		*   • AZIMUTH_PRESETS      — the 8 export angles (Blender convention,
		*                            0 = front / 90 = right, matching the vnccs
		*                            flow's front_mesh…front_left_mesh names)
		*   • soma77ToCoco18       — TS port of the poser nodes' SOMA→COCO-18
		*                            mapping + ear extrapolation (library/
		*                            soma_to_coco.py — the DWPose / vnccs contract)
		*   • writeNpz             — a browser-side NPZ WRITER (lib/npz.ts is
		*                            reader-only): NPY v1 '<f4' + ZIP method 8 with
		*                            real CRC32 (numpy validates). Feeds the
		*                            prev_motion_artifact chain slot with an
		*                            edited pose.
		*   • patchFrame           — rotation reconstruction: given edited joint
		*                            positions for one frame, rebuild global_rot_mats
		*                            by arc-aligning each joint's child direction
		*                            along the SOMA-77 hierarchy.
		*
		* Units: METERS everywhere (kimodo's native unit), except functions that
		* cross the PoseViewer3D boundary, which is centimeters (its mesh, skeleton
		* and gizmos all apply CM_TO_M internally). Callers convert explicitly.
		*/
		const J = 77;
		const AZIMUTH_PRESETS = [
			{
				angle: 0,
				cameraView: "az-0",
				label: "Front"
			},
			{
				angle: 45,
				cameraView: "az-45",
				label: "F-R"
			},
			{
				angle: 90,
				cameraView: "az-90",
				label: "Right"
			},
			{
				angle: 135,
				cameraView: "az-135",
				label: "B-R"
			},
			{
				angle: 180,
				cameraView: "az-180",
				label: "Back"
			},
			{
				angle: 225,
				cameraView: "az-225",
				label: "B-L"
			},
			{
				angle: 270,
				cameraView: "az-270",
				label: "Left"
			},
			{
				angle: 315,
				cameraView: "az-315",
				label: "F-L"
			}
		];
		const AZ_DIST = 3.4;
		const AZ_HEIGHT = 1.2;
		/** Camera position for an azimuth view — target is (0, 0.9, 0). */
		function azimuthCameraPos(view) {
			const rad = (AZIMUTH_PRESETS.find((p) => p.cameraView === view) ?? AZIMUTH_PRESETS[0]).angle * Math.PI / 180;
			return [
				Math.sin(rad) * AZ_DIST,
				AZ_HEIGHT,
				Math.cos(rad) * AZ_DIST
			];
		}
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
		({ "MODE": "production" }).BASE_URL;
		//#endregion
		//#region ../../web-kit/formats/lib/bodyPresets.js
		const NEUTRAL_RACE = [
			.5,
			.5,
			.5
		];
		[...NEUTRAL_RACE];
		[...NEUTRAL_RACE];
		[...NEUTRAL_RACE];
		//#endregion
		//#region ../../web-kit/formats/lib/b64.js
		init_api();
		//#endregion
		//#region ../../web-kit/formats/lib/poseTransforms.js
		init_lib();
		const KP = {
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
		//#endregion
		//#region ../../web-kit/formats/lib/prompt-tags.json
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
		//#region ../../web-kit/formats/lib/promptTags.js
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
		/** Category display order for the dropdown (matches the JSON key order). */
		const TAG_CATEGORY_ORDER = [
			"shot",
			"camera",
			"lighting",
			"style",
			"motion",
			"mood",
			"color",
			"subject"
		];
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
		Object.freeze(flatten(prompt_tags_default));
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageSkeleton.ts
		/** Centimeters → meters. SOMA-X/ANNY joints arrive in cm; the Three.js scene
		*  is authored in meters. Applied at every display boundary. The drag handler
		*  converts gizmo.position back to cm so IK/FK math stays in the native cm
		*  space (matching jointsFlat and the backend deformSomaJoints API). */
		const CM_TO_M = .01;
		/** child index → parent index. Root (0) has no parent (maps to -1). */
		const SOMA77_PARENT = (() => {
			const parent = new Array(77).fill(-1);
			for (const [p, c] of SOMA77_BONE_CONNECTIONS) parent[c] = p;
			return parent;
		})();
		/** Return the joint chain from `jointIdx` up to (and including) `chainRoot`,
		*  ordered root-first. Used by multi-joint selection and IK. */
		function getJointChain(jointIdx, chainRoot = 0) {
			const chain = [];
			let cur = jointIdx;
			let guard = 0;
			while (cur >= 0 && cur < 77 && guard++ < 77) {
				chain.unshift(cur);
				if (cur === chainRoot) break;
				cur = SOMA77_PARENT[cur];
			}
			return chain;
		}
		const SOMA77_CHILDREN = (() => {
			const children = Array.from({ length: 77 }, () => []);
			for (let i = 0; i < 77; i++) {
				const p = SOMA77_PARENT[i];
				if (p >= 0) children[p].push(i);
			}
			return children;
		})();
		/** Return ALL descendant joint indices of `jointIdx`. Used by FK propagation. */
		function getDescendants(jointIdx) {
			const result = [];
			const stack = [...SOMA77_CHILDREN[jointIdx]];
			while (stack.length > 0) {
				const cur = stack.pop();
				result.push(cur);
				stack.push(...SOMA77_CHILDREN[cur]);
			}
			return result;
		}
		function solveCCD(jointsFlat, chain, target, iterations = 8, tolerance = .005) {
			if (chain.length < 2) return jointsFlat;
			const out = new Float32Array(jointsFlat);
			const ee = chain[chain.length - 1];
			const eePos = new _melite_three_client_client.Vector3(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2]);
			if (eePos.distanceTo(target) < tolerance) return out;
			const chainDescendants = chain.map((j) => getDescendants(j));
			const tmpJoint = new _melite_three_client_client.Vector3();
			const tmpEE = new _melite_three_client_client.Vector3();
			const curDir = new _melite_three_client_client.Vector3();
			const tgtDir = new _melite_three_client_client.Vector3();
			const quat = new _melite_three_client_client.Quaternion();
			const axis = new _melite_three_client_client.Vector3();
			const cp = new _melite_three_client_client.Vector3();
			for (let iter = 0; iter < iterations; iter++) {
				for (let i = chain.length - 2; i >= 0; i--) {
					const j = chain[i];
					tmpJoint.set(out[j * 3], out[j * 3 + 1], out[j * 3 + 2]);
					tmpEE.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2]);
					curDir.subVectors(tmpEE, tmpJoint).normalize();
					tgtDir.subVectors(target, tmpJoint).normalize();
					const dot = _melite_three_client_client.MathUtils.clamp(curDir.dot(tgtDir), -1, 1);
					const angle = Math.acos(dot);
					axis.crossVectors(curDir, tgtDir);
					if (axis.lengthSq() < 1e-8 || angle < 1e-5) continue;
					axis.normalize();
					quat.setFromAxisAngle(axis, angle);
					for (const c of chainDescendants[i]) {
						cp.set(out[c * 3], out[c * 3 + 1], out[c * 3 + 2]);
						cp.sub(tmpJoint).applyQuaternion(quat).add(tmpJoint);
						out[c * 3] = cp.x;
						out[c * 3 + 1] = cp.y;
						out[c * 3 + 2] = cp.z;
					}
				}
				eePos.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2]);
				if (eePos.distanceTo(target) < tolerance) break;
			}
			return out;
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageCamera.ts
		function cameraPosFor(view) {
			switch (view) {
				case "side": return [
					3.2,
					1.2,
					.01
				];
				case "three-quarter": return [
					2.4,
					1.4,
					2.4
				];
				case "front": return [
					0,
					1.2,
					3.4
				];
				default:
					if (view.startsWith("az-")) return azimuthCameraPos(view);
					return [
						2.74,
						1.88,
						5.68
					];
			}
		}
		const FRAMING = {
			full: {
				dist: 2.6,
				camY: 1.15,
				targetY: .92
			},
			upper: {
				dist: 1.25,
				camY: 1.5,
				targetY: 1.3
			}
		};
		const LEGACY_TARGET_Y = {
			full: .9,
			upper: 1.32
		};
		const LEGACY_DIST_SCALE = {
			full: 1,
			upper: .5
		};
		function framedCameraPos(view, framing) {
			const base = cameraPosFor(view);
			if (view.startsWith("az-")) {
				const angle = Math.atan2(base[0], base[2]);
				const f = FRAMING[framing];
				return [[
					Math.sin(angle) * f.dist,
					f.camY,
					Math.cos(angle) * f.dist
				], f.targetY];
			}
			const ty = LEGACY_TARGET_Y[framing];
			const s = LEGACY_DIST_SCALE[framing];
			const dir = [
				base[0],
				base[1] - .9,
				base[2]
			];
			return [[
				dir[0] * s,
				ty + dir[1] * s,
				dir[2] * s
			], ty];
		}
		//#endregion
		//#region ../../web-kit/formats/lib/poserSkin.js
		init_lib();
		const MESH_CACHE_CAP = 16;
		const _meshCache = /* @__PURE__ */ new Map();
		async function fetchBindMesh(query = {}) {
			const { identityModel, identityCoeffs, localChanges, previewPose, customTargets } = query;
			const key = identityModel || "anny";
			const coeffsSig = identityCoeffs && identityCoeffs.length > 0 ? identityCoeffs.map((v) => v.toFixed(1)).join(",") : null;
			const lcEntries = localChanges && Object.keys(localChanges).length > 0 ? Object.entries(localChanges).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",") : null;
			const ctEntries = customTargets && Object.keys(customTargets).length > 0 ? Object.entries(customTargets).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",") : null;
			const poseSig = previewPose && previewPose !== "tpose" ? previewPose : null;
			const cacheKey = [
				key,
				coeffsSig,
				lcEntries,
				ctEntries,
				poseSig
			].filter(Boolean).join("|");
			const cached = _meshCache.get(cacheKey);
			if (cached) {
				_meshCache.delete(cacheKey);
				_meshCache.set(cacheKey, cached);
				return cached;
			}
			const posePayload = poseSig ? { preview_pose: poseSig } : {};
			let data;
			if (coeffsSig || lcEntries || ctEntries) {
				const res = await apiFetch("/v1/poser/mesh", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						identity_model: key,
						...posePayload,
						...coeffsSig ? { identity_coeffs: identityCoeffs } : {},
						...lcEntries ? { local_changes: localChanges } : {},
						...key === "anny" ? { custom_targets: customTargets ?? {} } : {}
					})
				});
				if (!res.ok) throw new Error(`Failed to fetch shaped mesh (${key}): ${res.status}`);
				data = await res.json();
			} else {
				const qs = new URLSearchParams({ identity_model: key });
				if (poseSig) qs.set("preview_pose", poseSig);
				const res = await apiFetch(`/v1/poser/mesh?${qs.toString()}`);
				if (!res.ok) throw new Error(`Failed to fetch mesh (${key}): ${res.status}`);
				data = await res.json();
			}
			if (_meshCache.size >= MESH_CACHE_CAP) for (const oldest of _meshCache.keys()) {
				_meshCache.delete(oldest);
				break;
			}
			_meshCache.set(cacheKey, data);
			return data;
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageMesh.ts
		const FLOOR_LIFT_Y = .02;
		/** Compute the Y-offset that places the mesh's lowest point at FLOOR_LIFT_Y. */
		function computeMeshLiftY(meshData) {
			let minY = Infinity;
			const verts = meshData.vertices;
			for (let i = 0; i < verts.length; i++) if (verts[i][1] < minY) minY = verts[i][1];
			return isFinite(minY) ? FLOOR_LIFT_Y - minY * CM_TO_M : FLOOR_LIFT_Y;
		}
		function buildGeometry(meshData) {
			const geo = new _melite_three_client_client.BufferGeometry();
			const verts = meshData.vertices;
			const arr = new Float32Array(verts.length * 3);
			for (let i = 0; i < verts.length; i++) {
				arr[i * 3] = verts[i][0] * CM_TO_M;
				arr[i * 3 + 1] = verts[i][1] * CM_TO_M;
				arr[i * 3 + 2] = verts[i][2] * CM_TO_M;
			}
			geo.setAttribute("position", new _melite_three_client_client.BufferAttribute(arr, 3));
			const idx = meshData.faces.flat(2);
			geo.setIndex(idx);
			geo.computeVertexNormals();
			geo.computeBoundingSphere();
			return geo;
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageCarriers.ts
		function createSkinCarrier(liftGroup) {
			return {
				mesh: null,
				geo: null,
				mat: null,
				scratch: /* @__PURE__ */ new Float32Array(0),
				lastUploadedIdx: -2,
				meshData: null,
				deformedFlat: null,
				numVerts: 0,
				lastAnimate: false,
				setMesh(p) {
					this.numVerts = p.numVerts;
					if (this.meshData !== p.meshData) {
						this.meshData = p.meshData;
						this.geo?.dispose();
						this.geo = buildGeometry(p.meshData);
						this.scratch = new Float32Array(p.numVerts * 3);
						if (this.mesh === null) {
							this.mat = new _melite_three_client_client.MeshStandardMaterial({
								color: new _melite_three_client_client.Color(p.color),
								roughness: .55,
								metalness: .05,
								flatShading: false,
								side: _melite_three_client_client.DoubleSide
							});
							this.mesh = new _melite_three_client_client.Mesh(this.geo, this.mat);
							this.mesh.castShadow = true;
							this.mesh.receiveShadow = true;
							liftGroup.add(this.mesh);
						} else this.mesh.geometry = this.geo;
						this.lastUploadedIdx = -2;
					}
					const opacity = p.editMode ? Math.min(p.opacity, .85) : p.opacity;
					if (this.mat !== null) {
						this.mat.color.set(p.color);
						this.mat.opacity = opacity;
						this.mat.transparent = opacity < 1;
						this.mat.wireframe = p.layers.wireframe;
					}
				},
				setData(deformedFlat) {
					if (this.deformedFlat !== deformedFlat) {
						this.deformedFlat = deformedFlat;
						this.lastUploadedIdx = -2;
					}
				},
				uploadFrame(idx, showBindPose, animate) {
					const geo = this.geo;
					if (geo === null || this.meshData === null) return;
					const pos = geo.attributes.position;
					const arr = pos.array;
					const meshVertCount = this.meshData.vertices.length;
					if (!(!showBindPose && !!this.deformedFlat && meshVertCount === this.numVerts)) {
						const scale = meshVertCount === 18056 ? CM_TO_M : 1;
						const verts = this.meshData.vertices;
						for (let i = 0; i < verts.length; i++) {
							arr[i * 3] = verts[i][0] * scale;
							arr[i * 3 + 1] = verts[i][1] * scale;
							arr[i * 3 + 2] = verts[i][2] * scale;
						}
						this.lastUploadedIdx = -1;
						pos.needsUpdate = true;
						geo.computeVertexNormals();
						geo.computeBoundingSphere();
						return;
					}
					const stride = this.numVerts * 3;
					const frameCount = this.deformedFlat.length / stride;
					const clamped = Math.max(0, Math.min(idx, frameCount - 1));
					const base = clamped * stride;
					const src = this.deformedFlat.subarray(base, base + stride);
					for (let i = 0; i < stride; i++) this.scratch[i] = src[i] * CM_TO_M;
					arr.set(this.scratch, 0);
					pos.needsUpdate = true;
					if (!animate) {
						geo.computeVertexNormals();
						geo.computeBoundingSphere();
					}
					this.lastUploadedIdx = clamped;
				}
			};
		}
		function createAnimClock(frameIdxRef) {
			return {
				time: 0,
				uiAccum: 0,
				lastSyncedIdx: -1,
				animate: false,
				enabled: false,
				frameCount: 1,
				fps: 30,
				speed: 1,
				setFrameIdx: (_f) => {},
				reset() {
					this.time = 0;
					this.uiAccum = 0;
				},
				tick(delta) {
					if (!this.animate || !this.enabled || this.frameCount < 2) return;
					this.time += delta * this.speed;
					const frameDelta = Math.floor(this.time * this.fps);
					if (frameDelta > 0) {
						this.time -= frameDelta / this.fps;
						const newIdx = (frameIdxRef.current + frameDelta) % this.frameCount;
						if (newIdx !== frameIdxRef.current) frameIdxRef.current = newIdx;
					}
					this.uiAccum += delta;
					if (this.uiAccum >= .1) {
						this.uiAccum = 0;
						const cur = frameIdxRef.current;
						if (cur !== this.lastSyncedIdx) {
							this.lastSyncedIdx = cur;
							this.setFrameIdx(cur);
						}
					}
				}
			};
		}
		function createSkeletonOverlay(liftGroup) {
			return {
				spheres: null,
				lines: null,
				boneGeo: null,
				dummy: new _melite_three_client_client.Object3D(),
				ensure() {
					if (this.spheres !== null) return;
					const sphereGeo = new _melite_three_client_client.SphereGeometry(.018, 8, 8);
					const sphereMat = new _melite_three_client_client.MeshBasicMaterial({ color: 16764006 });
					this.spheres = new _melite_three_client_client.InstancedMesh(sphereGeo, sphereMat, 77);
					const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6);
					this.boneGeo = new _melite_three_client_client.BufferGeometry();
					this.boneGeo.setAttribute("position", new _melite_three_client_client.BufferAttribute(positions, 3));
					const boneMat = new _melite_three_client_client.LineBasicMaterial({
						color: 16746564,
						transparent: true,
						opacity: .7
					});
					this.lines = new _melite_three_client_client.LineSegments(this.boneGeo, boneMat);
					liftGroup.add(this.spheres);
					liftGroup.add(this.lines);
				},
				update(jointsFlat, frameIdx) {
					if (jointsFlat === null) {
						if (this.spheres !== null) this.spheres.visible = false;
						if (this.lines !== null) this.lines.visible = false;
						return;
					}
					this.ensure();
					this.spheres.visible = true;
					this.lines.visible = true;
					const stride = 231;
					const frameCount = jointsFlat.length / stride;
					const base = Math.max(0, Math.min(frameIdx, frameCount - 1)) * stride;
					for (let j = 0; j < 77; j++) {
						this.dummy.position.set(jointsFlat[base + j * 3] * CM_TO_M, jointsFlat[base + j * 3 + 1] * CM_TO_M, jointsFlat[base + j * 3 + 2] * CM_TO_M);
						this.dummy.scale.setScalar(1);
						this.dummy.updateMatrix();
						this.spheres.setMatrixAt(j, this.dummy.matrix);
					}
					this.spheres.instanceMatrix.needsUpdate = true;
					const pos = this.boneGeo.attributes.position;
					const arr = pos.array;
					for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
						const [pp, cc] = SOMA77_BONE_CONNECTIONS[b];
						arr[b * 6 + 0] = jointsFlat[base + pp * 3] * CM_TO_M;
						arr[b * 6 + 1] = jointsFlat[base + pp * 3 + 1] * CM_TO_M;
						arr[b * 6 + 2] = jointsFlat[base + pp * 3 + 2] * CM_TO_M;
						arr[b * 6 + 3] = jointsFlat[base + cc * 3] * CM_TO_M;
						arr[b * 6 + 4] = jointsFlat[base + cc * 3 + 1] * CM_TO_M;
						arr[b * 6 + 5] = jointsFlat[base + cc * 3 + 2] * CM_TO_M;
					}
					pos.needsUpdate = true;
					this.boneGeo.computeBoundingSphere();
				}
			};
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageManipulators.ts
		const JOINT_RADIUS = {};
		for (let i = 0; i < 77; i++) JOINT_RADIUS[i] = .02;
		for (const j of [
			0,
			3,
			6,
			11,
			12,
			13,
			14,
			39,
			40,
			41,
			42,
			67,
			68,
			69,
			72,
			73,
			74
		]) JOINT_RADIUS[j] = .028;
		for (const j of [
			18,
			23,
			28,
			33,
			38,
			46,
			51,
			56,
			61,
			66,
			71,
			76
		]) JOINT_RADIUS[j] = .012;
		function createJointManipulator(deps) {
			const { stage, scene } = deps;
			return {
				root: null,
				jointMeshes: [],
				jointMats: [],
				boneGeo: null,
				pivot: new _melite_three_client_client.Group(),
				tc: null,
				hovered: -1,
				dragging: false,
				prevRot: new _melite_three_client_client.Euler(0, 0, 0),
				active: false,
				jointsFlat: null,
				selectedJoint: null,
				selectedChain: null,
				onSelectJoint: (_i, _a) => {},
				onSelectChain: void 0,
				onJointMove: (_e) => {},
				gizmoMode: "rotate",
				kinematicMode: "fk",
				get isIKActive() {
					return this.kinematicMode === "ik" && this.selectedJoint !== null && this.selectedJoint !== 0;
				},
				get effectiveMode() {
					return this.isIKActive ? "translate" : this.gizmoMode;
				},
				ensure(root) {
					if (this.root !== null) return;
					this.root = new _melite_three_client_client.Group();
					root.add(this.root);
					const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6);
					this.boneGeo = new _melite_three_client_client.BufferGeometry();
					this.boneGeo.setAttribute("position", new _melite_three_client_client.BufferAttribute(positions, 3));
					const boneMat = new _melite_three_client_client.LineBasicMaterial({
						color: 16746564,
						transparent: true,
						opacity: .5
					});
					this.root.add(new _melite_three_client_client.LineSegments(this.boneGeo, boneMat));
					for (let j = 0; j < 77; j++) {
						const mat = new _melite_three_client_client.MeshBasicMaterial({ color: 16764006 });
						const mesh = new _melite_three_client_client.Mesh(new _melite_three_client_client.SphereGeometry(JOINT_RADIUS[j] || .02, 12, 12), mat);
						mesh.userData.pick = {
							click: (_point, ev) => {
								this.handleJointClick(j, ev);
							},
							over: () => {
								this.hovered = j;
								document.body.style.cursor = "pointer";
								this.paint();
							},
							out: () => {
								if (this.hovered === j) this.hovered = -1;
								document.body.style.cursor = "auto";
								this.paint();
							}
						};
						this.jointMeshes[j] = mesh;
						this.jointMats[j] = mat;
						this.root.add(mesh);
					}
					root.add(this.pivot);
				},
				handleJointClick(j, ev) {
					const additive = ev.shiftKey;
					this.onSelectJoint(j, additive);
					if (this.onSelectChain !== void 0) this.onSelectChain(additive ? getJointChain(j, 0) : null);
				},
				paint() {
					for (let j = 0; j < 77; j++) {
						const inChain = this.selectedChain?.includes(j) ?? false;
						this.jointMats[j].color.set(this.selectedJoint === j ? "#00ff88" : inChain ? "#ff66ff" : this.hovered === j ? "#ffdd00" : "#ffcc66");
					}
				},
				updateJoints() {
					const jf = this.jointsFlat;
					if (jf === null) return;
					for (let j = 0; j < 77; j++) this.jointMeshes[j].position.set(jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M);
					const pos = this.boneGeo.attributes.position;
					const arr = pos.array;
					for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
						const [pp, cc] = SOMA77_BONE_CONNECTIONS[b];
						arr[b * 6 + 0] = jf[pp * 3] * CM_TO_M;
						arr[b * 6 + 1] = jf[pp * 3 + 1] * CM_TO_M;
						arr[b * 6 + 2] = jf[pp * 3 + 2] * CM_TO_M;
						arr[b * 6 + 3] = jf[cc * 3] * CM_TO_M;
						arr[b * 6 + 4] = jf[cc * 3 + 1] * CM_TO_M;
						arr[b * 6 + 5] = jf[cc * 3 + 2] * CM_TO_M;
					}
					pos.needsUpdate = true;
					this.boneGeo.computeBoundingSphere();
					this.paint();
				},
				positionGizmo() {
					if (this.dragging) return;
					const jf = this.jointsFlat;
					if (this.selectedJoint === null || jf === null) return;
					const j = this.selectedJoint;
					this.pivot.position.set(jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M);
					this.pivot.rotation.set(0, 0, 0);
					this.prevRot.set(0, 0, 0);
				},
				handleGizmoDrag() {
					const jf = this.jointsFlat;
					if (this.selectedJoint === null || jf === null) return;
					const selectedJoint = this.selectedJoint;
					if (this.isIKActive) {
						const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M);
						const chainParent = SOMA77_PARENT[selectedJoint];
						if (chainParent < 0) return;
						const newJoints = solveCCD(jf, [chainParent, selectedJoint], target);
						this.onJointMove({
							idx: selectedJoint,
							position: target,
							fullJoints: newJoints
						});
					} else if (this.effectiveMode === "rotate") {
						const curRot = this.pivot.rotation;
						const prev = this.prevRot;
						const dx = curRot.x - prev.x;
						const dy = curRot.y - prev.y;
						const dz = curRot.z - prev.z;
						if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return;
						const px = jf[selectedJoint * 3];
						const py = jf[selectedJoint * 3 + 1];
						const pz = jf[selectedJoint * 3 + 2];
						const quat = new _melite_three_client_client.Quaternion().setFromEuler(new _melite_three_client_client.Euler(dx, dy, dz, "XYZ"));
						const newJoints = new Float32Array(jf);
						const descendants = getDescendants(selectedJoint);
						const tmp = new _melite_three_client_client.Vector3();
						for (const j of descendants) {
							tmp.set(newJoints[j * 3] - px, newJoints[j * 3 + 1] - py, newJoints[j * 3 + 2] - pz);
							tmp.applyQuaternion(quat);
							newJoints[j * 3] = tmp.x + px;
							newJoints[j * 3 + 1] = tmp.y + py;
							newJoints[j * 3 + 2] = tmp.z + pz;
						}
						this.prevRot.copy(curRot);
						this.onJointMove({
							idx: selectedJoint,
							position: new _melite_three_client_client.Vector3(px, py, pz),
							fullJoints: newJoints
						});
					} else {
						const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M);
						this.onJointMove({
							idx: selectedJoint,
							position: target
						});
					}
				},
				syncGizmo() {
					const want = this.active && this.selectedJoint !== null && this.jointsFlat !== null;
					if (want && this.tc === null) {
						this.tc = new _melite_three_client_client.TransformControls(stage.camera, stage.canvas);
						this.tc.setSize(.8);
						this.tc.addEventListener("dragging-changed", (ev) => {
							const on = ev.value;
							stage.controls.enabled = !on;
							this.dragging = on;
						});
						this.tc.addEventListener("mouseDown", () => {
							this.dragging = true;
							this.prevRot.set(0, 0, 0);
						});
						this.tc.addEventListener("objectChange", () => this.handleGizmoDrag());
						this.tc.addEventListener("mouseUp", () => {
							this.dragging = false;
							this.handleGizmoDrag();
						});
						scene.add(this.tc);
					}
					if (this.tc === null) return;
					if (want) {
						this.tc.attach(this.pivot);
						this.tc.setMode(this.effectiveMode);
						this.tc.enabled = true;
					} else {
						this.tc.detach();
						this.tc.enabled = false;
					}
				}
			};
		}
		function createReferenceManipulator(deps) {
			const { stage, scene } = deps;
			return {
				root: null,
				jointMeshes: [],
				jointMats: [],
				boneGeo: null,
				pivot: new _melite_three_client_client.Group(),
				tc: null,
				hovered: -1,
				dragging: false,
				prevRot: new _melite_three_client_client.Euler(0, 0, 0),
				jointsFlat: null,
				selectedJoint: null,
				selectedChain: null,
				onSelectJoint: (_i, _a) => {},
				onSelectChain: void 0,
				onJointMove: (_e) => {},
				gizmoMode: "rotate",
				kinematicMode: "fk",
				ensure(root) {
					if (this.root !== null) {
						if (this.root.parent !== root) root.add(this.root);
						return;
					}
					this.root = new _melite_three_client_client.Group();
					root.add(this.root);
					const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6);
					this.boneGeo = new _melite_three_client_client.BufferGeometry();
					this.boneGeo.setAttribute("position", new _melite_three_client_client.BufferAttribute(positions, 3));
					const boneMat = new _melite_three_client_client.LineBasicMaterial({
						color: 16746564,
						transparent: true,
						opacity: .5
					});
					this.root.add(new _melite_three_client_client.LineSegments(this.boneGeo, boneMat));
					for (let j = 0; j < 77; j++) {
						const mat = new _melite_three_client_client.MeshBasicMaterial({ color: 16764006 });
						const mesh = new _melite_three_client_client.Mesh(new _melite_three_client_client.SphereGeometry(JOINT_RADIUS[j] || .02, 12, 12), mat);
						mesh.userData.pick = {
							click: (_point, ev) => {
								const additive = ev.shiftKey;
								this.onSelectJoint(j, additive);
								if (this.onSelectChain !== void 0) this.onSelectChain(additive ? getJointChain(j, 0) : null);
							},
							over: () => {
								this.hovered = j;
								document.body.style.cursor = "pointer";
								this.paint();
							},
							out: () => {
								if (this.hovered === j) this.hovered = -1;
								document.body.style.cursor = "auto";
								this.paint();
							}
						};
						this.jointMeshes[j] = mesh;
						this.jointMats[j] = mat;
						this.root.add(mesh);
					}
					root.add(this.pivot);
				},
				paint() {
					for (let j = 0; j < 77; j++) {
						const inChain = this.selectedChain?.includes(j) ?? false;
						this.jointMats[j].color.set(this.selectedJoint === j ? "#00ff88" : inChain ? "#ff66ff" : this.hovered === j ? "#ffdd00" : "#ffcc66");
					}
				},
				updateJoints() {
					const jf = this.jointsFlat;
					if (jf === null || this.root === null) return;
					for (let j = 0; j < 77; j++) this.jointMeshes[j].position.set(jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M);
					const pos = this.boneGeo.attributes.position;
					const arr = pos.array;
					for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
						const [pp, cc] = SOMA77_BONE_CONNECTIONS[b];
						arr[b * 6 + 0] = jf[pp * 3] * CM_TO_M;
						arr[b * 6 + 1] = jf[pp * 3 + 1] * CM_TO_M;
						arr[b * 6 + 2] = jf[pp * 3 + 2] * CM_TO_M;
						arr[b * 6 + 3] = jf[cc * 3] * CM_TO_M;
						arr[b * 6 + 4] = jf[cc * 3 + 1] * CM_TO_M;
						arr[b * 6 + 5] = jf[cc * 3 + 2] * CM_TO_M;
					}
					pos.needsUpdate = true;
					this.boneGeo.computeBoundingSphere();
					this.paint();
				},
				get isIKActive() {
					return this.kinematicMode === "ik" && this.selectedJoint !== null && this.selectedJoint !== 0;
				},
				get effectiveMode() {
					return this.isIKActive ? "translate" : this.gizmoMode;
				},
				positionGizmo() {
					if (this.dragging) return;
					const jf = this.jointsFlat;
					if (this.selectedJoint === null || jf === null) return;
					const j = this.selectedJoint;
					this.pivot.position.set(jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M);
					this.pivot.rotation.set(0, 0, 0);
					this.prevRot.set(0, 0, 0);
				},
				handleGizmoDrag() {
					const jf = this.jointsFlat;
					if (this.selectedJoint === null || jf === null) return;
					const selectedJoint = this.selectedJoint;
					if (this.isIKActive) {
						const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M);
						const chainParent = SOMA77_PARENT[selectedJoint];
						if (chainParent < 0) return;
						const newJoints = solveCCD(jf, [chainParent, selectedJoint], target);
						this.onJointMove({
							idx: selectedJoint,
							position: target,
							fullJoints: newJoints
						});
					} else if (this.effectiveMode === "rotate") {
						const curRot = this.pivot.rotation;
						const prev = this.prevRot;
						const dx = curRot.x - prev.x;
						const dy = curRot.y - prev.y;
						const dz = curRot.z - prev.z;
						if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return;
						const px = jf[selectedJoint * 3];
						const py = jf[selectedJoint * 3 + 1];
						const pz = jf[selectedJoint * 3 + 2];
						const quat = new _melite_three_client_client.Quaternion().setFromEuler(new _melite_three_client_client.Euler(dx, dy, dz, "XYZ"));
						const newJoints = new Float32Array(jf);
						const descendants = getDescendants(selectedJoint);
						const tmp = new _melite_three_client_client.Vector3();
						for (const j of descendants) {
							tmp.set(newJoints[j * 3] - px, newJoints[j * 3 + 1] - py, newJoints[j * 3 + 2] - pz);
							tmp.applyQuaternion(quat);
							newJoints[j * 3] = tmp.x + px;
							newJoints[j * 3 + 1] = tmp.y + py;
							newJoints[j * 3 + 2] = tmp.z + pz;
						}
						this.prevRot.copy(curRot);
						this.onJointMove({
							idx: selectedJoint,
							position: new _melite_three_client_client.Vector3(px, py, pz),
							fullJoints: newJoints
						});
					} else {
						const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M);
						this.onJointMove({
							idx: selectedJoint,
							position: target
						});
					}
				},
				syncGizmo() {
					const want = this.root !== null && this.selectedJoint !== null && this.jointsFlat !== null;
					if (want && this.tc === null) {
						this.tc = new _melite_three_client_client.TransformControls(stage.camera, stage.canvas);
						this.tc.setSize(.8);
						this.tc.addEventListener("dragging-changed", (ev) => {
							const on = ev.value;
							stage.controls.enabled = !on;
							this.dragging = on;
						});
						this.tc.addEventListener("mouseDown", () => {
							this.dragging = true;
							this.prevRot.set(0, 0, 0);
						});
						this.tc.addEventListener("objectChange", () => this.handleGizmoDrag());
						this.tc.addEventListener("mouseUp", () => {
							this.dragging = false;
							this.handleGizmoDrag();
						});
						scene.add(this.tc);
					}
					if (this.tc === null) return;
					if (want) {
						this.tc.attach(this.pivot);
						this.tc.setMode(this.effectiveMode);
						this.tc.enabled = true;
					} else {
						this.tc.detach();
						this.tc.enabled = false;
					}
				},
				show(root) {
					if (root === null) {
						if (this.root !== null) this.root.visible = false;
						this.pivot.visible = false;
					} else {
						this.ensure(root);
						this.root.visible = true;
						this.pivot.visible = true;
					}
				}
			};
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageOverlays.ts
		function createLightingOrbs(deps) {
			const { stage, scene } = deps;
			const orbs = {
				root: new _melite_three_client_client.Group(),
				entries: [],
				onChange: void 0,
				onSelectOrb: void 0,
				orbs: [],
				selectedOrb: null,
				constructorDone: false,
				update(list, selectedOrb) {
					this.orbs = list;
					this.selectedOrb = selectedOrb;
					for (const e of this.entries) {
						e.group.removeFromParent();
						e.sphereMat.dispose();
						e.light.dispose();
						if (e.tc !== null) {
							e.tc.dispose();
							e.tc.removeFromParent();
						}
					}
					this.entries = [];
					for (const orb of list) {
						const group = new _melite_three_client_client.Group();
						group.position.set(orb.position[0], orb.position[1], orb.position[2]);
						const sphereMat = new _melite_three_client_client.MeshBasicMaterial({
							color: new _melite_three_client_client.Color(orb.color),
							transparent: true,
							opacity: selectedOrb === orb.id ? 1 : .8
						});
						const sphere = new _melite_three_client_client.Mesh(new _melite_three_client_client.SphereGeometry(.04, 12, 12), sphereMat);
						sphere.userData.pick = {
							click: () => {
								this.onSelectOrb?.(orb.id);
							},
							over: () => {
								document.body.style.cursor = "pointer";
							},
							out: () => {
								document.body.style.cursor = "auto";
							}
						};
						group.add(sphere);
						const haloMat = new _melite_three_client_client.MeshBasicMaterial({
							color: new _melite_three_client_client.Color(orb.color),
							transparent: true,
							opacity: .15
						});
						group.add(new _melite_three_client_client.Mesh(new _melite_three_client_client.SphereGeometry(.08, 12, 12), haloMat));
						const light = new _melite_three_client_client.PointLight(new _melite_three_client_client.Color(orb.color), orb.intensity, orb.distance);
						light.castShadow = orb.castShadow;
						group.add(light);
						this.root.add(group);
						this.entries.push({
							id: orb.id,
							group,
							sphereMat,
							light,
							tc: null
						});
					}
					const selIdx = list.findIndex((o) => o.id === selectedOrb);
					if (selIdx >= 0) {
						const e = this.entries[selIdx];
						e.tc = new _melite_three_client_client.TransformControls(stage.camera, stage.canvas);
						e.tc.setSize(.6);
						e.tc.setMode("translate");
						e.tc.addEventListener("dragging-changed", (ev) => {
							stage.controls.enabled = !ev.value;
						});
						const push = () => {
							this.handleOrbDrag(e.id);
						};
						e.tc.addEventListener("objectChange", push);
						e.tc.addEventListener("mouseUp", push);
						e.tc.attach(e.group);
						scene.add(e.tc);
					}
				},
				handleOrbDrag(id) {
					const i = this.orbs.findIndex((o) => o.id === id);
					const e = this.entries.find((en) => en.id === id);
					if (i < 0 || e === void 0 || this.onChange === void 0) return;
					const updated = [...this.orbs];
					updated[i] = {
						...updated[i],
						position: [
							e.group.position.x,
							e.group.position.y,
							e.group.position.z
						]
					};
					this.onChange(updated);
				}
			};
			scene.add(orbs.root);
			return orbs;
		}
		function createKeyframeGhost(liftGroup) {
			return {
				lines: null,
				geo: null,
				update(joints) {
					if (joints === null) {
						if (this.lines !== null) this.lines.visible = false;
						return;
					}
					if (this.lines === null) {
						const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6);
						this.geo = new _melite_three_client_client.BufferGeometry();
						this.geo.setAttribute("position", new _melite_three_client_client.BufferAttribute(positions, 3));
						const mat = new _melite_three_client_client.LineBasicMaterial({
							color: 65535,
							transparent: true,
							opacity: .3
						});
						this.lines = new _melite_three_client_client.LineSegments(this.geo, mat);
						liftGroup.add(this.lines);
					}
					this.lines.visible = true;
					const pos = this.geo.attributes.position;
					const arr = pos.array;
					for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
						const [pp, cc] = SOMA77_BONE_CONNECTIONS[b];
						arr[b * 6 + 0] = joints[pp * 3] * CM_TO_M;
						arr[b * 6 + 1] = joints[pp * 3 + 1] * CM_TO_M;
						arr[b * 6 + 2] = joints[pp * 3 + 2] * CM_TO_M;
						arr[b * 6 + 3] = joints[cc * 3] * CM_TO_M;
						arr[b * 6 + 4] = joints[cc * 3 + 1] * CM_TO_M;
						arr[b * 6 + 5] = joints[cc * 3 + 2] * CM_TO_M;
					}
					pos.needsUpdate = true;
					this.geo.computeBoundingSphere();
				}
			};
		}
		function createFootContacts(liftGroup) {
			return {
				meshes: [],
				mats: [],
				ensure() {
					if (this.meshes.length > 0) return;
					for (let i = 0; i < 4; i++) {
						const mat = new _melite_three_client_client.MeshBasicMaterial({
							color: 16777215,
							transparent: true,
							side: _melite_three_client_client.DoubleSide
						});
						const mesh = new _melite_three_client_client.Mesh(new _melite_three_client_client.RingGeometry(.028, .04, 16), mat);
						mesh.rotation.x = -Math.PI / 2;
						liftGroup.add(mesh);
						this.meshes.push(mesh);
						this.mats.push(mat);
					}
				},
				update(footContacts, frameIdx, jointsFlat) {
					const show = !!footContacts && footContacts.length > 0 && !!jointsFlat;
					this.ensure();
					const colors = [
						3900150,
						15485081,
						11032055,
						15680580
					];
					for (const m of this.meshes) m.visible = show;
					if (!show) return;
					const fi = Math.max(0, Math.min(frameIdx, footContacts.length - 1));
					const fc = footContacts[fi];
					if (!fc || fc.length < 4) {
						for (const m of this.meshes) m.visible = false;
						return;
					}
					const stride = 231;
					const frameCount = jointsFlat.length / stride;
					const base = Math.max(0, Math.min(fi, frameCount - 1)) * stride;
					const footPos = [69, 74].map((j) => [
						jointsFlat[base + j * 3] * CM_TO_M,
						jointsFlat[base + j * 3 + 1] * CM_TO_M,
						jointsFlat[base + j * 3 + 2] * CM_TO_M
					]);
					const src = [
						footPos[0],
						footPos[1],
						footPos[0],
						footPos[1]
					];
					for (let i = 0; i < 4; i++) {
						const contact = fc[i];
						const dz = i < 2 ? -.04 : .04;
						const radius = .04 + contact * .04;
						this.meshes[i].position.set(src[i][0], .005, src[i][2] + dz);
						this.meshes[i].scale.setScalar(radius / .04);
						this.mats[i].color.setHex(colors[i]);
						this.mats[i].opacity = .2 + contact * .8;
					}
				}
			};
		}
		function createDirectionArrow(liftGroup) {
			return {
				group: null,
				update(jointsFlat) {
					const rebuild = () => {
						if (this.group !== null) {
							this.group.removeFromParent();
							this.group = null;
						}
						if (jointsFlat === null || jointsFlat.length < 6) return;
						const stride = 231;
						if (Math.floor(jointsFlat.length / stride) < 2) return;
						const r0 = [jointsFlat[0] * CM_TO_M, jointsFlat[2] * CM_TO_M];
						const r1 = [jointsFlat[stride] * CM_TO_M, jointsFlat[233] * CM_TO_M];
						const dx = r1[0] - r0[0];
						const dz = r1[1] - r0[1];
						const len = Math.hypot(dx, dz);
						if (len < .01) return;
						const angle = Math.atan2(dx, dz);
						const arrowLen = Math.min(.8, len * 2 + .2);
						const g = new _melite_three_client_client.Group();
						g.position.set(r0[0], .01, r0[1]);
						g.rotation.y = angle;
						const shaftMat = new _melite_three_client_client.MeshBasicMaterial({
							color: 16498468,
							transparent: true,
							opacity: .85
						});
						const shaft = new _melite_three_client_client.Mesh(new _melite_three_client_client.CylinderGeometry(.012, .012, arrowLen, 8), shaftMat);
						shaft.position.set(0, 0, arrowLen / 2);
						shaft.rotation.x = Math.PI / 2;
						g.add(shaft);
						const headMat = new _melite_three_client_client.MeshBasicMaterial({
							color: 16498468,
							transparent: true,
							opacity: .95
						});
						const head = new _melite_three_client_client.Mesh(new _melite_three_client_client.ConeGeometry(.04, .1, 12), headMat);
						head.position.set(0, 0, arrowLen);
						head.rotation.x = Math.PI / 2;
						g.add(head);
						liftGroup.add(g);
						this.group = g;
					};
					rebuild();
				},
				setVisible(v) {
					if (this.group !== null) this.group.visible = v;
				}
			};
		}
		function createAltSamples() {
			return {
				root: new _melite_three_client_client.Group(),
				samples: [],
				faces: [],
				onCommit: (_i) => {},
				update(samples, meshData, onCommit) {
					this.onCommit = onCommit;
					this.root.clear();
					this.samples = samples;
					if (meshData === null || samples.length === 0) return;
					for (let i = 0; i < samples.length; i++) {
						const s = samples[i];
						const g = new _melite_three_client_client.BufferGeometry();
						const arr = new Float32Array(s.verts);
						g.setAttribute("position", new _melite_three_client_client.BufferAttribute(arr, 3));
						g.setIndex(meshData.faces.flat(2));
						g.computeVertexNormals();
						const mat = new _melite_three_client_client.MeshStandardMaterial({
							color: 11053224,
							transparent: true,
							opacity: .45,
							roughness: .7
						});
						const mesh = new _melite_three_client_client.Mesh(g, mat);
						mesh.userData.pick = {
							click: () => {
								this.onCommit(s.idx);
							},
							over: () => {
								document.body.style.cursor = "pointer";
							},
							out: () => {
								document.body.style.cursor = "auto";
							}
						};
						const holder = new _melite_three_client_client.Group();
						holder.position.set(1.2 + i * .6, 0, -.3);
						holder.add(mesh);
						const hintMat = new _melite_three_client_client.MeshBasicMaterial({
							color: 10010103,
							transparent: true,
							opacity: .6
						});
						const hint = new _melite_three_client_client.Mesh(new _melite_three_client_client.SphereGeometry(.05, 8, 8), hintMat);
						hint.position.set(0, 1.6, 0);
						holder.add(hint);
						this.root.add(holder);
					}
				}
			};
		}
		function createConstraintOverlays(deps) {
			const { stage, scene } = deps;
			return {
				root: new _melite_three_client_client.Group(),
				eeTC: null,
				eeGroups: [],
				eeMats: [],
				eeIds: [],
				points: [],
				editMode: false,
				selectedEEId: null,
				showLabels: true,
				onSelectEE: void 0,
				onChangeEEPoint: void 0,
				eeColor: {
					LeftHand: "#f59e0b",
					RightHand: "#ef4444",
					LeftFoot: "#10b981",
					RightFoot: "#3b82f6"
				},
				update(root2dPoints, endEffectorPoints, showLabels, editMode, selectedEEId) {
					this.points = endEffectorPoints;
					this.showLabels = showLabels;
					this.editMode = editMode;
					this.selectedEEId = selectedEEId;
					this.root.clear();
					this.eeGroups = [];
					this.eeMats = [];
					this.eeIds = [];
					for (const p of root2dPoints) {
						const g = new _melite_three_client_client.Group();
						g.position.set(p.x, .005, p.z);
						const mat = new _melite_three_client_client.MeshBasicMaterial({
							color: 16096779,
							transparent: true,
							opacity: .85,
							side: _melite_three_client_client.DoubleSide
						});
						const ring = new _melite_three_client_client.Mesh(new _melite_three_client_client.RingGeometry(.025, .04, 24), mat);
						ring.rotation.x = -Math.PI / 2;
						g.add(ring);
						if (showLabels) {
							const label = (0, _melite_card_base_client.makeLabelSprite)(`F${p.frame}`, "#fcd34d", .035);
							label.position.set(0, .08, 0);
							g.add(label);
						}
						this.root.add(g);
					}
					for (const p of endEffectorPoints) {
						const color = this.eeColor[p.joint_name] ?? "#ffffff";
						const isSelected = editMode && selectedEEId === p.id;
						const g = new _melite_three_client_client.Group();
						g.position.set(p.position[0], p.position[1], p.position[2]);
						const mat = new _melite_three_client_client.MeshBasicMaterial({
							color: new _melite_three_client_client.Color(isSelected ? "#ffffff" : color),
							transparent: true,
							opacity: isSelected ? 1 : .9
						});
						const radius = isSelected ? .034 : .028;
						const sphere = new _melite_three_client_client.Mesh(new _melite_three_client_client.SphereGeometry(radius, 16, 16), mat);
						sphere.userData.pick = {
							click: () => {
								if (editMode) this.onSelectEE?.(p.id);
							},
							over: () => {
								if (editMode) document.body.style.cursor = "move";
							},
							out: () => {
								document.body.style.cursor = "auto";
							}
						};
						g.add(sphere);
						if (isSelected) {
							const haloMat = new _melite_three_client_client.MeshBasicMaterial({
								color: new _melite_three_client_client.Color(color),
								transparent: true,
								opacity: .18
							});
							g.add(new _melite_three_client_client.Mesh(new _melite_three_client_client.SphereGeometry(.05, 16, 16), haloMat));
						}
						if (showLabels) {
							const label = (0, _melite_card_base_client.makeLabelSprite)(`${p.joint_name[0] ?? "E"}·F${p.frame}`, isSelected ? "#ffffff" : color, .03);
							label.position.set(0, .08, 0);
							g.add(label);
						}
						this.root.add(g);
						this.eeGroups.push(g);
						this.eeMats.push(mat);
						this.eeIds.push(p.id);
						if (isSelected && this.onChangeEEPoint !== void 0) {
							if (this.eeTC === null) {
								this.eeTC = new _melite_three_client_client.TransformControls(stage.camera, stage.canvas);
								this.eeTC.setSize(.7);
								this.eeTC.setMode("translate");
								this.eeTC.addEventListener("dragging-changed", (ev) => {
									stage.controls.enabled = !ev.value;
								});
								this.eeTC.addEventListener("objectChange", () => {
									if (this.selectedEEId !== null) this.handleEEDrag(this.selectedEEId);
								});
								this.eeTC.addEventListener("mouseUp", () => {
									if (this.selectedEEId !== null) this.handleEEDrag(this.selectedEEId);
								});
								scene.add(this.eeTC);
							}
							this.eeTC.attach(g);
							this.eeTC.enabled = true;
						}
					}
					if (this.eeTC !== null && !(editMode && selectedEEId !== null && endEffectorPoints.some((pt) => pt.id === selectedEEId))) {
						this.eeTC.detach();
						this.eeTC.enabled = false;
					}
				},
				handleEEDrag(id) {
					if (this.onChangeEEPoint === void 0) return;
					const i = this.eeIds.indexOf(id);
					if (i < 0) return;
					const g = this.eeGroups[i];
					this.onChangeEEPoint(id, [
						g.position.x,
						g.position.y,
						g.position.z
					]);
				}
			};
		}
		function createEEPlacementPlane(liftGroup) {
			return {
				mesh: null,
				setVisible(v) {
					if (this.mesh !== null) this.mesh.visible = v;
				},
				update(placingEE, eePlaceJointIdx, editableJoints, jointsFlat, frameIdx, onPlaceEE) {
					if (placingEE && this.mesh === null) {
						const mat = new _melite_three_client_client.MeshBasicMaterial({
							transparent: true,
							opacity: 0,
							side: _melite_three_client_client.DoubleSide,
							depthWrite: false
						});
						this.mesh = new _melite_three_client_client.Mesh(new _melite_three_client_client.PlaneGeometry(100, 100), mat);
						this.mesh.rotation.x = -Math.PI / 2;
						liftGroup.add(this.mesh);
					}
					if (this.mesh === null) return;
					this.mesh.visible = placingEE;
					if (!placingEE) return;
					const ji = eePlaceJointIdx ?? 0;
					const y = editableJoints ? editableJoints[ji * 3 + 1] * CM_TO_M : jointsFlat ? jointsFlat[(frameIdx * 77 + ji) * 3 + 1] * CM_TO_M : 1;
					this.mesh.position.set(0, y, 0);
					this.mesh.userData.pick = { click: (point) => {
						onPlaceEE([
							point.x,
							y,
							point.z
						]);
					} };
				}
			};
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStageReference.ts
		function createReferenceCarrier(deps) {
			const { liftGroup, refManip } = deps;
			return {
				root: null,
				mesh: null,
				geo: null,
				mat: null,
				skeleton: null,
				scratch: /* @__PURE__ */ new Float32Array(0),
				lastUploaded: -2,
				bundle: null,
				lastSig: "",
				update(p) {
					const b = p.reference;
					const sig = b === null ? "" : [
						b.spec.deformedVerticesB64.length,
						b.spec.editedDeformedVerticesB64?.length ?? 0,
						b.spec.offset.join(","),
						b.meshData?.vertices.length ?? 0,
						b.flat?.length ?? 0,
						b.editedFlat?.length ?? 0,
						b.spec.jointFrames?.length ?? 0
					].join("|");
					if (sig !== this.lastSig) {
						this.lastSig = sig;
						this.disposeMesh();
						if (b === null) {
							this.root?.removeFromParent();
							this.root = null;
							this.skeleton?.spheres.removeFromParent();
							this.skeleton?.lines.removeFromParent();
							this.skeleton = null;
							return;
						}
						this.bundle = b;
						this.root = new _melite_three_client_client.Group();
						const jointFramesFlat = b.spec.jointFrames && b.spec.jointFrames.length >= 3 ? new Float32Array(b.spec.jointFrames) : null;
						const hasEdited = !!b.spec.editedDeformedVerticesB64 && !!b.editedFlat && b.editedFlat.length >= 3;
						const activeFlat = hasEdited ? b.editedFlat : b.flat;
						if (!!jointFramesFlat && (!activeFlat || activeFlat.length < 3)) {
							this.root.position.set(b.spec.offset[0], 0, b.spec.offset[1]);
							const sphereGeo = new _melite_three_client_client.SphereGeometry(.018, 8, 8);
							const sphereMat = new _melite_three_client_client.MeshBasicMaterial({ color: 16498468 });
							const spheres = new _melite_three_client_client.InstancedMesh(sphereGeo, sphereMat, 77);
							const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6);
							const boneGeo = new _melite_three_client_client.BufferGeometry();
							boneGeo.setAttribute("position", new _melite_three_client_client.BufferAttribute(positions, 3));
							const boneMat = new _melite_three_client_client.LineBasicMaterial({
								color: 16096779,
								transparent: true,
								opacity: .7
							});
							const lines = new _melite_three_client_client.LineSegments(boneGeo, boneMat);
							this.root.add(spheres);
							this.root.add(lines);
							this.skeleton = {
								spheres,
								lines,
								boneGeo,
								dummy: new _melite_three_client_client.Object3D()
							};
							this.root.__skelFlat = jointFramesFlat;
						} else {
							if (b.meshData === null || activeFlat === null || activeFlat.length < 3) {
								liftGroup.add(this.root);
								return;
							}
							const refLiftDelta = computeMeshLiftY(b.meshData) - computeMeshLiftY(p.meshData);
							this.root.position.set(b.spec.offset[0], refLiftDelta, b.spec.offset[1]);
							this.geo = buildGeometry(b.meshData);
							const refFrameCount = hasEdited ? 1 : b.spec.frameCount ?? 1;
							const numVerts = Math.floor(activeFlat.length / 3 / Math.max(1, refFrameCount));
							this.scratch = new Float32Array(numVerts * 3);
							this.mat = new _melite_three_client_client.MeshStandardMaterial({
								color: new _melite_three_client_client.Color(b.spec.color ?? "#9ca3af"),
								roughness: .55,
								metalness: .05,
								flatShading: false,
								side: _melite_three_client_client.DoubleSide,
								transparent: (b.spec.opacity ?? .42) < 1,
								opacity: b.spec.opacity ?? .42
							});
							this.mesh = new _melite_three_client_client.Mesh(this.geo, this.mat);
							this.mesh.castShadow = true;
							this.mesh.receiveShadow = true;
							this.root.add(this.mesh);
							this.root.__refFlat = activeFlat;
							this.root.__refFrames = refFrameCount;
						}
						liftGroup.add(this.root);
						this.lastUploaded = -2;
					} else if (b !== null && this.root !== null && this.mesh === null && this.skeleton === null) {
						this.lastSig = "";
						this.update(p);
						return;
					}
					if (this.root === null) return;
					if (this.skeleton !== null) {
						const flat = this.root.__skelFlat;
						const fc = Math.max(1, Math.floor(flat.length / 231));
						const base = (fc > 1 ? Math.max(0, Math.min(p.refPlaybackFrameIdx ?? p.frameIdx, fc - 1)) : 0) * 77 * 3;
						const d = this.skeleton.dummy;
						for (let j = 0; j < 77; j++) {
							d.position.set(flat[base + j * 3] * CM_TO_M, flat[base + j * 3 + 1] * CM_TO_M, flat[base + j * 3 + 2] * CM_TO_M);
							d.scale.setScalar(1);
							d.updateMatrix();
							this.skeleton.spheres.setMatrixAt(j, d.matrix);
						}
						this.skeleton.spheres.instanceMatrix.needsUpdate = true;
						const pos = this.skeleton.boneGeo.attributes.position;
						const arr = pos.array;
						for (let bb = 0; bb < SOMA77_BONE_CONNECTIONS.length; bb++) {
							const [pp, cc] = SOMA77_BONE_CONNECTIONS[bb];
							arr[bb * 6 + 0] = flat[base + pp * 3] * CM_TO_M;
							arr[bb * 6 + 1] = flat[base + pp * 3 + 1] * CM_TO_M;
							arr[bb * 6 + 2] = flat[base + pp * 3 + 2] * CM_TO_M;
							arr[bb * 6 + 3] = flat[base + cc * 3] * CM_TO_M;
							arr[bb * 6 + 4] = flat[base + cc * 3 + 1] * CM_TO_M;
							arr[bb * 6 + 5] = flat[base + cc * 3 + 2] * CM_TO_M;
						}
						pos.needsUpdate = true;
						this.skeleton.boneGeo.computeBoundingSphere();
					} else if (this.mesh !== null && this.geo !== null) {
						const flat = this.root.__refFlat;
						const refFrames = this.root.__refFrames ?? 1;
						if (flat !== void 0) {
							const stride = this.scratch.length / 3 * 3;
							const refIdx = refFrames > 1 ? Math.max(0, Math.min(p.refPlaybackFrameIdx ?? p.frameIdx, refFrames - 1)) : 0;
							if (refIdx !== this.lastUploaded) {
								const pos = this.geo.attributes.position;
								const arr = pos.array;
								const src = flat.subarray(refIdx * stride, refIdx * stride + stride);
								for (let i = 0; i < stride; i++) this.scratch[i] = src[i] * CM_TO_M;
								arr.set(this.scratch, 0);
								pos.needsUpdate = true;
								if (!(refFrames > 1 && p.animate)) {
									this.geo.computeVertexNormals();
									this.geo.computeBoundingSphere();
								}
								this.lastUploaded = refIdx;
							}
						}
					}
					if (b !== null && p.editRefMode && p.refEditableJoints) {
						refManip.show(this.root);
						refManip.jointsFlat = p.refEditableJoints;
						refManip.selectedJoint = p.selectedJoint ?? null;
						refManip.selectedChain = p.selectedChain ?? null;
						refManip.onSelectJoint = p.onSelectJoint;
						refManip.onSelectChain = p.onSelectChain;
						refManip.onJointMove = p.onRefJointMove ?? (() => {});
						refManip.gizmoMode = p.gizmoMode;
						refManip.kinematicMode = p.kinematicMode ?? "fk";
						refManip.updateJoints();
						refManip.positionGizmo();
					} else refManip.show(null);
					refManip.syncGizmo();
				},
				disposeMesh() {
					this.mesh?.removeFromParent();
					this.geo?.dispose();
					this.mat?.dispose();
					this.mesh = null;
					this.geo = null;
					this.mat = null;
				}
			};
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/poseStage.ts
		/**
		* poseStage — the raw-three pose scene (the substrate law).
		*
		* THE PORT (2026-09-13): PoseViewer3D/PoseEditMode rode @react-three/fiber
		* + drei — the last r3f island in the card plane (the react-reconciler
		* version-skew boot crash is why the substrate exists). This module is the
		* 1:1 imperative port of that scene graph onto card-base's shared stage3d
		* core: every r3f child component became a subsystem with an update()
		* coarse-diff, useFrame became an ordered stage tick (anim clock BEFORE
		* skin upload — the declaration order of the old JSX tree), drei's
		* OrbitControls/Grid/ContactShadows/Text/Billboard/TransformControls became
		* three's own OrbitControls/GridHelper/ShadowMaterial plane/canvas-texture
		* sprites/addons TransformControls.
		*
		* Coordinate law (unchanged from the r3f original): ALL mesh/joint content
		* lives inside ONE lift group translated by meshLiftY (bind-mesh min-Y lift
		* + the in-place XZ anchor). Raw cm data → *CM_TO_M at ingestion; the group
		* carries the visual offset so drag handlers still receive RAW (cm-space)
		* coordinates. TransformControls gizmos attach to pivots INSIDE the group
		* but the gizmo itself is scene-rooted — world handles, local drag math,
		* which is the clean version of the old LiftAwareTransformControls fix
		* (its negative-offset hack existed only because drei nested the gizmo
		* inside the lifted group).
		*/
		function mountPoseStage(canvas, opts) {
			const stage = (0, _melite_card_base_client.mountStage3D)(canvas, {
				fov: opts.fov,
				near: .05,
				far: 100,
				camera: opts.camera,
				target: [
					0,
					.9,
					0
				],
				minDistance: .8,
				maxDistance: 12,
				maxPolarAngle: Math.PI / 1.85,
				alpha: false,
				preserveDrawingBuffer: true,
				onContextFailure: opts.onFail,
				onEmptyClick: () => {
					if (refManip.root !== null) {
						refManip.onSelectJoint(null);
						refManip.onSelectChain?.(null);
					} else if (manip.active) {
						manip.onSelectJoint(null);
						manip.onSelectChain?.(null);
					}
				}
			});
			if (stage === null) return null;
			opts.onCanvasReady?.(canvas);
			const scene = stage.scene;
			const dark = opts.darkMode;
			stage.renderer.setClearColor(new _melite_three_client_client.Color(dark ? _melite_card_base_client.STAGE_BACKGROUND_DARK : _melite_card_base_client.STAGE_BACKGROUND_LIGHT));
			const ambient = new _melite_three_client_client.AmbientLight(16777215, .45);
			scene.add(ambient);
			const key = new _melite_three_client_client.DirectionalLight(16777215, 1);
			key.position.set(5, 8, 5);
			key.castShadow = true;
			key.shadow.mapSize.set(2048, 2048);
			key.shadow.camera.left = -3;
			key.shadow.camera.right = 3;
			key.shadow.camera.top = 3;
			key.shadow.camera.bottom = -3;
			key.shadow.camera.near = .5;
			key.shadow.camera.far = 20;
			key.shadow.bias = -5e-4;
			scene.add(key);
			const fill = new _melite_three_client_client.DirectionalLight(16777215, .25);
			fill.position.set(-4, 3, -2);
			scene.add(fill);
			const hemi = new _melite_three_client_client.HemisphereLight(13489908, 1710638, .35);
			scene.add(hemi);
			const groundMat = new _melite_three_client_client.ShadowMaterial({ opacity: .55 });
			const ground = new _melite_three_client_client.Mesh(new _melite_three_client_client.PlaneGeometry(12, 12), groundMat);
			ground.rotation.x = -Math.PI / 2;
			ground.position.y = .001;
			ground.receiveShadow = true;
			scene.add(ground);
			const grid = new _melite_three_client_client.GridHelper(12, 48, 5921418, 3816026);
			const gridMat = grid.material;
			gridMat.transparent = true;
			gridMat.opacity = .9;
			scene.add(grid);
			const liftGroup = new _melite_three_client_client.Group();
			scene.add(liftGroup);
			const skin = createSkinCarrier(liftGroup);
			const frameIdxRef = { current: 0 };
			const anim = createAnimClock(frameIdxRef);
			stage.addTick((delta) => anim.tick(delta));
			stage.addTick(() => {
				if (skin.geo === null || skin.mesh === null) return;
				const target = frameIdxRef.current;
				if (target !== skin.lastUploadedIdx) skin.uploadFrame(target, showBindPose0, anim0);
			});
			let showBindPose0 = true;
			let anim0 = false;
			const skeleton = createSkeletonOverlay(liftGroup);
			const manip = createJointManipulator({
				stage,
				scene
			});
			const refManip = createReferenceManipulator({
				stage,
				scene
			});
			const orbs = createLightingOrbs({
				stage,
				scene
			});
			const ghost = createKeyframeGhost(liftGroup);
			const contacts = createFootContacts(liftGroup);
			const arrow = createDirectionArrow(liftGroup);
			let arrowJointsRef = null;
			const alts = createAltSamples();
			liftGroup.add(alts.root);
			const constraints = createConstraintOverlays({
				stage,
				scene
			});
			liftGroup.add(constraints.root);
			const eePlane = createEEPlacementPlane(liftGroup);
			const reference = createReferenceCarrier({
				liftGroup,
				refManip
			});
			let lastCameraView = "";
			let lastFraming = "";
			let lastLiftY = NaN;
			let lastOrbSel = null;
			let orbsSig = "";
			let lastEEsSig = "";
			let lastR2dSig = "";
			let lastAltSig = "";
			let darkCur = opts.darkMode;
			function update(p) {
				frameIdxRef.current = p.frameIdx;
				anim.animate = p.animate;
				anim.enabled = !p.showBindPose && !p.editMode;
				anim.frameCount = p.frameCount;
				anim.fps = p.fps;
				anim.speed = p.playbackSpeed;
				anim.setFrameIdx = p.setFrameIdx;
				if (p.animate && (!skinLastAnimate || anim.frameCount !== animLastFrameCount)) anim.reset();
				animLastFrameCount = p.frameCount;
				showBindPose0 = p.showBindPose;
				anim0 = p.animate;
				skin.setMesh(p);
				skin.setData(p.deformedFlat);
				if (skin.lastUploadedIdx === -2 || p.showBindPose !== showBindPosePrev || p.animate === false && skinLastAnimate === true) skin.uploadFrame(frameIdxRef.current, p.showBindPose, p.animate);
				skinLastAnimate = p.animate;
				showBindPosePrev = p.showBindPose;
				const liftY = computeMeshLiftY(p.meshData);
				let inPlaceX = 0, inPlaceZ = 0;
				if (p.inPlace && !p.showBindPose && p.soma77JointsFlat) {
					const stride = 231;
					const frameCount = Math.floor(p.soma77JointsFlat.length / stride);
					if (frameCount >= 1) {
						const r0x = p.soma77JointsFlat[0];
						const r0z = p.soma77JointsFlat[2];
						const base = Math.max(0, Math.min(p.frameIdx, frameCount - 1)) * stride;
						inPlaceX = (r0x - p.soma77JointsFlat[base]) * CM_TO_M;
						inPlaceZ = (r0z - p.soma77JointsFlat[base + 2]) * CM_TO_M;
					}
				}
				if (liftY !== lastLiftY || liftGroup.position.x !== inPlaceX || liftGroup.position.z !== inPlaceZ) {
					liftGroup.position.set(inPlaceX, liftY, inPlaceZ);
					lastLiftY = liftY;
				}
				const hasOrbs = p.lightingOrbs.length > 0;
				ambient.intensity = hasOrbs ? .06 : p.editMode ? .25 : .45;
				key.intensity = hasOrbs ? 0 : 1;
				key.castShadow = !hasOrbs;
				fill.intensity = hasOrbs ? 0 : .25;
				hemi.intensity = hasOrbs ? .08 : .35;
				groundMat.opacity = hasOrbs ? 0 : .55;
				const orbsSigNew = p.lightingOrbs.map((o) => `${o.id}:${o.position.join(",")}:${o.color}:${o.intensity}:${o.distance}:${o.castShadow}`).join(";");
				if (orbsSigNew !== orbsSig || p.selectedOrb !== lastOrbSel) {
					orbsSig = orbsSigNew;
					lastOrbSel = p.selectedOrb;
					orbs.onChange = p.onLightingOrbsChange;
					orbs.onSelectOrb = p.onSelectOrb;
					orbs.update(p.lightingOrbs, p.selectedOrb);
				}
				skeleton.update(p.layers.skeleton && !p.editMode ? p.editableJoints ?? p.soma77JointsFlat : null, p.frameIdx);
				if (p.editMode && !p.editRefMode && !!p.editableJoints) {
					manip.ensure(liftGroup);
					manip.active = true;
					manip.jointsFlat = p.editableJoints;
					manip.selectedJoint = p.selectedJoint;
					manip.selectedChain = p.selectedChain ?? null;
					manip.onSelectJoint = p.onSelectJoint;
					manip.onSelectChain = p.onSelectChain;
					manip.onJointMove = p.onJointMove;
					manip.gizmoMode = p.gizmoMode;
					manip.kinematicMode = p.kinematicMode ?? "fk";
					manip.root.visible = true;
					manip.updateJoints();
					manip.positionGizmo();
				} else {
					manip.active = false;
					if (manip.root !== null) manip.root.visible = false;
				}
				manip.syncGizmo();
				ghost.update(p.ghostJoints);
				contacts.update(p.footContacts, p.frameIdx, p.soma77JointsFlat);
				if (p.soma77JointsFlat !== arrowJointsRef) {
					arrowJointsRef = p.soma77JointsFlat;
					arrow.update(p.soma77JointsFlat);
				}
				arrow.setVisible(p.showStartingDirection && !p.editMode);
				const altSig = p.altSamples.map((s) => s.idx).join(",") + "#" + p.meshData.vertices.length;
				if (altSig !== lastAltSig) {
					lastAltSig = altSig;
					alts.update(p.altSamples, p.meshData, p.onCommitSample);
				} else if (p.altSamples.length > 0) alts.onCommit = p.onCommitSample;
				const eesSig = p.endEffectorPoints.map((e) => `${e.id}:${e.position.join(",")}:${e.frame}`).join(";");
				const r2dSig = p.root2dPoints.map((r) => `${r.frame}:${r.x},${r.z}`).join(";");
				if (eesSig !== lastEEsSig || r2dSig !== lastR2dSig || constraints.editMode !== p.editMode || constraints.selectedEEId !== (p.selectedEEId ?? null) || constraints.showLabels !== p.showConstraintLabels) {
					lastEEsSig = eesSig;
					lastR2dSig = r2dSig;
					constraints.onSelectEE = p.onSelectEE;
					constraints.onChangeEEPoint = p.onChangeEEPoint;
					constraints.update(p.root2dPoints, p.endEffectorPoints, p.showConstraintLabels, p.editMode, p.selectedEEId ?? null);
				}
				eePlane.update(p.placingEE, p.eePlaceJointIdx, p.editableJoints, p.soma77JointsFlat, p.frameIdx, p.onPlaceEE);
				reference.update(p);
				if (p.cameraView !== lastCameraView || p.framing !== lastFraming) {
					lastCameraView = p.cameraView;
					lastFraming = p.framing;
					applyCamera(p.cameraView, p.framing);
				}
			}
			let skinLastAnimate = false;
			let showBindPosePrev = true;
			let animLastFrameCount = 1;
			const framedCameraPosFor = (view, framing) => framedCameraPos(view, framing);
			const applyCamera = (view, framing) => {
				const [pos, ty] = framedCameraPosFor(view, framing);
				stage.camera.position.set(pos[0], pos[1], pos[2]);
				stage.controls.target.set(0, ty, 0);
				stage.controls.update();
				stage.camera.lookAt(0, ty, 0);
			};
			return {
				threeCtx: {
					gl: stage.renderer,
					scene,
					camera: stage.camera
				},
				update,
				applyCamera,
				setDarkMode(dark) {
					if (dark !== darkCur) {
						darkCur = dark;
						stage.renderer.setClearColor(new _melite_three_client_client.Color(dark ? _melite_card_base_client.STAGE_BACKGROUND_DARK : _melite_card_base_client.STAGE_BACKGROUND_LIGHT));
					}
				},
				dispose() {
					manip.tc?.dispose();
					refManip.tc?.dispose();
					constraints.eeTC?.dispose();
					for (const e of orbs.entries) e.tc?.dispose();
					skin.geo?.dispose();
					skin.mat?.dispose();
					reference.disposeMesh();
					if (reference.skeleton !== null) {
						reference.skeleton.spheres.geometry.dispose();
						reference.skeleton.spheres.material.dispose();
						reference.skeleton.boneGeo.dispose();
						reference.skeleton.lines.material.dispose();
					}
					stage.dispose();
				}
			};
		}
		//#endregion
		//#region ../../engines/comfyui/src/action_cards/motion/ui/viewer3d/PoseViewer3D.tsx
		/**
		* PoseViewer3D — Three.js skinned humanoid figure from SOMA mesh (NVIDIA mesh).
		*
		* ALWAYS shows the bind mesh (T-pose NVIDIA humanoid) when loaded — even when
		* no 3D frame data is available yet. When valid frame data arrives it deforms
		* the mesh via /poser/skin/deform (COCO-18) or /poser/skin/deform_soma (SOMA-77).
		*
		* For text-to-pose results, pre-computed deformed vertices arrive as base64-encoded
		* float32 binary (deformedVerticesB64). These are decoded ONCE to a Float32Array
		* and indexed DIRECTLY into the geometry buffer (no nested-array conversion —
		* building 60×18056 = 1.08M small JS arrays freezes the browser tab).
		*
		* Mirrors the Kimodo demo scene (vendor/kimodo/kimodo/viz/scene.py):
		*   - Camera at [2.74, 1.88, 7.68], look-at [0, 0.9, 0], fov 45°
		*   - Grid at y=0, infinite, fade_distance ~ 3×floor_len
		*   - Bind pose lifted so feet clear the floor: bind_pos.y -= min_y; bind_pos.y += 0.02
		*   - Mesh color LIGHT_THEME (152,189,255) = #98BDFF
		*   - Per-frame set_pose() writes deformed verts directly into BufferGeometry
		*
		* RENDERED ON THE SHARED RAW-THREE STAGE (poseStage over card-base stage3d —
		* the substrate law). This file is the REACT SHELL: it owns the async data
		* plumbing (bind-mesh fetch, base64 decode, alt-sample decode, reference
		* bundle resolution) and syncs props into the imperative scene every render.
		* The old @react-three/fiber JSX tree and the drei components live on only
		* as their imperative analogues in poseStage.ts (the 2026-09-13 port).
		*/
		/** The layers default (the altSamples law's twin): a hoisted shared
		*  OFF state — a per-render `= {}` default would give every omitting
		*  render a NEW identity and re-sync the stage for nothing. */
		const NO_LAYERS = {
			wireframe: false,
			skeleton: false
		};
		const NUM_VERTS = 18056;
		const ALT_NUM_VERTS = 18056;
		/** The altSamples default (stroke 77 bug fix): a hoisted shared
		*  empty — a per-render `= []` default gave every omitting render a
		*  NEW array identity, so the [altSamples] decode effect refired
		*  each render and its setState seeded an async render loop (proven
		*  by the motion burn-down's effect census). One stable identity,
		*  never mutated. */
		const NO_ALT_SAMPLES = [];
		function PoseViewer3DImpl({ deformedVerticesB64, deformedVertsDirect, frameIdx, onFrameChange, animate = false, cameraView = "demo", cameraFraming = "full", height = "100%", opacity = 1, layers = NO_LAYERS, color = "#98bdf7", fps = 30, forceBindPose = false, soma77Joints = null, soma77JointsFlat: soma77JointsFlatProp = null, editMode = false, editableJoints = null, selectedJoint = null, onSelectJoint, onSelectChain, onJointMove, selectedChain = null, kinematicMode = "fk", gizmoMode = "rotate", editedDeformedB64 = null, lightingOrbs = [], onLightingOrbsChange, selectedOrb = null, onSelectOrb, ghostJoints = null, cameraFov = 45, darkMode = true, playbackSpeed = 1, identityModel = "anny", identityCoeffs = null, localChanges = null, customTargets = null, footContacts = null, showFootContacts = false, showStartingDirection = false, altSamples = NO_ALT_SAMPLES, onCommitSample = () => {}, root2dPoints = [], endEffectorPoints = [], showConstraintLabels = true, selectedEEId = null, onSelectEE, onChangeEEPoint, placingEE = false, eePlaceJointIdx, onPlaceEE, referenceMesh = null, refPlaybackFrameIdx, editRefMode = false, refEditableJoints, onRefJointMove, onCanvasReady, threeCtxRef, inPlace = false, customBindMesh = null }) {
			const [meshData, setMeshData] = (0, react.useState)(null);
			const [meshLoading, setMeshLoading] = (0, react.useState)(true);
			const [meshError, setMeshError] = (0, react.useState)(null);
			const [deformedFlat, setDeformedFlat] = (0, react.useState)(null);
			const [altDecoded, setAltDecoded] = (0, react.useState)([]);
			const canvasRef = (0, react.useRef)(null);
			const stageRef = (0, react.useRef)(null);
			const soma77JointsFlat = (0, react.useMemo)(() => {
				if (soma77JointsFlatProp) return soma77JointsFlatProp;
				if (!soma77Joints || soma77Joints.length === 0) return null;
				const T = soma77Joints.length;
				const flat = new Float32Array(T * 77 * 3);
				for (let f = 0; f < T; f++) {
					const frame = soma77Joints[f];
					if (!frame || frame.length < 77) continue;
					for (let j = 0; j < 77; j++) {
						const ji = (f * 77 + j) * 3;
						flat[ji] = frame[j][0];
						flat[ji + 1] = frame[j][1];
						flat[ji + 2] = frame[j][2];
					}
				}
				return flat;
			}, [soma77Joints, soma77JointsFlatProp]);
			const [refBundle, setRefBundle] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!referenceMesh) {
					setRefBundle(null);
					return;
				}
				let cancelled = false;
				setRefBundle({
					spec: referenceMesh,
					meshData: null,
					flat: null,
					editedFlat: null
				});
				(async () => {
					try {
						const mesh = await fetchBindMesh({
							identityModel: referenceMesh.identityModel ?? "anny",
							identityCoeffs: referenceMesh.identityCoeffs,
							localChanges: referenceMesh.localChanges,
							customTargets: referenceMesh.customTargets
						});
						if (!cancelled) setRefBundle((b) => b !== null && b.spec === referenceMesh ? {
							...b,
							meshData: mesh
						} : b);
					} catch (e) {
						console.error("ReferenceMesh bind fetch failed:", e);
					}
					if (referenceMesh.deformedVerticesB64) try {
						const res = await fetch(`data:application/octet-stream;base64,${referenceMesh.deformedVerticesB64}`);
						if (cancelled) return;
						const buf = await res.arrayBuffer();
						if (cancelled) return;
						setRefBundle((b) => b !== null && b.spec === referenceMesh ? {
							...b,
							flat: new Float32Array(buf)
						} : b);
					} catch (e) {
						if (!cancelled) console.error("ReferenceMesh decode failed:", e);
					}
					if (referenceMesh.editedDeformedVerticesB64) try {
						const res = await fetch(`data:application/octet-stream;base64,${referenceMesh.editedDeformedVerticesB64}`);
						if (cancelled) return;
						const buf = await res.arrayBuffer();
						if (cancelled) return;
						setRefBundle((b) => b !== null && b.spec === referenceMesh ? {
							...b,
							editedFlat: new Float32Array(buf)
						} : b);
					} catch (e) {
						if (!cancelled) console.error("ReferenceMesh edited decode failed:", e);
					}
				})();
				return () => {
					cancelled = true;
				};
			}, [referenceMesh]);
			const coeffsKey = identityCoeffs && identityCoeffs.length > 0 ? identityCoeffs.map((v) => v.toFixed(1)).join(",") : "";
			const localChangesKey = localChanges && Object.keys(localChanges).length > 0 ? Object.entries(localChanges).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${(Math.round(v * 20) / 20).toFixed(2)}`).join(",") : "";
			const customTargetsKey = customTargets && Object.keys(customTargets).length > 0 ? Object.entries(customTargets).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${(Math.round(v * 20) / 20).toFixed(2)}`).join(",") : "";
			(0, react.useEffect)(() => {
				if (customBindMesh) {
					setMeshData(customBindMesh);
					setMeshLoading(false);
					setMeshError(null);
					return;
				}
				let cancel = false;
				setMeshLoading(true);
				setMeshError(null);
				const timer = setTimeout(() => {
					fetchBindMesh({
						identityModel,
						identityCoeffs,
						localChanges,
						customTargets
					}).then((d) => {
						if (!cancel) {
							setMeshData(d);
							setMeshLoading(false);
						}
					}).catch((e) => {
						if (!cancel) {
							setMeshError(e.message);
							setMeshLoading(false);
						}
					});
				}, 60);
				return () => {
					cancel = true;
					clearTimeout(timer);
				};
			}, [
				identityModel,
				coeffsKey,
				localChangesKey,
				customTargetsKey,
				customBindMesh
			]);
			const activeB64 = editedDeformedB64 ?? deformedVerticesB64;
			(0, react.useEffect)(() => {
				if (deformedVertsDirect && !editedDeformedB64) {
					setDeformedFlat(deformedVertsDirect);
					return;
				}
				if (!activeB64) {
					setDeformedFlat(null);
					return;
				}
				let cancelled = false;
				setDeformedFlat(null);
				(async () => {
					try {
						const res = await fetch(`data:application/octet-stream;base64,${activeB64}`);
						if (cancelled) return;
						const buf = await res.arrayBuffer();
						if (cancelled) return;
						setDeformedFlat(new Float32Array(buf));
					} catch (e) {
						if (!cancelled) console.error("Failed to decode deformed_vertices_b64:", e);
						try {
							const binary = atob(activeB64);
							const bytes = new Uint8Array(binary.length);
							for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
							if (!cancelled) setDeformedFlat(new Float32Array(bytes.buffer));
						} catch (e2) {
							if (!cancelled) {
								console.error("Fallback decode also failed:", e2);
								setDeformedFlat(null);
							}
						}
					}
				})();
				return () => {
					cancelled = true;
				};
			}, [
				activeB64,
				deformedVertsDirect,
				editedDeformedB64
			]);
			(0, react.useEffect)(() => {
				if (!altSamples || altSamples.length === 0) {
					setAltDecoded([]);
					return;
				}
				let cancelled = false;
				const decoded = [];
				(async () => {
					for (let i = 0; i < altSamples.length; i++) {
						if (cancelled) return;
						const s = altSamples[i];
						try {
							const res = await fetch(`data:application/octet-stream;base64,${s.deformed_vertices_b64}`);
							if (cancelled) return;
							const buf = await res.arrayBuffer();
							if (cancelled) return;
							const frame0 = new Float32Array(buf).subarray(0, ALT_NUM_VERTS * 3);
							decoded.push({
								idx: i + 1,
								verts: new Float32Array(frame0)
							});
							if (!cancelled) setAltDecoded([...decoded]);
						} catch (e) {
							console.error("[PoseViewer3D] alt-sample decode failed:", e);
						}
					}
				})();
				return () => {
					cancelled = true;
				};
			}, [altSamples]);
			const hasDeformed = !!deformedFlat && deformedFlat.length >= NUM_VERTS * 3;
			const computedFrameCount = hasDeformed ? Math.floor(deformedFlat.length / (NUM_VERTS * 3)) : 0;
			const showBindPose = forceBindPose || !hasDeformed || !meshData;
			const cameraPos = (0, react.useMemo)(() => framedCameraPos(cameraView, cameraFraming)[0], [cameraView, cameraFraming]);
			(0, react.useEffect)(() => {
				const canvas = canvasRef.current;
				if (!canvas || !meshData) return;
				const handle = mountPoseStage(canvas, {
					fov: cameraFov,
					camera: cameraPos,
					darkMode,
					onCanvasReady
				});
				if (handle === null) return;
				stageRef.current = handle;
				if (threeCtxRef) threeCtxRef.current = handle.threeCtx;
				return () => {
					stageRef.current = null;
					if (threeCtxRef) threeCtxRef.current = null;
					handle.dispose();
				};
			}, [meshData]);
			(0, react.useEffect)(() => {
				const stage = stageRef.current;
				if (!stage || !meshData) return;
				stage.update({
					meshData,
					deformedFlat: hasDeformed ? deformedFlat : null,
					numVerts: NUM_VERTS,
					frameCount: computedFrameCount || 1,
					frameIdx,
					setFrameIdx: onFrameChange ?? (() => {}),
					animate,
					showBindPose,
					opacity,
					layers,
					color,
					fps,
					soma77JointsFlat,
					editMode,
					editableJoints,
					selectedJoint,
					onSelectJoint: onSelectJoint ?? (() => {}),
					onSelectChain,
					onJointMove: onJointMove ?? (() => {}),
					selectedChain,
					kinematicMode,
					gizmoMode,
					lightingOrbs,
					onLightingOrbsChange,
					selectedOrb,
					onSelectOrb,
					ghostJoints,
					playbackSpeed,
					footContacts,
					showFootContacts,
					showStartingDirection,
					altSamples: altDecoded,
					onCommitSample,
					root2dPoints,
					endEffectorPoints,
					showConstraintLabels,
					selectedEEId,
					onSelectEE,
					onChangeEEPoint,
					placingEE,
					eePlaceJointIdx: eePlaceJointIdx ?? 0,
					onPlaceEE: onPlaceEE ?? (() => {}),
					cameraView,
					framing: cameraFraming,
					reference: refBundle,
					refPlaybackFrameIdx,
					editRefMode,
					refEditableJoints,
					onRefJointMove,
					inPlace
				});
				stage.setDarkMode(darkMode);
			});
			if (meshLoading) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PoseViewer3D_module_css_default.loadingBox,
				style: { height },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { className: PoseViewer3D_module_css_default.loadingIcon }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: PoseViewer3D_module_css_default.loadingLabel,
					children: actionCopy.poseLoadingMesh
				})]
			});
			if (meshError) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PoseViewer3D_module_css_default.errorBox,
				style: { height },
				children: actionCopy.poseMeshError({ error: meshError })
			});
			if (!meshData) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PoseViewer3D_module_css_default.errorBox,
				style: { height },
				children: actionCopy.poseNoMesh
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					height,
					width: "100%",
					position: "relative"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
					ref: canvasRef,
					style: {
						display: "block",
						width: "100%",
						height: "100%"
					},
					"data-testid": "pose-viewer-3d"
				})
			});
		}
		const PoseViewer3D = (0, react.memo)(PoseViewer3DImpl);
		//#endregion
		//#region src/ui/studio/MotionStageView.tsx
		function MotionStageView({ stageBoxRef, bgDragOver, setBgDragOver, handleStageDrop, bgImage, skin, allVertsM, restB64, editedDeformedB64, frameIdx, setFrameIdx, npz, playing, editMode, cameraView, framing, jointsFlatCm, showSkeleton, effectiveNpz, customBindMesh, inPlace, threeCtxRef, editableJoints, selectedJoint, setSelectedJoint, handleJointMove, loading, error, setCameraView, setFraming, exportOpen, stageRect, beginRectDrag, onRectPointerMove, endRectDrag, setExportOpen, npzUrl, stage, setPlaying, displayJointsM, liftY, setStageRect, exportOut, handleOutSize, handleFramePreset }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: component_module_css_default.centerRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_melite_card_base_client.ViewportFrame, {
					ref: stageBoxRef,
					className: (0, _melite_card_base_client.cn)(component_module_css_default.stageFrame, bgDragOver && component_module_css_default.stageFrameDrag),
					onDragOver: (e) => {
						if (e.dataTransfer.types.includes(_melite_card_base_client.ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
							e.preventDefault();
							setBgDragOver(true);
						}
					},
					onDragLeave: () => setBgDragOver(false),
					onDrop: handleStageDrop,
					children: [
						bgImage && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ViewportAnchor, {
							dock: "fill",
							className: component_module_css_default.ovBg,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: bgImage,
								alt: "",
								"aria-hidden": true,
								className: component_module_css_default.bgImg
							})
						}),
						bgDragOver && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ViewportAnchor, {
							dock: "fill",
							className: component_module_css_default.ovDrop,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: component_module_css_default.dropVeil,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: component_module_css_default.dropVeilLabel,
									children: motionCopy.dropHint
								})
							})
						}),
						skin ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PoseViewer3D, {
							deformedVertsDirect: allVertsM,
							deformedVerticesB64: /* v8 ignore next -- the viewer renders only when skin loaded, which seeds restB64 (probe 2026-09-19) */ restB64 ?? "",
							editedDeformedB64,
							frameIdx,
							onFrameChange: setFrameIdx,
							animate: npz ? playing && !editMode : false,
							fps: npz?.fps ?? 30,
							cameraView,
							cameraFraming: framing,
							soma77JointsFlat: jointsFlatCm,
							layers: {
								wireframe: false,
								skeleton: /* v8 ignore next -- viewer renders only under skin ⟹ restNpz/effectiveNpz/restB64 non-null (probe 2026-09-19) */ effectiveNpz ? showSkeleton && !editMode : false
							},
							customBindMesh,
							identityModel: "soma",
							inPlace,
							threeCtxRef,
							darkMode: true,
							editMode,
							editableJoints,
							selectedJoint,
							onSelectJoint: setSelectedJoint,
							onJointMove: handleJointMove,
							kinematicMode: "ik",
							gizmoMode: "translate"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "status",
							"aria-busy": "true",
							"aria-label": motionCopy.loadingMannequin,
							className: component_module_css_default.stageLoading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Skeleton, { className: component_module_css_default.skelAvatar }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Skeleton, { className: component_module_css_default.skelLine })]
						}),
						loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ViewportAnchor, {
							dock: "fill",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								role: "status",
								"aria-busy": "true",
								"aria-label": motionCopy.loadingMotion,
								className: component_module_css_default.stageVeil,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Skeleton, { className: component_module_css_default.skelAvatarSm }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Skeleton, { className: component_module_css_default.skelLine })]
							})
						}),
						error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ViewportAnchor, {
							dock: "fill",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: component_module_css_default.stageVeil,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular, { className: component_module_css_default.warnIcon }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: component_module_css_default.veilText,
									children: error
								})]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ViewportAnchor, {
							dock: "top-right",
							className: component_module_css_default.ovCam,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: component_module_css_default.camPill,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
										tip: motionCopy.rotateLeft,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											onClick: () => setCameraView(stepAzimuth(cameraView, -1)),
											"aria-label": motionCopy.rotateLeft,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.RotateCcw, { className: component_module_css_default.i14 })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: component_module_css_default.camDivider }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
										tip: motionCopy.framingFull,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: framing === "full" ? "primary" : "outline",
											size: "sm",
											onClick: () => setFraming("full"),
											"aria-label": motionCopy.framingFull,
											"aria-pressed": framing === "full",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PersonStanding, { className: component_module_css_default.i14 })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
										tip: "Upper half framing — closer, chest-height camera at the same angle",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: framing === "upper" ? "primary" : "outline",
											size: "sm",
											onClick: () => setFraming("upper"),
											"aria-label": motionCopy.framingUpper,
											"aria-pressed": framing === "upper",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutlineRegular, { className: component_module_css_default.i14 })
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
										tip: motionCopy.rotateRight,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											size: "sm",
											onClick: () => setCameraView(stepAzimuth(cameraView, 1)),
											"aria-label": motionCopy.rotateRight,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.RotateCw, { className: component_module_css_default.i14 })
										})
									})
								]
							})
						}),
						exportOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_melite_card_base_client.ViewportAnchor, {
							"data-export-rect-overlay": true,
							dock: "fill",
							className: component_module_css_default.ovRect,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								"data-export-rect": true,
								role: "presentation",
								"aria-label": motionCopy.exportRectAria,
								onPointerDown: (e) => beginRectDrag(e, "move"),
								onPointerMove: onRectPointerMove,
								onPointerUp: endRectDrag,
								onPointerCancel: endRectDrag,
								className: component_module_css_default.exportRect,
								style: {
									left: `${stageRect.x * 100}%`,
									top: `${stageRect.y * 100}%`,
									width: `${stageRect.w * 100}%`,
									height: `${stageRect.h * 100}%`,
									boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)"
								},
								children: [
									[
										{
											corner: "nw",
											cls: component_module_css_default.cornerNW
										},
										{
											corner: "ne",
											cls: component_module_css_default.cornerNE
										},
										{
											corner: "sw",
											cls: component_module_css_default.cornerSW
										},
										{
											corner: "se",
											cls: component_module_css_default.cornerSE
										}
									].map((h) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										"data-export-corner": h.corner,
										onPointerDown: (e) => beginRectDrag(e, h.corner),
										onPointerMove: onRectPointerMove,
										onPointerUp: endRectDrag,
										onPointerCancel: endRectDrag,
										className: (0, _melite_card_base_client.cn)(component_module_css_default.cornerHandle, h.cls)
									}, h.corner)),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: component_module_css_default.crossV }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: component_module_css_default.crossH })
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.ViewportAnchor, {
								dock: "bottom-center",
								className: component_module_css_default.rectHint,
								children: motionCopy.rectHint
							})]
						})
					]
				}), effectiveNpz && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionExportDialog, {
					open: exportOpen,
					onClose: () => setExportOpen(false),
					npz: effectiveNpz,
					npzUrl,
					glbUrl: stage.result?.motionPreviews?.find((m) => m.url)?.url ?? null,
					frameIdx,
					onFrameChange: (f) => {
						setFrameIdx(f);
						setPlaying(false);
					},
					cameraView,
					displayJointsM,
					liftY,
					inPlace,
					threeCtxRef,
					stageRect,
					onStageRectChange: setStageRect,
					outW: exportOut.w,
					outH: exportOut.h,
					onOutSize: handleOutSize,
					onFramePreset: handleFramePreset
				})]
			});
		}
		//#endregion
		//#region src/ui/studio/MotionTimelineSection.tsx
		function MotionTimelineSection({ npz, editMode, playing, setPlaying, fmt, curSec, totalSec, tlPrompts, targetT, addPromptCard, tlKeyframes, frameIdx, effectiveNpz, onTimelineExtend, handleTimelineFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptMove, onPromptResize, onPromptDelete, bodyWireOpen, onWireSlot, priorStages, bodyWired, bodyWiredId, onSave, setBodyGlbState, setBodyNotice, setBodyWireOpen }) {
			/* v8 ignore next 1 -- targetT ≥ 1 from every constructor (probe 2026-09-19): the empty-timeline face is the zero-frame fence */
			const emptyTimelineFace = !targetT && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: component_module_css_default.timelineEmpty,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInfoOutlineRegular, { className: component_module_css_default.i14 }), motionCopy.emptyTimeline]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_melite_card_base_client.PaneShell, {
					className: component_module_css_default.timelineShell,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PaneHeader, {
							variant: "strip",
							className: component_module_css_default.transportHead,
							lead: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: !npz ? "Run the card first — nothing to play yet" : editMode ? "Pause playback while refining" : playing ? motionCopy.pauseSpace : motionCopy.playSpace,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: component_module_css_default.contents,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											onClick: () => setPlaying((p) => !p),
											disabled: editMode || !npz,
											"aria-label": playing ? motionCopy.pauseSpace : motionCopy.playSpace,
											className: component_module_css_default.playBtn,
											children: playing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPauseOutlineRegular, { className: component_module_css_default.i14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.PlayAlt, { className: component_module_css_default.playIcon })
										})
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: component_module_css_default.timeWrap,
									children: npz ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: component_module_css_default.timeText,
										children: [
											fmt(curSec),
											" / ",
											fmt(totalSec)
										]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: component_module_css_default.noMotion,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInfoOutlineRegular, { className: component_module_css_default.i14 }), motionCopy.noMotion]
									})
								}),
								npz && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: component_module_css_default.fpsChip,
									children: motionCopy.fpsChip({
										fps: npz.fps.toFixed(0),
										frames: npz.T
									})
								})
							] }),
							hint: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: component_module_css_default.hintWrap,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: component_module_css_default.hintTitle,
									children: [motionCopy.timelineTitle, tlPrompts.length > 0 ? ` (${tlPrompts.length})` : ""]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.Tip, {
									tip: /* v8 ignore next -- targetT = max(baseT≥1, …) ≥ 1 from every constructor (probe 2026-09-19) */ targetT > 0 ? "Add a new prompt card — splits the last card so you can type a distinct motion for that segment" : "Loading the timeline…",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: component_module_css_default.contents,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "ghost",
											onClick: addPromptCard,
											disabled: targetT <= 0,
											className: component_module_css_default.addCardBtn,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { className: component_module_css_default.i12 }), motionCopy.addPromptCard]
										})
									})
								})]
							})
						}),
						targetT > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionTimelineBar, {
							prompts: tlPrompts,
							keyframes: tlKeyframes,
							frameIdx,
							totalFrames: targetT,
							fps: effectiveNpz?.fps ?? 30,
							onExtend: onTimelineExtend,
							onFrameChange: handleTimelineFrameChange,
							onKeyframeAdd,
							onKeyframeMove,
							onKeyframeDelete,
							onPromptUpdate,
							onPromptMove,
							onPromptResize,
							onPromptDelete
						}),
						emptyTimelineFace
					]
				}),
				editMode && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: component_module_css_default.editHintBar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.RotateCw, { className: component_module_css_default.editHintIcon }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						motionCopy.editHintLead,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", {
							className: component_module_css_default.editHintStrong,
							children: [" ", motionCopy.repose]
						}),
						" ",
						motionCopy.editHintTail
					] })]
				}),
				bodyWireOpen && onWireSlot && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.WirePickerModal, {
					slot: "preview_glb",
					priorStages,
					currentId: bodyWired ? bodyWiredId : "",
					currentOutput: null,
					onPick: (upstreamId) => {
						onWireSlot("preview_glb", upstreamId, null);
						setBodyGlbState(null);
						setBodyNotice(null);
						setBodyWireOpen(false);
					},
					onUnwire: () => {
						onWireSlot("preview_glb", null, null);
						onSave({ ["preview_glb"]: null });
						setBodyWireOpen(false);
					},
					onClose: () => setBodyWireOpen(false)
				})
			] });
		}
		//#endregion
		//#region src/ui/studio/component.tsx
		/**
		* MotionCardEditor — the drill-down surface for a genre:"motion" card
		* (kimodo text→motion). Turns the card into a live 3D stage like the Body
		* Card: the somax mannequin rendered from the run's motion NPZ, a scrubber
		* strip, an 8-angle azimuth ring, click-drag joint refinement, and the
		* VNCCS export pair (mesh + openpose at an azimuth).
		*
		* Data flow (all client-side, mirrors MotionViewer):
		* 1. npzUrl from stage.result.artifacts["motion_npz"] (fallback: first
		* .npz asset) → loadMotionNpz (meters) + loadSomaSkin (neutral bind).
		* 2. precomputeDeformedVerts → (T, V, 3) meters → vertsToB64(…, cm) →
		* PoseViewer3D's deformedVerticesB64. The skin's bind mesh (meters →
		* cm) is handed over as customBindMesh so the viewer skips the
		* /poser/skin/mesh fetch entirely — the render is 1:1 with MotionViewer.
		* 3. Playback is PoseViewer3D's own AnimController (animate prop); the
		* scrubber reads frameIdx (throttled ~10fps) + seeks by state.
		*
		* FREEZE → STOP (2026-08-15): the studio SHELL owns the rail's Run row and
		* with it the interrupt (editorClient.stopRun → /v1/flows/stop → ComfyUI
		* /interrupt — the kimodo node's per-step hook makes the abort land
		* mid-generation). The tenant carries ZERO rpc imports: its only write
		* channel is onSave (E1 — the tenant-props contract, web-kit/contracts
		* studio.ts; zero RPC imports by construction).
		*
		* REPOSE (Phase B): edit mode drives PoseViewer3D's joint gizmos. The
		* sculpt is re-skinned client-side (edited joints cm→m → deformFrame →
		* vertsToB64 → editedDeformedB64). "Repose" patches the current frame's
		* rotations (patchFrame), truncates the motion to frameIdx+1, writes an NPZ
		* data URL, and saves it as prev_motion_artifact (the chain slot —
		* _upload_input_images converts the data URL to a bare .npz). The user hits
		* Run separately — kimodo conditions the next generation on the saved pose.
		* Zero backend changes.
		*
		* NO-RUN STATE (2026-08-10, policy: "compare it to the Kimodo Pose
		* Studio"): the stage ALWAYS renders. Before any run exists there is no NPZ,
		* so PoseViewer3D receives no deformed vertices and SkinnedHumanoid falls
		* back to the bind pose — the neutral somax mannequin, live and interactive
		* (orbit/zoom/azimuth), exactly like opening the pose studio. Scrubber,
		* Refine, and Export stay honestly disabled ("run the card" hints) — no
		* placeholder preview, no blank box.
		*
		* SPLIT (godfile remediation): this module is now state orchestration +
		* composition only. The inner units moved verbatim to seams —
		* useMotionUndoStack (undo/redo), useMotionMedia (body/skin/load/playback/
		* thumb/background), usePoseEditing (edit mode + reskin + repose),
		* useMotionStage (joints flat + stamp/discard + export framing),
		* useTimelineEnvelope (envelope math + pull-the-tail),
		* useTimelineAuthoring (timeline CRUD verbs), and the MotionRail /
		* MotionStageView / MotionTimelineSection panels.
		*
		* ONE TRUTH (2026-11-05, nativity audit F7 — the h3-timeline pattern):
		* stage.params is the ONLY document state. The tlPrompts/tlKeyframes/
		* tlIntervals/constraintPayloads mirrors, the once-only hydration, the
		* echo-guard persist effects, and the derived `prompt` write-back are
		* gone: useMotionDoc projects the row, overlays the transient op log,
		* and commits every gesture straight through onSave (fused prompts
		* statement: motion_prompts + prompt in ONE call). The bar renders the
		* shown projection; an external bench write re-hydrates naturally.
		*/
		function MotionCardEditor({ stage, onSave, upstreams = [], onWireSlot, runCompiledGeneration }) {
			const toast = (0, _melite_card_base_client.useToastStore)((s) => s.addToast);
			const userParams = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const { spec: kimodoSpec, error: kimodoError, resolved: paramValues, edit: onParamEdit } = (0, _melite_card_base_client.useResolvedForm)("kimodo", userParams, (name, value) => {
				onSave({ [name]: value });
			});
			const npzUrl = (0, react.useMemo)(() => {
				const arts = stage.result?.artifacts;
				if (arts) {
					const named = arts["motion_npz"];
					if (typeof named === "string") return named;
					const npzArt = Object.values(arts).find((u) => typeof u === "string" && u.endsWith(".npz"));
					if (npzArt) return npzArt;
				}
				return stage.result?.assetUrls?.find((u) => typeof u === "string" && u.endsWith(".npz")) ?? null;
			}, [stage.result]);
			const [bodyGlb, setBodyGlbState] = (0, react.useState)(null);
			const [bodyNotice, setBodyNotice] = (0, react.useState)(null);
			const [bodyWireOpen, setBodyWireOpen] = (0, react.useState)(false);
			const [skin, setSkin] = (0, react.useState)(null);
			const [npz, setNpz] = (0, react.useState)(null);
			const [allVertsM, setAllVertsM] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const [keptEdit, setKeptEdit] = (0, react.useState)(null);
			const [frameIdx, setFrameIdx] = (0, react.useState)(0);
			const [playing, setPlaying] = (0, react.useState)(false);
			const [editMode, setEditMode] = (0, react.useState)(false);
			const [editableJoints, setEditableJoints] = (0, react.useState)(null);
			const editableJointsRef = (0, react.useRef)(null);
			const [selectedJoint, setSelectedJoint] = (0, react.useState)(null);
			const [editedDeformedB64, setEditedDeformedB64] = (0, react.useState)(null);
			const [reposing, setReposing] = (0, react.useState)(false);
			const [cameraView, setCameraView] = (0, react.useState)("az-0");
			const [framing, setFraming] = (0, react.useState)("full");
			const [showSkeleton, setShowSkeleton] = (0, react.useState)(true);
			const [inPlace, setInPlace] = (0, react.useState)(false);
			const [exportOpen, setExportOpen] = (0, react.useState)(false);
			const [stageRect, setStageRect] = (0, react.useState)(DEFAULT_STAGE_RECT);
			const threeCtxRef = (0, react.useRef)(null);
			const [bgImage, setBgImage] = (0, react.useState)(null);
			const [bgDragOver, setBgDragOver] = (0, react.useState)(false);
			const restNpz = (0, react.useMemo)(() => {
				if (!skin) return null;
				return {
					posedJoints: skin.restJoints,
					globalRotMats: skin.restRots,
					fps: 30,
					T: 1
				};
			}, [skin]);
			const effectiveNpz = npz ?? restNpz;
			const effectiveVertsM = (0, react.useMemo)(() => {
				if (!restNpz || !skin) return null;
				return precomputeDeformedVerts(restNpz, skin);
			}, [restNpz, skin]);
			const restB64 = (0, react.useMemo)(() => effectiveVertsM ? vertsToB64(effectiveVertsM, true) : null, [effectiveVertsM]);
			const customBindMesh = (0, react.useMemo)(() => {
				if (!skin) return null;
				const bv = skin.bindVertices;
				const vertices = [];
				for (let i = 0; i < bv.length; i += 3) vertices.push([
					bv[i] * 100,
					bv[i + 1] * 100,
					bv[i + 2] * 100
				]);
				const f = skin.faces;
				const faces = [];
				for (let i = 0; i < f.length; i += 3) faces.push([
					f[i],
					f[i + 1],
					f[i + 2]
				]);
				return {
					vertices,
					faces
				};
			}, [skin]);
			const liftY = (0, react.useMemo)(() => {
				if (!skin) return 0;
				let minY = Infinity;
				const bv = skin.bindVertices;
				for (let i = 1; i < bv.length; i += 3) if (bv[i] < minY) minY = bv[i];
				return isFinite(minY) ? FLOOR_LIFT_Y$1 - minY : FLOOR_LIFT_Y$1;
			}, [skin]);
			const currentJointsM = (0, react.useMemo)(() => {
				const src = effectiveNpz;
				if (!src) return null;
				const i = Math.min(frameIdx, src.T - 1) * 77 * 3;
				return src.posedJoints.slice(i, i + 231);
			}, [effectiveNpz, frameIdx]);
			const { targetT, onTimelineExtend } = useTimelineEnvelope({
				stage,
				effectiveNpz,
				onSave,
				toast
			});
			const { shown, commitPrompts, commitConstraints } = useMotionDoc(stage, onSave, effectiveNpz?.fps ?? 30, targetT);
			const shownRef = (0, react.useRef)(shown);
			shownRef.current = shown;
			const fullbodyKfAtFrame = (0, react.useMemo)(() => shown.keyframes.find((k) => k.track_id === "fullbody" && k.frame === frameIdx) ?? null, [shown.keyframes, frameIdx]);
			const { bodySlotIdx, bodyWiredId, bodyWiredUpstream, bodyWired, bodyWiredUrl, bodySrc, attachBody, handleBodyFile, priorStages, setBg, handleBgFile, handleStageDrop } = useMotionMedia({
				stage,
				upstreams,
				onSave,
				onWireSlot,
				runCompiledGeneration,
				toast,
				bodyGlb,
				setBodyGlbState,
				setBodyNotice,
				skin,
				setSkin,
				npz,
				setNpz,
				allVertsM,
				setAllVertsM,
				setError,
				setLoading,
				setFrameIdx,
				setPlaying,
				setEditMode,
				setKeptEdit,
				setEditedDeformedB64,
				threeCtxRef,
				npzUrl,
				bgImage,
				setBgImage,
				setBgDragOver
			});
			const { pushUndo, handleUndo, handleRedo, maybePushDragUndo } = useMotionUndoStack({
				captureDoc: () => ({
					prompts: shownRef.current.prompts,
					keyframes: shownRef.current.keyframes,
					payloads: shownRef.current.payloads
				}),
				restoreDoc: (doc) => {
					commitPrompts(() => doc.prompts);
					commitConstraints((prev) => ({
						...prev,
						keyframes: doc.keyframes,
						payloads: doc.payloads
					}));
				},
				keptEdit,
				editedDeformedB64,
				editableJointsRef,
				setEditableJoints,
				setKeptEdit,
				setEditedDeformedB64,
				stageId: stage.id
			});
			const { toggleEdit, handleJointMove, displayJointsM, handleRepose } = usePoseEditing({
				effectiveNpz,
				frameIdx,
				tlKeyframes: shown.keyframes,
				constraintPayloads: shown.payloads,
				keptEdit,
				currentJointsM,
				fullbodyKfAtFrame,
				pushUndo,
				toast,
				skin,
				onSave,
				editMode,
				setEditMode,
				editableJoints,
				setEditableJoints,
				editableJointsRef,
				setSelectedJoint,
				setEditedDeformedB64,
				reposing,
				setReposing,
				setKeptEdit,
				setPlaying,
				commitConstraints
			});
			const { jointsFlatCm, discardKeptEdit, stampConstraintAtFrame, exportOut, handleOutSize, handleFramePreset, stageBoxRef, beginRectDrag, onRectPointerMove, endRectDrag } = useMotionStage({
				effectiveNpz,
				keptEdit,
				editableJoints,
				frameIdx,
				fullbodyKfAtFrame,
				toast,
				pushUndo,
				setKeptEdit,
				setEditedDeformedB64,
				commitConstraints,
				exportOpen,
				stageRect,
				setStageRect
			});
			const { handleTimelineFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete, addPromptCard } = useTimelineAuthoring({
				effectiveNpz,
				toast,
				pushUndo,
				maybePushDragUndo,
				targetT,
				setFrameIdx,
				setPlaying,
				commitConstraints,
				commitPrompts
			});
			const totalSec = npz ? npz.T / npz.fps : 0;
			const curSec = npz ? frameIdx / npz.fps : 0;
			const fmt = (s) => {
				const m = Math.floor(s / 60);
				return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_melite_card_base_client.StudioShell, {
				className: component_module_css_default.shellPad,
				params: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionRail, {
					effectiveNpz,
					showSkeleton,
					setShowSkeleton,
					inPlace,
					setInPlace,
					editMode,
					toggleEdit,
					fullbodyKfAtFrame,
					frameIdx,
					stampConstraintAtFrame,
					editableJoints,
					handleRepose,
					reposing,
					keptEdit,
					discardKeptEdit,
					kimodoSpec,
					kimodoError,
					paramValues,
					onParamEdit,
					exportOpen,
					setExportOpen,
					bgImage,
					handleBgFile,
					setBg,
					bodySrc,
					bodyWired,
					bodyWiredUpstream,
					bodyWiredUrl,
					handleBodyFile,
					toast,
					attachBody,
					onWireSlot,
					bodySlotIdx,
					onSave,
					stage,
					setBodyWireOpen,
					bodyNotice
				}),
				preview: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionStageView, {
					stageBoxRef,
					bgDragOver,
					setBgDragOver,
					handleStageDrop,
					bgImage,
					skin,
					allVertsM,
					restB64,
					editedDeformedB64,
					frameIdx,
					setFrameIdx,
					npz,
					playing,
					editMode,
					cameraView,
					framing,
					jointsFlatCm,
					showSkeleton,
					effectiveNpz,
					customBindMesh,
					inPlace,
					threeCtxRef,
					editableJoints,
					selectedJoint,
					setSelectedJoint,
					handleJointMove,
					loading,
					error,
					setCameraView,
					setFraming,
					exportOpen,
					stageRect,
					beginRectDrag,
					onRectPointerMove,
					endRectDrag,
					setExportOpen,
					npzUrl,
					stage,
					setPlaying,
					displayJointsM,
					liftY,
					setStageRect,
					exportOut,
					handleOutSize,
					handleFramePreset
				}),
				bottom: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MotionTimelineSection, {
					npz,
					editMode,
					playing,
					setPlaying,
					fmt,
					curSec,
					totalSec,
					tlPrompts: shown.prompts,
					targetT,
					addPromptCard,
					tlKeyframes: shown.keyframes,
					frameIdx,
					effectiveNpz,
					onTimelineExtend,
					handleTimelineFrameChange,
					onKeyframeAdd,
					onKeyframeMove,
					onKeyframeDelete,
					onPromptUpdate,
					onPromptMove,
					onPromptResize,
					onPromptDelete,
					bodyWireOpen,
					onWireSlot,
					priorStages,
					bodyWired,
					bodyWiredId,
					onSave,
					setBodyGlbState,
					setBodyNotice,
					setBodyWireOpen
				})
			});
		}
		(0, _melite_card_base_client.defineShellDeclaration)({
			preview: { kind: "native" },
			bottom: { kind: "timeline" },
			params: { slots: [] }
		});
		//#endregion
		//#region src/client/upstream.ts
		/**
		* motionUpstreamStages — the studio's upstream projection, INTERNAL
		* to the plugin (the export-discipline law, card-view-vs-dsh-web
		* audit: a UI plugin exports no values beyond what cordis loading
		* needs; pure helpers stay internal, testable from this module).
		*/
		/** The bench's upstream rows filtered to the host-declared prior
		* stages (priorStageIds absent = every upstream, the host's own
		* law).
		* @param props the owner props' upstream pair */
		function motionUpstreamStages(props) {
			const priorIds = props.priorStageIds === void 0 ? null : new Set(props.priorStageIds);
			return projectUpstreamStages(props).filter((upstream) => priorIds === null || priorIds.has(upstream.id));
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* motion client entry — the card package's OWN cards.stage.view
		* surface (the composition-root correction's law, closed 2026-09-12
		* for motion per the DSH extension examples: a UI-bearing package
		* ships BOTH faces — the node half stays source-loaded, the browser
		* half rides lib/client.js through the dsh.client declaration +
		* ./client export; the loader materializes it from the module
		* table). The studio was DEAD on the lane before this face existed
		* (component.tsx exported, nothing imported it).
		*
		* THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM
		* and whatever renders its authoring surface is INJECTED): the
		* motion card's authoring surface is this package's own studio —
		* src/ui/studio/component.tsx (MotionCardEditor, the pose-authoring
		* tenant). This module is the ADAPTER that mounts it on the bench
		* slot — never a second definition site: props translate onto the
		* tenant contract {stage, onSave, upstreams?}; the document rides
		* stage.params; writes ride onSave → onPatch (patchStageParams'
		* partial merge); the run rides the host drill's own Run row.
		*/
		(0, _melite_card_base_client.wireContractToastToRowStore)();
		/** The built-in registration (the ui-tool law, verbatim — the module
		* namespace IS the plugin: the loader consumes name/inject/apply).
		* Spelling note (card-UI audit NIT, 2026-11-05): this camelCase
		* `motionStudio` is the CLIENT PLUGIN registration name; the stage
		* VIEW projects a different identifier — the kebab kind tag
		* 'motion-studio' (web-kit's projectStageView). Two planes, two
		* spellings, deliberate; do not "converge" them. */
		const name = "motionStudio";
		const inject = ["slots"];
		const apply = (0, _melite_card_base_client.defineStageViewRegistration)("motion", MotionStudio, () => ({ runCompiledGeneration }));
		/** The motion surface — registered under key 'motion'. The ADAPTER:
		* the tenant mounted verbatim, one translate layer, zero paraphrase.
		* onWireSlot stays OMITTED (the tenant's own contract: omitting
		* hides the wire affordance — the bench slot has no wire door). */
		/** Internal (export-discipline rule 1): the adapter is the plugin's
		* own mount — only apply's registration consumes it. */
		function MotionStudio(props) {
			const stage = projectStageView(props, { genre: "motion" });
			const upstreams = motionUpstreamStages(props);
			return (0, react.createElement)(MotionCardEditor, {
				stage,
				onSave: (params) => {
					props.onPatch(params);
				},
				onWireSlot: props.onWireSlot,
				upstreams,
				runCompiledGeneration: props.runCompiledGeneration
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
