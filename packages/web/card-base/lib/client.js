window.__ModuleLoader__.load({
	id: "@melite/card-base",
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
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _melite_three_client_client = require("@melite/three-client/client");
		_melite_three_client_client = __toESM(_melite_three_client_client, 1);
		let react_dom = require("react-dom");
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
						callerSignal?.addEventListener("abort", () => ctrl.abort(), { once: true });
						const res = await fetch(input, {
							...init,
							signal: ctrl.signal
						});
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
						if (attempt < MAX_RETRIES$1 && Date.now() < deadline) await sleep$1(backoffMs$1(attempt));
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
		* Wire the toast pusher the contract stores report through.
		* @param toast - the row's addToast (browser) or a test recorder.
		*/
		function setContractToastSink$1(toast) {
			sink$1 = toast;
		}
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
				if (!(isObj$3(resolved) && isNonEmptyString$1(resolved.family) && isNonEmptyString$1(resolved.model)) && !isNonEmptyString$1(declaredFam)) missing.push("default_family or resolved route");
				if (!Array.isArray(entry.families) || entry.families.length === 0) missing.push("families");
				else if (entry.families.some((f) => !isNonEmptyString$1(f))) missing.push("families (non-string entries)");
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
			promptGuide: () => promptGuide$1,
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
		* null → populated. Returns an unsubscribe fn. */
		function onCatalogReady$1(fn) {
			return catalogStore$1.subscribe(() => {
				fn();
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
		function promptGuide$1(routeKey, cat = catalogStore$1.getState().catalog ?? {
			families: {},
			models: {},
			capabilities: null,
			engine_order: null,
			quant_order: null
		}) {
			const fam = familyOf$1(routeKey, cat);
			if (!fam) return void 0;
			return cat.families[fam]?.prompt_guide ?? void 0;
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
		/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
		*  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
		*  (for CatalogContractError reporting) — a static import would be circular. */
		function retryCatalog$1() {
			Promise.resolve().then(() => (init_modelCatalog$1(), modelCatalog_exports$1)).then(({ loadCatalog }) => loadCatalog({ force: true })).catch(() => {});
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
					if (wasOutage) contractToast$1("info", `Catalog back online (at ${_stamp$1()}).`);
				},
				reportViolation: (violations) => {
					console.error(`[catalogContract] catalog contract violation (at ${_stamp$1()}):`, violations);
					set({ record: {
						state: "violation",
						violations,
						error: null
					} });
					const first = violations[0];
					contractToast$1("error", `Catalog contract violation — ${first ? first.kind && first.kind !== "catalog" ? `${first.kind}: ${first.message}` : first.message : "the catalog response did not match the expected shape"} (at ${_stamp$1()}). Some models may be missing. Retry re-fetches the catalog.`, {
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
					contractToast$1("error", `Catalog unavailable — ${clean} (at ${_stamp$1()}). Retry re-fetches the catalog.`, {
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
			Promise.resolve().then(() => (init_FlowProtocol(), FlowProtocol_exports)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
				maxWaitMs: 3e4,
				intervalMs: 2e3
			})).then(() => useRunStatusContractStore$1.getState().clear()).catch(() => {});
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
		var useRunStatusContractStore$1;
		var init_runStatusContractStore$1 = __esmMin((() => {
			init_clientStore$1();
			init_contractToast$1();
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
			if (b.wtype !== void 0 && !WTYPE_SET$1.includes(b.wtype)) throw new Error(where + " carries wtype '" + b.wtype + "' — not in WTYPE_SET. The renderer has no arm for it (a foreign wtype silently renders as a plain text input). Add it to WTYPE_SET with its seat, or fix the spelling.");
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
		function extraOf$1(node) {
			const raw = node?.meta?.["extra"];
			if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
			const w = raw["wtype"];
			if (w !== void 0 && w !== "" && !WTYPE_SET$1.includes(w)) throw new Error("serialized extra carries wtype '" + String(w) + "' — not in WTYPE_SET. The renderer has no arm for it (add it with its seat, or fix the spelling).");
			return raw;
		}
		var EXTRA_KEYS$1, EXTRA_KEY_SET$1, WTYPE_SET$1, WTYPE_SEATS, MEDIA_SET, ZONE_SET, ROLE_SET;
		var init_extraKeys = __esmMin((() => {
			EXTRA_KEYS$1 = [
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
			EXTRA_KEY_SET$1 = new Set(EXTRA_KEYS$1);
			WTYPE_SET$1 = [
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
		function laneBlank$1(v) {
			if (v === void 0 || v === null) return true;
			if (typeof v === "string") return v.trim() === "";
			if (Array.isArray(v)) return v.every((entry) => laneBlank$1(entry));
			if (typeof v === "object") {
				const proto = Object.getPrototypeOf(v);
				if (proto !== null && proto !== Object.prototype) return false;
				return Object.values(v).every((entry) => laneBlank$1(entry));
			}
			return false;
		}
		/** Judge the four words over one stated state. PURE: no I/O, no
		*  card code — the same call the bench door refuses with and the
		*  form renders inline. Every row fires only on the STATED side of
		*  the law (blank fields never violate requires/together; either_or
		*  stays unarmed until a member is stated — authoring-in-progress
		*  is never a write refusal). */
		function judgeLaneRelations$1(relations, values) {
			const out = [];
			const stated = (name) => Object.prototype.hasOwnProperty.call(values, name) && !laneBlank$1(values[name]);
			for (const rel of relations) {
				if (rel === null || typeof rel !== "object") continue;
				for (const row of rel.requires ?? []) {
					if (row === null || typeof row !== "object" || typeof row.field !== "string") continue;
					if (!stated(row.field)) continue;
					const missing = (row.needs ?? []).filter((n) => !stated(n));
					if (missing.length === 0) continue;
					out.push({
						field: row.field,
						message: "field '" + row.field + "' requires " + quote$1(missing) + " on this lane" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state " + quote$1(missing) + " too, or drop '" + row.field + "'")
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
						message: "fields " + quote$1(members) + " ride together on this lane (state all or none)" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state " + quote$1(members) + " together, or drop " + quote$1(members))
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
						message: "this lane takes one of " + groups.map((g) => "(" + quote$1(g) + ")").join(" or ") + " — the stated combination completes none of them" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state one complete source, or drop the stated half")
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
						message: "this lane takes at most one of " + quote$1(fields) + " — the state carries " + present.length + " (" + quote$1(present) + ")" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — one slot, one value")
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
							message: "this lane requires one of " + quote$1(fields) + " — none is stated" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state one of them")
						});
						continue;
					}
					const missing = fields.filter((f) => !stated(f));
					if (missing.length === 0) continue;
					out.push({
						field: missing[0],
						message: "this lane requires " + quote$1(fields) + " — " + quote$1(missing) + " is not stated" + (row.cure !== void 0 && row.cure !== "" ? " — " + row.cure : " — state it, or use a lane that does not need it")
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
		function isUnstatedRequiredVoice$1(text) {
			return text.includes(UNSTATED_REQUIRED_STEM$1);
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
			if (!isUnstatedRequiredVoice$1(text)) return false;
			return text.split(/;\s*|\n/).filter((segment) => segment.trim() !== "").every((segment) => isUnstatedRequiredVoice$1(segment));
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
		function judgeLaneSurface$1(surface, schemaFields, values) {
			if (surface === null || surface === void 0) return [];
			const declared = new Set(surface);
			const out = [];
			for (const name of schemaFields) {
				if (declared.has(name)) continue;
				if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
				if (laneBlank$1(values[name])) continue;
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
		function laneSurfaceOf$1(familyParams, variantParams) {
			if (familyParams === void 0 || familyParams === null) return null;
			if (variantParams === void 0 || variantParams === null) return [...familyParams];
			return [.../* @__PURE__ */ new Set([...familyParams, ...variantParams])];
		}
		function laneBoundsOf$1(familyBounds, variantBounds) {
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
		function judgeLaneBounds$1(bounds, values) {
			if (bounds === null) return [];
			const out = [];
			for (const [name, row] of Object.entries(bounds)) {
				if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
				const v = values[name];
				if (laneBlank$1(v) || typeof v !== "number" || !Number.isFinite(v)) continue;
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
		function unknownVariantVoice$1(stated, model, known) {
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
		function unknownQuantVoice$1(stated, model, variant, known) {
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
		function judgeSamplerEnvelope$1(stated, envelope, variant) {
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
		function samplerEnvelopeCure$1() {
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
		var RELATION_WORDS, quote$1, UNSTATED_REQUIRED_STEM$1;
		var init_laneRelations = __esmMin((() => {
			RELATION_WORDS = {
				requires: true,
				conflicts: true,
				together: true,
				either_or: true,
				at_most_one: true,
				required: true
			};
			quote$1 = (fields) => fields.map((f) => "'" + f + "'").join(" + ");
			UNSTATED_REQUIRED_STEM$1 = "this lane requires ";
		}));
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
		//#region ../../web-kit/contracts/lib/browserStorage.js
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
		//#region ../../web-kit/contracts/lib/card.js
		var init_card = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/character.js
		var init_character = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/enhanceTypes.js
		var init_enhanceTypes = __esmMin((() => {}));
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
		/**
		* Compare JSON-compatible values structurally.
		* @param a - one JSON-compatible value.
		* @param b - the other JSON-compatible value.
		* @returns whether both values contain the same JSON data.
		*/
		function deepEqualJson(a, b) {
			if (a === b) return true;
			if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
			if (Array.isArray(a) || Array.isArray(b)) {
				if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
				return a.every((entry, index) => deepEqualJson(entry, b[index]));
			}
			const left = a;
			const right = b;
			const keys = Object.keys(left);
			if (keys.length !== Object.keys(right).length) return false;
			return keys.every((key) => key in right && deepEqualJson(left[key], right[key]));
		}
		var init_lib$2 = __esmMin((() => {}));
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
			init_lib$2();
			NO_CN_SCHEMA = {
				type: "",
				label: ""
			};
			_cnIdCounter = 0;
		}));
		//#endregion
		//#region ../../web-kit/contracts/lib/objectUrlCache.js
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
		//#region ../../web-kit/contracts/lib/regions.js
		var init_regions = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/rootsManifest.js
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
		//#region ../../web-kit/contracts/lib/stagePreview.js
		var init_stagePreview = __esmMin((() => {}));
		//#endregion
		//#region ../../web-kit/contracts/lib/stageView.js
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
		function isTerminalStatus$1(value) {
			return TERMINAL_RUN_STATUSES$1.has(value.toLowerCase());
		}
		function isLiveRunStatus$1(value) {
			return !isTerminalStatus$1(value) && LIVE_RUN_STATUSES$1.has(value.toLowerCase());
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
		var TERMINAL_RUN_STATUSES$1, LIVE_RUN_STATUSES$1, RUN_STATUS_WORDS;
		var init_stageView = __esmMin((() => {
			TERMINAL_RUN_STATUSES$1 = /* @__PURE__ */ new Set([
				"completed",
				"failed",
				"stopped",
				"error",
				"unknown",
				"interrupted",
				"succeeded",
				"success"
			]);
			LIVE_RUN_STATUSES$1 = /* @__PURE__ */ new Set([
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
		//#region ../../web-kit/contracts/lib/wire.js
		var init_wire = __esmMin((() => {}));
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
			TERMINAL_RUN_STATUSES: () => TERMINAL_RUN_STATUSES$1,
			TRACK_COLORS: () => TRACK_COLORS,
			WIRE_STAGE_KEYS: () => WIRE_STAGE_KEYS,
			WTYPE_SEATS: () => WTYPE_SEATS,
			WTYPE_SET: () => WTYPE_SET$1,
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
			extraOf: () => extraOf$1,
			hasModifierCapability: () => hasModifierCapability,
			healRunMediaPaths: () => healRunMediaPaths,
			initBrowserStorage: () => initBrowserStorage,
			isDataUrl: () => isDataUrl,
			isLiveRunStatus: () => isLiveRunStatus$1,
			isProvenance: () => isProvenance,
			isPurelyUnstatedRequiredVoice: () => isPurelyUnstatedRequiredVoice,
			isTerminalStatus: () => isTerminalStatus$1,
			isUnstatedRequiredVoice: () => isUnstatedRequiredVoice$1,
			judgeLaneBounds: () => judgeLaneBounds$1,
			judgeLaneRelations: () => judgeLaneRelations$1,
			judgeLaneSurface: () => judgeLaneSurface$1,
			judgeSamplerEnvelope: () => judgeSamplerEnvelope$1,
			kindForId: () => kindForId,
			kindSpecOf: () => kindSpecOf,
			laneBlank: () => laneBlank$1,
			laneBoundsOf: () => laneBoundsOf$1,
			laneContractOf: () => laneContractOf,
			laneContractsFor: () => laneContractsFor,
			laneSurfaceOf: () => laneSurfaceOf$1,
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
			samplerEnvelopeCure: () => samplerEnvelopeCure$1,
			searchedVoice: () => searchedVoice,
			stageEngineOf: () => stageEngineOf,
			statusOf: () => statusOf,
			statusOrPendingOf: () => statusOrPendingOf,
			stripKeys: () => stripKeys,
			stripSelfNamedModel: () => stripSelfNamedModel,
			subcardCount: () => subcardCount,
			subcardId: () => subcardId,
			subcardsFromParams: () => subcardsFromParams,
			unknownQuantVoice: () => unknownQuantVoice$1,
			unknownVariantVoice: () => unknownVariantVoice$1
		});
		var init_lib$1 = __esmMin((() => {
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
		//#region ../../web-kit/catalog/lib/contractToast.js
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
			Promise.resolve().then(() => (init_FlowProtocol$1(), FlowProtocol_exports$1)).then(({ pollFlowRun }) => pollFlowRun(runId, void 0, {
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
		/**
		* CARD BIRTH LAW (operator order 2026-09-06, verbatim):
		*
		*   "IF THERE IS NO DRAFT_ID, THAT IS A HARD ERROR! THAT NEEDS TO
		*    HAPPEN!"
		*
		* The start door (POST /v1/flows/start) refuses ANY body without a
		* valid, doc-backed draft_id — 4xx BEFORE any run registers
		* (submit(); wall:
		* the wall pins it).
		* Every run is born from an action card; a cardless row cannot be
		* born, so the media sidebar's "run has no action card (no draft_id
		* in its run row)" click error is unreachable for new runs.
		*
		* The ritual is mechanical and shared here (ONE implementation,
		* every caller — no copy-paste mints): compose the card first
		* (POST /v1/flows/drafts — the ray compose door mints the card doc,
		* the body preserved verbatim as its extras), then ride the minted
		* id on the start envelope.
		*/
		/** Mint the card doc for a start body. The doc carries the body
		*  verbatim (intent/stages/model/params become the card extras —
		*  see the drafts door, packages/estate/drafts, POST /v1/flows/drafts),
		*  so what the card shows is what the run consumed. Throws LOUDLY
		*  on any refusal — a refused compose never proceeds to a start
		*  (no silent cardless runs). */
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
			return draftId;
		}
		/** The card-birth half of every run start: return the body's
		*  declared draft_id when present, else compose the card and return
		*  the minted id. Stamp the result onto the start envelope BEFORE
		*  the start fetch:
		*
		*    startBody.draft_id = await ensureDraftId(startBody, signal)
		*/
		async function ensureDraftId$1(body, signal) {
			const declared = body.draft_id;
			if (typeof declared === "string" && declared !== "") return declared;
			return composeCard$1(body, signal);
		}
		var init_cardBirth$1 = __esmMin((() => {}));
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
		*  — lets a downstream slot wire a SPECIFIC output (mask → lanpaint_mask)
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
				opts?.onStart?.(runId);
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
				const raw = localStorage.getItem(STORAGE_KEY$1);
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
				localStorage.setItem(STORAGE_KEY$1, JSON.stringify({
					tags: data.tags,
					map: data.map
				}));
			} catch {}
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
			if (serverSyncEnabled$1) return;
			if (typeof fetch === "undefined") return;
			try {
				const res = await apiFetch("/v1/tags");
				if (!res.ok) return;
				const doc = validateDocument$1(await res.json());
				useTagMap$1.setState({
					tags: doc.tags,
					map: doc.map
				});
				serverSyncEnabled$1 = true;
			} catch {}
		}
		/** Read tagsOf without a React subscription. The useListFilter accessor uses
		*  this so the filter flow doesn't need to re-subscribe on every item. */
		function tagsOf(key) {
			return useTagMap$1.getState().map[key] ?? [];
		}
		var TagColor$1, TAG_COLOR_VALUES$1, TAG_COLOR_META, STORAGE_KEY$1, SYNC_DEBOUNCE_MS$1, serverSyncEnabled$1, syncTimer$1, initial$1, tagMapActions$1, useTagMap$1;
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
			STORAGE_KEY$1 = "melite:tag-map:v1";
			SYNC_DEBOUNCE_MS$1 = 500;
			serverSyncEnabled$1 = false;
			syncTimer$1 = null;
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
					const data = await res.json();
					formsStore$1.setState({ cache: data?.forms ?? {} });
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
		//#region ../../web-kit/catalog/lib/enhance.js
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
			promptGuide: () => promptGuide,
			readPickerModel: () => readPickerModel,
			resampleForWidth: () => resampleForWidth,
			resolvePickerRoute: () => resolvePickerRoute,
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
					await sleep$1(intervalMs);
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
				opts?.onTick?.(data);
				await sleep$1(intervalMs);
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
		const STORAGE_KEY = "melite:tag-map:v1";
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
		createClientStore$1((set, get) => ({
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
		/** THE PRESENTATION VOCABULARY — every wtype and the seat that
		* renders it:
		*  - atom-routed (the form's atom router switches on them):
		*    number, select, slider, text, textarea, boolean, image,
		*    file, mesh (image/file/mesh route via the square provider)
		*  - rail (the input signature's stack): image_list
		*  - mod-face (rendered by the mod leaf / mod canvas, not atoms):
		*    mask (the region-mask canvas), loras, ip_adapters,
		*    controlnets (the picker bricks)
		*/
		const WTYPE_SET = [
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
		const quote = (fields) => fields.map((f) => "'" + f + "'").join(" + ");
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
		/** The sentence stem every unstated-required violation opens with
		*  (both the ALL and ANY_OF arms share it — see
		*  isUnstatedRequiredVoice for the seats that test it). */
		const UNSTATED_REQUIRED_STEM = "this lane requires ";
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
		//#endregion
		//#region src/spec.ts
		init_lib$2();
		/**
		* spec.ts — @melite/card-base: THE EMISSION CONTRACT.
		*
		* A card package EMITS; the base CONSTRUCTS (operator order,
		* 2026-09-12: "The package to construct the card ui should see that
		* the card package emits an image input, then constructs the input
		* component automatically"). This module is the emission's client-side
		* shape — the served form-spec document as the base consumes it —
		* plus the PURE projections. No fetchers here (wire.ts), no
		* components (form.tsx): types and derivations only.
		*
		* THE LAYERED-PARAMS LAW (the parameter audit, 2026-09-14 — the
		* DSH settings model, subsystems/settings.md): the form-spec serves
		* the card's own SERIALIZED SCHEMA (schemastery toJSON — the SSOT,
		* one serializer server-side) and the bench's stage params ARE the
		* USER layer: a key's PRESENCE is the override mark, never its
		* value. resolveValue layers schema defaults <- model defaults <-
		* served stamps <- user — the engine's compose cascade verbatim,
		* resolved client-side so the form shows exactly what a run
		* composes. Edits are set/unset ops over the user layer; a family
		* Recipe macro pick is an ordinary multi-set of declared keys —
		* no stamp ledger, no value-compare heuristics, no heal walk
		* (seedUser's one validation clause aside).
		*
		* THE EDGE LAW (operator order, 2026-09-12: "whenever a card emits
		* via the package system, it needs to have 'input' 'required=True',
		* or 'output', so the edges are defined"): every card's emission
		* carries `inputs` — one row per declared input edge, the required
		* fact joined per the law (dsl.py Field.emit: `required: True
		* emits, False omits`) — and `outputs`, the declared output edges.
		* The base constructs input components and picker candidates from
		* THESE, never from result-URL sniffing.
		*/
		/** Build an envelope from raw dict nodes — the TEST-side and
		*  migration-side constructor; the served envelopes come from
		*  schemastery's own toJSON. Ids assign in insertion order; a node
		*  carrying `consts` (string labels or {value,label} rows) expands
		*  into minted const refs with the union's `list` wired to them —
		*  the shape schemastery's union-of-consts serializes to. */
		function schemaEnvelope(dict) {
			const refs = { 0: {
				type: "object",
				dict: {}
			} };
			let uid = 0;
			for (const [name, raw] of Object.entries(dict)) {
				uid += 1;
				const nodeId = uid;
				const node = { ...raw };
				const consts = node["consts"];
				delete node["consts"];
				if (Array.isArray(consts)) {
					const list = [];
					for (const c of consts) {
						uid += 1;
						if (typeof c === "string") refs[uid] = {
							type: "const",
							value: c
						};
						else if (typeof c === "object" && c !== null) {
							const row = c;
							refs[uid] = {
								type: "const",
								value: row.value,
								...row.label !== void 0 ? { meta: { description: String(row.label) } } : {}
							};
						}
						list.push(uid);
					}
					node.list = list;
					if (node.type === void 0) node.type = "union";
				}
				refs[nodeId] = node;
				refs[0].dict[name] = nodeId;
			}
			return {
				uid: 0,
				refs
			};
		}
		/** THE MOD-OWNED NAMES (the SubcardGrid law, enforced): every name a
		*  served modifier kind owns — its fields' names plus its param_key
		*  (the bag storage). CardForm EXCLUDES these from the flat param
		*  groups: mod params render ONLY inside the mod system. PURE. */
		function modOwnedFields(spec) {
			const owned = /* @__PURE__ */ new Set();
			for (const k of spec.features?.modifiers ?? []) owned.add(k.param_key);
			for (const env of Object.values(spec.mod_schemas ?? {})) {
				if (env == null) continue;
				const root = env.refs[env.uid];
				for (const name of Object.keys(root?.dict ?? {})) owned.add(name);
			}
			return owned;
		}
		/** Is this kind an OPTION kind (lora-shaped: served catalog rows) —
		*  as opposed to a FIELD kind (mask-shaped: its own param fields)? */
		function isOptionKind(k) {
			return (k.options ?? []).length > 0;
		}
		/** THE HYBRID TEST (the served entry mode — never the kind name):
		*  catalog rows AND bag-element entry fields. */
		function isHybridKind(k) {
			return k.entry === "hybrid";
		}
		/** The catalog-bound field (the hybrid type / the option id) —
		*  'id' when the door serves no key (the lora backstop). */
		function optionKeyOf(k) {
			return typeof k.option_key === "string" && k.option_key !== "" ? k.option_key : "id";
		}
		/** The scalar dial of a bag element (the pack's own name —
		*  'strength' backstop when the door serves none). */
		function scalarKeyOf(k) {
			return typeof k.scalar_key === "string" && k.scalar_key !== "" ? k.scalar_key : "strength";
		}
		/** THE TITLE-CASE FACE (the operator's sweep law): machine ids
		*  (krea-2, z-image, euler, comfyui…) render titled — never raw.
		*  FACES ONLY: option values, param keys, and wire bodies keep the
		*  verbatim id (the 1:1 law — the eye gets prose, the door gets the
		*  id). First letter of each separator-bound word upper, the rest
		*  untouched (INT8 stays INT8); idempotent on titled prose. */
		function titleCaseId(id) {
			return id.split(/[-_\s]+/).filter((w) => w !== "").map((w) => w.slice(0, 1).toUpperCase() + w.slice(1)).join(" ");
		}
		/** THE SCHEMA LAYER's declared defaults (fieldsOfEnvelope's output —
		*  resolveValue's first layer; the base never invents one). */
		function specDefaults(fields) {
			const out = {};
			for (const f of fields) if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
			return out;
		}
		function composeUnset(inherited, schemaDefault) {
			if (inherited !== void 0 && inherited !== null && inherited !== "") return {
				composed: String(inherited),
				from: "stamp"
			};
			if (schemaDefault !== void 0 && schemaDefault !== null) return {
				composed: String(schemaDefault),
				from: "schema"
			};
			return {
				composed: void 0,
				from: "none"
			};
		}
		/** The unset face's LABEL: a run stamp names its source ('← 28'); the
		*  schema default rides plain (it is not inheriting anything — it IS
		*  the engine's compose floor); 'inherit' only when nothing
		*  composes. */
		function unsetFaceLabel(face) {
			if (face.composed === void 0) return "inherit";
			return face.from === "stamp" ? `← ${face.composed}` : face.composed;
		}
		/** The unset face's PROSE (the tooltip): names in words what unset
		*  composes. `render` adapts the vocabulary (e.g. boolean on/off). */
		function unsetFaceTip(face, render) {
			const v = (render ?? ((x) => x))(face.composed ?? "");
			if (face.from === "stamp") return `unset — inherits ${v} from the run`;
			if (face.from === "schema") return `unset — the engine composes ${v} (the schema's default)`;
			return "unset — the engine default applies";
		}
		/** ── THE ENVELOPE WALKER ─────────────────────────────────────────
		*
		* One pure projection: serialized schemastery schema -> derived
		* SpecFields. Every presentation fact lives in the nodes' meta (the
		* declaration IS the UI contract — the Field.emit law); this
		* walk reads, never invents. THE ORDER: dict insertion order with
		* the declared `order` hint as tie-break (a stable sort — equal
		* keys keep insertion order).
		*
		* Families scoping: a node whose extra.families names families the
		* spec does NOT serve skips (the absorption is family-scoped —
		* the card serves only the boarded plane).
		*
		* Nullable pairs: a union of [X, const(null)] wires as X — the
		* OUTER meta wins (schemastery's nullable() shape, probed live on
		* image-gen 2026-09-14).
		*
		* Presentation types (the audit's client-side derivation — a view
		* choice over typed meta, never a server row): extra.wtype wins
		* (declared presentation); union-of-consts -> select; number ->
		* step 1 -> seed, any other step -> slider, no step -> slider;
		* string -> text; boolean -> boolean; array -> loras.
		*
		* Option labels: a union's const members carry their own
		* meta.description (the emitter's label law) — the declared
		* extra.options override when present. */
		function fieldsOfEnvelope(env, family) {
			if (env == null) return [];
			const root = env.refs[env.uid];
			return projectDict(env, root?.dict ?? {}, family);
		}
		/** THE HYBRID PROJECTION (the controlnet restoration): the envelope
		*  root's bag array (param_key) holds entry OBJECTS — project the
		*  ELEMENT's dict as the kind's entry fields (the catalog select
		*  joins them in the leaf). Empty when the bag is absent or its
		*  element is not an object (a pure OPTION kind like lora). */
		function entryFieldsOfEnvelope(env, paramKey, family) {
			if (env == null) return [];
			const at = env.refs[env.uid]?.dict?.[paramKey];
			const node = at === void 0 ? void 0 : env.refs[at];
			const innerId = node?.inner;
			const inner = typeof innerId === "number" ? env.refs[innerId] : void 0;
			if (node?.type !== "array" || inner?.type !== "object") return [];
			return projectDict(env, inner.dict ?? {}, family);
		}
		/** THE PACK-LEVEL PROJECTION (the controlnet strength floor): the
		*  envelope root's fields OUTSIDE the bag array — the section's own
		*  rows above the tiles. Bag-external arrays are not section rows
		*  (no atom renders a bag) — scalars only. */
		function kindScalarFieldsOfEnvelope(env, paramKey, family) {
			if (env == null) return [];
			const dict = { ...env.refs[env.uid]?.dict ?? {} };
			delete dict[paramKey];
			for (const [name, id] of Object.entries(dict)) if (env.refs[id]?.type === "array") delete dict[name];
			return projectDict(env, dict, family);
		}
		/** The dict projector (the walker's body — one meta path for the
		*  root, the hybrid element, and the pack-level rows). */
		function projectDict(env, dict, family) {
			const out = [];
			for (const [name, id] of Object.entries(dict)) {
				let node = env.refs[id];
				if (node === void 0) throw new Error("form-spec: field " + JSON.stringify(name) + " points at ref " + JSON.stringify(id) + " the envelope's refs table does not carry — the form is refused rather than rendered with a hole");
				if (node.type === "union" && Array.isArray(node.list) && node.list.length === 2) {
					const a = env.refs[node.list[0]];
					const b = env.refs[node.list[1]];
					const nullConst = (r) => r?.type === "const" && r.value === null;
					if (a !== void 0 && b !== void 0 && (nullConst(a) && b.type !== "const" || nullConst(b) && a.type !== "const")) node = nullConst(a) ? b : a;
				}
				const meta = node.meta ?? {};
				const extra = extraOf(node);
				const families = Array.isArray(extra.families) ? extra.families : null;
				if (families !== null && family !== void 0 && !families.includes(family)) continue;
				if (extra.hidden === true) continue;
				let options;
				if (node.type === "union" && Array.isArray(node.list)) {
					const opts = [];
					for (const mid of node.list) {
						const m = env.refs[mid];
						if (m?.type !== "const") continue;
						const v = m.value;
						if (v === null || v === void 0) continue;
						const label = typeof m.meta?.["description"] === "string" ? m.meta["description"] : String(v);
						if (label === String(v)) opts.push(String(v));
						else opts.push({
							value: String(v),
							label
						});
					}
					if (opts.length > 0) options = opts;
				}
				if (Array.isArray(extra.options)) options = extra.options.map((o) => typeof o === "string" ? o : typeof o === "object" && o !== null && "value" in o && "label" in o ? {
					value: String(o["value"]),
					label: String(o["label"])
				} : String(o));
				const hint = extra.wtype;
				let type;
				if (hint !== void 0 && hint !== "") type = hint;
				else if (options !== void 0 && node.type === "union") type = "select";
				else if (node.type === "number") type = String(meta["step"] ?? "") === "1" ? "seed" : "slider";
				else if (node.type === "string") type = "text";
				else if (node.type === "boolean") type = "boolean";
				else if (node.type === "array") type = "loras";
				else type = node.type ?? "string";
				const num = (k) => typeof meta[k] === "number" ? meta[k] : void 0;
				const str = (k, m) => {
					const b = extra[k];
					if (typeof b === "string") return b;
					const mk = m ?? k;
					return typeof meta[mk] === "string" ? meta[mk] : void 0;
				};
				out.push({
					name,
					label: typeof meta["description"] === "string" && meta["description"] !== "" ? meta["description"] : name,
					order: typeof extra.order === "number" ? extra.order : void 0,
					type,
					default: meta["default"] === void 0 ? void 0 : meta["default"],
					min: num("min"),
					max: num("max"),
					step: type === "seed" ? void 0 : num("step"),
					options,
					group: str("group") ?? "",
					zone: str("zone"),
					required: extra.required === true || meta["required"] === true,
					placeholder: str("placeholder"),
					tooltip: str("tooltip"),
					visible_when: str("visible_when"),
					columns: typeof extra.columns === "number" ? extra.columns : void 0,
					width: typeof extra.width === "number" ? extra.width : void 0,
					max_stack: typeof extra.max_stack === "number" ? extra.max_stack : void 0,
					media: str("media")
				});
			}
			return out.map((f, i) => [f, i]).sort((a, b) => (a[0].order ?? 0) - (b[0].order ?? 0) || a[1] - b[1]).map((x) => x[0]);
		}
		/** THE EDIT COERCION (the one specPatch duty that survives, moved
		* to the edit boundary): atoms emit raw strings while typing; a
		* numeric field's edit rides the user layer as a NUMBER. An
		* unparseable/empty numeric string rides VERBATIM (display
		* continuity through clear-and-retype — the bench drill's law; a
		* blank that reaches the run's schema parse refuses loud, naming
		* the field — never a silent 0). `v === undefined` stays undefined
		* (the tri-state's inherit — the caller's unset signal). The
		* STUDIOS' blank-inherits law lives one door up, at their own edit
		* verb (useResolvedForm) — each face owns its blank semantics.
		* PURE. */
		/** THE NUMERIC PARSE, shared by both blank laws (2026-10-13, the card-UI
		*  duplication audit): a finite parse is a number, anything else is
		*  NOT one. The blank SEMANTICS then differ by seat and stay there —
		*  this file rides an unparseable value VERBATIM (never a silent 0),
		*  while the drill modal keeps the prior value (a typed "x" must
		*  never reach a number param). One parse, two named laws; the two
		*  copies of the parse itself are gone. */
		function parseNumericInput(v) {
			if (v.trim() === "") return void 0;
			const n = Number(v);
			return Number.isFinite(n) ? n : void 0;
		}
		function coerceFieldEdit(f, v) {
			if (v === void 0) return void 0;
			if (f !== void 0 && (f.type === "number" || f.type === "seed" || f.type === "slider") && typeof v === "string") {
				const n = parseNumericInput(v);
				if (n !== void 0) return n;
			}
			return v;
		}
		/** THE FAMILY-KEY RESOLUTION (the families-DRY law, 2026-09-21):
		* a field's `families` declares BASE family ids — the card's
		* boarded ids — while the served model key may be a COMPOSED
		* catalog row (family-variant-quant, e.g. 'pixal3d-1536-int8').
		* Resolve the active key to its base against the spec's OWN
		* boarded-families rows: the longest id matching the key at a
		* '-' boundary wins (a 'pixal3d' + 'pixal3d-pro' board resolves
		* to the longer). An unresolved key passes through verbatim —
		* single-family cards and keys with no boarded base walk
		* unchanged; the resolution never drops a field, it only widens
		* what a declared base id covers. */
		function resolveFamilyKey(spec) {
			const key = typeof spec.model === "string" ? spec.model : void 0;
			if (key === void 0 || key === "") return void 0;
			const boarded = spec.families;
			if (boarded === void 0) return key;
			let best;
			for (const row of boarded) {
				const exact = key === row.id;
				const prefixed = key.startsWith(row.id + "-") && (best === void 0 || row.id.length > best.length);
				if (exact || prefixed) best = row.id;
			}
			return best ?? key;
		}
		/** The card's own derived fields (the schema envelope walked,
		* families-scoped to the served family). Memoize at the caller for
		* hot loops — the walk is pure. */
		function fieldsOf(spec) {
			return fieldsOfEnvelope(spec.schema, resolveFamilyKey(spec));
		}
		/** THE LAYERED RESOLUTION — the engine's compose cascade mirrored
		* client-side (stroke 34 — the card-recipe layer is dead): schema
		* defaults <- model defaults <- SERVED STAMPS <- user. The form
		* SHOWS exactly what a run composes; `user` rides verbatim by key
		* presence (a PRESENCE is the override mark, never its value — the
		* settings law). Arrays (lora bags) and nulls in model_defaults
		* skip, matching the engine's overlay filter.
		*
		* THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): `base` is the
		* stage row's `resolved` map — prepareCardParams' own stamped +
		* lifted body, served by the drafts doors. It layers UNDER the user
		* (presence still wins) and OVER model_defaults (the server's own
		* family/variant stamps replace the client's guesses — variant
		* resolver_defaults, family defaults, the surface filter). Absent
		* base = the registry-less lane derive. PURE. */
		function resolveValue(spec, user, base) {
			const out = specDefaults(fieldsOf(spec));
			for (const [k, v] of Object.entries(spec.model_defaults ?? {})) {
				if (v === null || Array.isArray(v)) continue;
				out[k] = v;
			}
			if (base !== void 0) for (const [k, v] of Object.entries(base)) {
				if (v === null || v === void 0 || Array.isArray(v)) continue;
				out[k] = v;
			}
			for (const [k, v] of Object.entries(user)) {
				if (v === null || v === void 0) continue;
				out[k] = v;
			}
			for (const kind of spec.features?.modifiers ?? []) {
				if (kind.marries === void 0) continue;
				const bag = out[kind.param_key];
				if (!Array.isArray(bag) || bag.length === 0) continue;
				const catalog = new Map((kind.options ?? []).map((o) => [o.value, o]));
				for (const knob of Object.keys(kind.marries)) {
					const counts = [];
					for (const row of bag) {
						const stated = row?.[knob];
						if (typeof stated === "number" && Number.isFinite(stated)) {
							counts.push(stated);
							continue;
						}
						const id = typeof row?.["id"] === "string" ? row["id"] : void 0;
						const fromCatalog = id === void 0 ? void 0 : (catalog.get(id)?.defaults)?.[knob];
						if (typeof fromCatalog === "number" && Number.isFinite(fromCatalog)) counts.push(fromCatalog);
					}
					if (counts.length > 0) out[knob] = Math.max(...counts);
				}
			}
			return out;
		}
		/** evalVisibleWhen's serving shape: "key=value" guards, `&`-ANDed;
		* one guard's value may be a `|`-SET ("key=a|b" = key ∈ {a,b}).
		* (The ONE schema grammar — a field declares its own visibility;
		* the walker interprets, cards never hand-rolled predicates.) A
		* field with no visible_when always shows. Unknown guard keys:
		* show (never hide on a typo). Examples:
		*   "sharpen_enabled=true"
		*   "sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass" */
		function fieldVisible(f, values) {
			const rule = f.visible_when;
			if (typeof rule !== "string" || rule === "") return true;
			for (const guard of rule.split("&")) {
				const g = guard.trim();
				const ne = g.indexOf("!=");
				const eq = ne >= 0 ? -1 : g.indexOf("=");
				let key;
				let wants;
				let negate = false;
				if (ne >= 0) {
					key = g.slice(0, ne).trim();
					wants = g.slice(ne + 2).split("|").map((w) => w.trim());
					negate = true;
				} else if (eq >= 0) {
					key = g.slice(0, eq).trim();
					wants = g.slice(eq + 1).split("|").map((w) => w.trim());
				} else continue;
				if (key === "") continue;
				const val = String(values[key] ?? "");
				const hit = wants.some((w) => w === "null" ? val === "" : w === val);
				if (negate === hit) return false;
			}
			return true;
		}
		/** The resolved lane surface for the current variant, or null when
		*  the family declares none (the legacy truth — visibility falls
		*  back to visible_when). `variantId` is the RESOLVED variant
		*  value (values.variant); an unknown id inherits the family base
		*  verbatim (a Quant-only or unset axis). */
		function laneSurfaceFor(spec, variantId) {
			const lanes = spec.lanes;
			if (lanes === void 0) return null;
			const extra = variantId === null ? void 0 : lanes.variants?.[variantId]?.params;
			return laneSurfaceOf(lanes.base, extra);
		}
		/** The relation words that judge the resolved lane: the family's
		*  own + the variant's own (both layers fire — the DECL cascade). */
		function laneRelationsFor(spec, variantId) {
			const lanes = spec.lanes;
			if (lanes === void 0) return [];
			const out = [];
			if (lanes.relations !== void 0) out.push(lanes.relations);
			const v = variantId === null ? void 0 : lanes.variants?.[variantId]?.relations;
			if (v !== void 0) out.push(v);
			return out;
		}
		/** The numeric bounds that judge the resolved lane: family rows,
		*  per-field replaced by the variant's own (the DECL cascade's
		*  replace-law for numbers). */
		function laneBoundsFor(spec, variantId) {
			const lanes = spec.lanes;
			if (lanes === void 0) return null;
			return laneBoundsOf(lanes.bounds ?? null, variantId === null ? void 0 : lanes.variants?.[variantId]?.bounds ?? null);
		}
		/** Field visibility UNDER the lane contract: a declared surface
		*  hides every field it does not name (the declaration is the
		*  author — the field set IS the variant); a family that declares
		*  no surface keeps the visible_when grammar. */
		function fieldOnLane(spec, paramName, values) {
			const surface = laneSurfaceFor(spec, typeof values["variant"] === "string" && values["variant"] !== "" ? values["variant"] : null);
			if (surface === null) return true;
			return surface.includes(paramName);
		}
		/** THE INLINE GATE: the lane's relation + surface violations over
		*  what the state CARRIES — rendered under the named field while the
		*  user types, refused by the bench door when the state is saved.
		*  Empty = a state the run accepts.
		*
		*  THE CARRIED LAYERS, NOT THE RESOLVED MAP (2026-10-10, the
		*  form-plane audit's CRITICAL-1): the resolved `values` map
		*  materializes schema defaults and model_defaults as own
		*  properties, so a defaulted field reads as STATED whether the user
		*  ever touched it. On a lane that excludes a defaulted field that
		*  produced a perpetual, UNCURABLE warning: the row was hidden
		*  (fieldOnLane) so the cure ("drop it") was unclickable, and
		*  unsetting it re-materialized the default. The bench judges the
		*  PREPARED body — the operator's own params plus the stamps that
		*  survive the null-skip — so the form judges the same thing: the
		*  user layer over the base layer, non-null keys only. A schema
		*  default is a PREFILL the operator never sent, and a variant's
		*  `voice: null` stamp is exactly how the bench says "no persona on
		*  this lane". */
		function laneViolations(spec, fields, user, base) {
			const carried = (key) => Object.prototype.hasOwnProperty.call(user, key) ? user[key] : (base ?? {})[key];
			const rawVariant = carried("variant");
			if (rawVariant !== void 0 && rawVariant !== null) {
				if (typeof rawVariant !== "string" || rawVariant === "" || !laneVariantServed(spec, rawVariant)) return [];
			}
			const variantId = typeof rawVariant === "string" && rawVariant !== "" ? rawVariant : null;
			const surface = laneSurfaceFor(spec, variantId);
			const relations = laneRelationsFor(spec, variantId);
			if (surface === null && relations.length === 0) return [];
			const names = fields.map((f) => f.name);
			const stated = {};
			for (const src of [base ?? {}, user]) for (const [k, v] of Object.entries(src)) {
				if (v === null || v === void 0) continue;
				stated[k] = v;
			}
			const bounds = laneBoundsFor(spec, variantId);
			return [
				...judgeLaneSurface(surface, names, stated),
				...judgeLaneRelations(relations, stated),
				...judgeLaneBounds(bounds, stated)
			];
		}
		/** Does the served doc offer this variant id? The VARIANT rows are
		*  the served truth — a recipe row and a surface-less variant
		*  (voicedesign) legitimately carry no `lanes.variants` entry and
		*  still inherit the family base, so the check reads spec.variants
		*  ids, never the lanes map's keys. */
		function laneVariantServed(spec, variantId) {
			return (Array.isArray(spec.variants) ? spec.variants : []).some((row) => {
				const rec = row;
				return rec?.id === variantId || rec?.key === variantId;
			});
		}
		/** Group the visible fields (the spec's own group key, first-appearance
		*  order — ungrouped first under no heading). */
		function groupFields(fields, values) {
			const out = [];
			for (const f of fields) {
				if (!fieldVisible(f, values)) continue;
				const g = typeof f.group === "string" && f.group !== "" ? f.group : null;
				const known = out.find((x) => x.group === g);
				if (known === void 0) out.push({
					group: g,
					fields: [f]
				});
				else known.fields.push(f);
			}
			return out;
		}
		/** The declared input edge for a param, if the emission names one
		*  (THE EDGE LOOKUP — the constructor's one way to know a field is
		*  slot-shaped: the DECLARATION says so, the wtype never guesses). */
		function inputEdgeOf(spec, paramName) {
			return (spec.inputs ?? []).find((e) => e.name === paramName);
		}
		/** The axis groups in declaration order: features.variant_groups'
		*  key order when the door serves it, else the rows' distinct groups
		*  in first-seen order. Empty group names never ride. The Recipe
		*  group never rides (the recipe-axis yield above). */
		function axisGroups(spec) {
			const rows = spec.variants ?? [];
			const groups = [];
			const declared = variantGroupsContract(spec);
			if (declared.length > 0) {
				for (const g of declared) if (g !== "" && !groups.includes(g)) groups.push(g);
			}
			for (const v of rows) if (v.group !== "" && !groups.includes(v.group)) groups.push(v.group);
			return groups.filter((g) => g !== "Recipe");
		}
		/** The variant_groups contract's keys, in served order (the door
		*  serves it under features when the family declares axis groups). */
		function variantGroupsContract(spec) {
			const vg = spec.features?.["variant_groups"];
			if (vg === null || typeof vg !== "object" || Array.isArray(vg)) return [];
			return Object.keys(vg);
		}
		/** One axis' rows (served order). */
		function rowsFor(spec, group) {
			return (spec.variants ?? []).filter((v) => v.group === group);
		}
		/** THE CHAIN (one direction: an axis filters the axes BELOW it): a
		*  row composes with the current selection when its `owner` is empty
		*  (composes with everything — patch-only rows) or names the ACTIVE
		*  row of another axis. */
		function composingRows(spec, group, active) {
			return rowsFor(spec, group).filter((v) => {
				if (v.owner === void 0 || v.owner === "") return true;
				for (const g of axisGroups(spec)) {
					if (g === group) continue;
					if (rowsFor(spec, g).find((x) => x.id === v.owner) !== void 0) return active[g] === v.owner;
				}
				return true;
			});
		}
		/** The Variant axis' rows (group 'Variant', served order). */
		function variantRows(spec) {
			return rowsFor(spec, "Variant");
		}
		/** The Quant cells composing with a variant (THE CHAIN). */
		function quantRowsFor(spec, variantId) {
			return composingRows(spec, "Quant", { Variant: variantId ?? void 0 });
		}
		/** The Model select's options (stroke 21, the operator's law:
		*  "WHY IS KREA-2 AND KREA-2-RAW MODELS! THAT IS A VARIANT") — THE
		*  FAMILY THE SPEC SERVES, full stop. A variant row's re-point
		*  (krea-2-raw) is the DECL's compose stamp, resolved server-side
		*  into the run's params — it is NOT a model and never renders as
		*  one. The rail's other options are the card's boarded families
		*  (spec.families, served from the card package). */
		function modelChoices(spec) {
			return typeof spec.model === "string" && spec.model !== "" ? [spec.model] : [];
		}
		/** THE ACTIVE-ENTRY LAW (activeVariantId, generalized to the served
		*  shape): a row is active when its re-pointed model (defaults.model
		*  ?? route) matches the held `model` value AND its owner chain
		*  holds. Nothing matches → undefined (the caller falls to the first
		*  composing row — the catalog's first-declared law). */
		function activeVariantId(spec, values, group) {
			if ((typeof values["model"] === "string" ? values["model"] : void 0) === void 0) return void 0;
			const active = {};
			for (const g of axisGroups(spec)) active[g] = activeRowId(spec, values, g, active);
			return active[group] ?? void 0;
		}
		/** The ACTIVE RECIPE (the dropdown's selection state, derived from
		* the ONE truth -- never a persisted key): a recipe row is active
		* when EVERY key its pick stamps (axisPickPatch, minus the durable
		* axis keys -- the run door refuses an undeclared `recipe` param)
		* deep-equals the user layer's held value. Stamp-for-stamp matches
		* are naturally exclusive (a two-row bag matches only the row that
		* stamps two rows); first-declared wins on a tie. NOTHING matches ->
		* undefined (the dropdown shows its placeholder -- a hand-edited
		* layer is not a recipe, and the form never lies about it). */
		function activeRecipeId(spec, values) {
			for (const row of rowsFor(spec, "Recipe")) {
				const patch = axisPickPatch(spec, row);
				let holds = true;
				for (const [k, v] of Object.entries(patch)) {
					if (k === axisKey("Recipe")) continue;
					if (!deepEqualJson(values[k], v)) {
						holds = false;
						break;
					}
				}
				if (holds && Object.keys(patch).length > 0) return row.id;
			}
		}
		/** One group's active row under the owner chain (inner recursion of
		*  activeVariantId — Variant resolves first, chained groups after). */
		function activeRowId(spec, values, group, active) {
			const held = typeof values["model"] === "string" ? values["model"] : void 0;
			if (held === void 0) return void 0;
			for (const v of rowsFor(spec, group)) {
				const rePoint = typeof v.defaults["model"] === "string" ? v.defaults["model"] : v.route;
				if (rePoint === "" || rePoint !== held) continue;
				if (v.owner !== void 0 && v.owner !== "") {
					let chainHolds = false;
					for (const g of axisGroups(spec)) {
						if (g === group) continue;
						if (rowsFor(spec, g).find((x) => x.id === v.owner) !== void 0) {
							chainHolds = active[g] === v.owner;
							break;
						}
					}
					if (!chainHolds) continue;
				}
				return v.id;
			}
		}
		/** THE AXIS STAMP VOCABULARY (2026-09-29, caught LIVE by the
		*  compose gate in the CI seat: the client stamped the Quant row's
		*  composed catalog id — 'raw__int8' — where the door's contract
		*  speaks the CELL's quant field — 'int8'; the gate refused with the
		*  door's own voice and the write never left the studio, which is
		*  exactly the law working). The value an axis pick stamps on the
		*  durable key is the value the DOOR reads: the variant id for
		*  Variant, the cell quant for Quant. Never the flat-catalog id.
		* PURE. */
		function axisStampOf(row) {
			if (row.group !== "Quant") return row.id;
			if (typeof row.quant === "string" && row.quant !== "") return row.quant;
			throw new Error("illegal Quant row " + JSON.stringify(row.id) + " (owner " + JSON.stringify(row.owner ?? "") + "): no quant coordinate — the row is refused at the stamp; the spec server must refuse it at birth");
		}
		/** The durable param key an axis rides (the group's id, lowercased —
		*  'variant', 'quant', 'recipe', 'precision'). */
		function axisKey(group) {
			return group.toLowerCase();
		}
		/** A pick's full value patch — the old onPick law: the row's
		*  `defaults` overlay rides (model re-point + every resolver default),
		*  plus the durable axis keys themselves so a reopened stage restores
		*  its selects. Picking a row also re-seeds the axes BELOW it (their
		*  first composing row). */
		function axisPickPatch(spec, row) {
			const patch = {};
			for (const [k, v] of Object.entries(row.defaults)) {
				if (k === "model") continue;
				patch[k] = v;
			}
			const groups = axisGroups(spec);
			const at = groups.indexOf(row.group);
			const active = {};
			for (const g of groups) if (g === row.group) active[g] = row.id;
			else if (typeof row.defaults["model"] === "string") active[g] = void 0;
			if (groups.includes(row.group)) patch[axisKey(row.group)] = axisStampOf(row);
			if (at < 0) return patch;
			for (const g of groups.slice(at + 1)) {
				const composing = composingRows(spec, g, active);
				if (composing.length > 0) patch[axisKey(g)] = axisStampOf(composing[0]);
				else patch[axisKey(g)] = "";
			}
			return patch;
		}
		/** A model switch's full value patch (the stale-variant cure,
		*  operator 2026-09-14: model anima + variant turbo refused at
		*  compose — a switch that keeps the old family's axes is a broken
		*  stage). Every axis re-seeds to its FIRST row re-pointing at the
		*  new model (else its first composing row), and the picked rows'
		*  defaults overlay rides (raw → {model, steps, cfg} — the pick
		*  law, same as axisPickPatch). The caller writes every key through
		*  onEdit. PURE. */
		function modelSwitchPatch(spec, model) {
			const patch = { model };
			const groups = axisGroups(spec);
			const active = {};
			const crossSpec = model !== "" && model !== spec.model;
			for (const g of groups) {
				const composing = composingRows(spec, g, active);
				if (composing.length === 0 || crossSpec) {
					patch[axisKey(g)] = "";
					active[g] = "";
					continue;
				}
				const row = composing.find((r) => {
					return (typeof r.defaults["model"] === "string" && r.defaults["model"] !== "" ? r.defaults["model"] : r.route) === model;
				}) ?? composing[0];
				for (const [k, v] of Object.entries(row.defaults)) {
					if (k === "model") continue;
					patch[k] = v;
				}
				patch[axisKey(g)] = row.id;
				active[g] = row.id;
			}
			patch["model"] = model;
			return patch;
		}
		/** THE EMPTY-SELECTION LAW's authoring decision (2026-10-10, the
		*  operator's live bench: a stage carrying quant:"" — born when a
		*  model switch CLEARED the axis to '' — which the RUN door refused:
		*  'unknown quant "" for model "z-image" variant "turbo" (known:
		*  int8)'). A stated EMPTY selection is UNSTATED: the authoring
		*  seat unsets the key instead of writing the empty string, so
		*  compose defaults the cell. ONE pure decision, shared by the seed
		*  (seedAxisValues omits) and the write (the drill's onSet unsets)
		*  — the form's rendering is untouched (a missing axis key reads
		*  as '' on screen). */
		function axisUnset(name, v, spec) {
			if (v !== "" || spec === null) return false;
			return axisGroups(spec).some((g) => axisKey(g) === name);
		}
		/** Seed the axis keys for a fresh stage (the catalog's first-declared
		*  law: each axis defaults to its FIRST composing row). Held values
		*  win (a reopened stage never re-seeds). */
		function seedAxisValues(spec, held) {
			const out = {};
			const groups = axisGroups(spec);
			if (groups.length === 0) return out;
			const active = {};
			for (const g of groups) {
				const heldKey = typeof held[axisKey(g)] === "string" ? held[axisKey(g)] : "";
				const heldRow = rowsFor(spec, g).find((x) => x.id === heldKey);
				if (heldRow !== void 0) active[g] = heldRow.id;
				else {
					const composing = composingRows(spec, g, active);
					active[g] = composing.length > 0 ? composing[0].id : "";
				}
				if (active[g] !== "") out[axisKey(g)] = active[g];
			}
			const heldModel = held["model"];
			if (typeof heldModel !== "string" || heldModel === "") {
				const model = typeof spec.model === "string" && spec.model !== "" ? spec.model : "";
				if (model !== "") out["model"] = model;
			}
			return out;
		}
		/** Seed a stage's USER layer from its held params (the bench's
		* stage.params — the only migration seam). Presence-based, per the
		* settings law: every HELD key rides verbatim (the override marks
		* survived the reopen), the absent axis keys seed per the axis law
		* (seedAxisValues above — first composing row, one direction).
		*
		* THE ONE VALIDATION CLAUSE (never value-compare): a held `recipe`
		* the card's schema does not declare is poison — the dead
		* card-recipe layer's stamp (strokes 33+34). Dropped on open, so
		* the run flush's null-domain half deletes the bench key and the
		* card composes again. Everything else rides untouched.
		*
		* PURE — the caller owns the write (onSet per fresh key). */
		function seedUser(spec, held) {
			const out = {
				...held,
				...seedAxisValues(spec, held)
			};
			if (!fieldsOf(spec).some((f) => f.name === "recipe")) delete out["recipe"];
			return out;
		}
		/** The door's offered-variant pool (selectVariant mirrored):
		*  non-Recipe/non-Quant rows, else every non-Quant row when the
		*  family configures none — the discovery-expanded Quant CELLS
		*  never carry an envelope to judge against. */
		function variantPool(all) {
			const configured = all.filter((r) => r.group !== "Recipe" && r.group !== "Quant");
			return configured.length > 0 ? configured : all.filter((r) => r.group !== "Quant");
		}
		/** The door's variant resolution, ONE spelling (the dragbar clamp,
		*  2026-10-13): the stated variant matched by id OR route over the
		*  offered pool, else pool[0] — the row whose sampler_envelope the
		*  judge and the form's dragbar clamps BOTH read. Undefined only
		*  when the pool itself is empty or the stated id matches no row
		*  (the miss voice is composeValidate's own).
		*  @param all the spec's full variants array, cells included.
		*  @param doc the resolved display doc (the held variant key). */
		function offeredVariantOf(all, doc) {
			const pool = variantPool(all);
			const rawVariant = doc["variant"];
			if (typeof rawVariant === "string" && rawVariant !== "") return pool.find((r) => r.id === rawVariant || r.route === rawVariant);
			return pool[0];
		}
		function composeValidate(spec, doc) {
			if (spec === null) return [];
			const heldModel = doc["model"];
			if (typeof heldModel === "string" && heldModel !== "" && spec.model !== void 0 && spec.model !== "" && heldModel !== spec.model) return [];
			const out = [];
			const all = spec.variants ?? [];
			const pool = variantPool(all);
			const rawVariant = doc["variant"];
			let offered;
			if (typeof rawVariant === "string" && rawVariant !== "") {
				offered = pool.find((r) => r.id === rawVariant || r.route === rawVariant);
				if (offered === void 0) {
					out.push({ message: "card_compose: " + unknownVariantVoice(rawVariant, spec.model ?? "", pool.map((r) => r.id)) });
					return out;
				}
			} else offered = pool[0];
			if (offered !== void 0) {
				const rawQuant = doc["quant"];
				if (typeof rawQuant === "string" && rawQuant !== "") {
					const cells = all.filter((r) => r.group === "Quant" && r.owner === offered.id);
					if (!cells.some((c) => c.quant === rawQuant)) out.push({ message: "card_compose: " + unknownQuantVoice(rawQuant, spec.model ?? "", offered.id, cells.map((c) => c.quant).filter((q) => typeof q === "string")) });
				}
				const off = judgeSamplerEnvelope(doc, offered.sampler_envelope ?? null, {
					id: offered.id,
					route: offered.route
				});
				if (off !== null) out.push({ message: "card_compose: " + off.voice + ". " + samplerEnvelopeCure() });
			}
			return out;
		}
		/** Compose the CANDIDATE doc the door would judge: the bench row's
		*  held params, the user layer's overrides, then the in-flight frame
		*  — later layers win, and a null value DELETES the key (the wire's
		*  own unset law). This is composition: the full doc, assembled
		*  where the edit happens, so the law can run BEFORE the write. */
		function composeCandidateDoc(held, user, frame) {
			const doc = {
				...held,
				...user
			};
			for (const [k, v] of Object.entries(frame)) if (v === null) delete doc[k];
			else doc[k] = v;
			return doc;
		}
		//#endregion
		//#region src/rejection-voice.ts
		/** The voice for a caught rejection, lossless by the estate's
		* failureText law: an Error speaks its message; any other thrown
		* value (transports and test fakes throw plain strings and
		* objects) surfaces verbatim — `String(e)` — never a fixed
		* fallback literal that masks the thrower's words. Every catch
		* face in this package voices through here (the R4 unmask,
		* f2d9c36f-style); card-view's thirty-seven call sites ride the
		* re-export shim at its src/client/rejection-voice.ts.
		* @param e the caught value
		* @returns the thrower's own words */
		function rejectionVoice(e) {
			return e instanceof Error ? e.message : String(e);
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
		//#endregion
		//#region src/chrome.ts
		/**
		* Card chrome primitives — the ONE joiner + the card-base face of the
		* ONE file reader (founded 2026-09-12, debt extermination: anny/ideo
		* cx, motion/h3 clsx-cn). DOM-free, no CSS, no atoms — safe for node
		* and browser.
		*
		* `readAsDataURL` is @melite/formats' implementation, re-served here
		* so cards reach one door; @melite/formats/readFile.ts owns the body.
		*
		* Reached through the `/client` door (`@melite/card-base/client`).
		*/
		/** Plain classnames joiner (no conflicting utilities to merge —
		*  plain join is exact). */
		function cx(...parts) {
			return parts.filter(Boolean).join(" ");
		}
		/** The merging joiner (clsx — objects/arrays/conditionals). */
		function cn(...inputs) {
			return clsx(...inputs);
		}
		/** THE ESTATE'S DRAG CONTRACT (2026-09-18, exterminated): the MIME
		*  under which an upstream asset rides a drop payload — a JSON blob
		*  {url, name, …} carried by the source's dataTransfer. h3's kit and
		*  motion's kit each redeclared it; card-base, the card-view's
		*  CardsTab and input-square already consumed it. One definition
		*  estate-wide (the drag is a shared contract, not a studio rule). */
		const ASSET_DRAG_MIME = "application/tech-noir-asset";
		/** The capability drag's MIME — a fully-resolved card rides the
		*  payload. Lives beside ASSET_DRAG_MIME: one home for the drag
		*  contract's MIME pair (DRY sweep C4+J10, 2026-10-18 — the literal
		*  previously rode both formats/capabilityCards.ts and card-view's
		*  dnd-payloads.ts). */
		const CAPABILITY_DRAG_MIME = "application/tech-noir-capability";
		function parseAssetDrop(raw) {
			if (raw === "") return {};
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return {};
			}
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
			const payload = parsed;
			const url = typeof payload["url"] === "string" && payload["url"] !== "" ? payload["url"] : void 0;
			const type = typeof payload["type"] === "string" && payload["type"] !== "" ? payload["type"] : void 0;
			return {
				...url === void 0 ? {} : { url },
				...type === void 0 ? {} : { type }
			};
		}
		/** Parse the capability MIME off a drop event. null = absent or
		*  shape-wrong (falls through to the asset/file path).
		*
		*  L9 (the fallback audit, 2026-09-28): null once covered TWO worlds —
		*  the MIME genuinely absent (a foreign drag: fall through, correct)
		*  and the MIME PRESENT but unparseable (a corrupt capability drag
		*  the old law swallowed silent). isMalformedCapabilityDrop separates
		*  them; the drop handler badges the corrupt body instead of a no-op.
		*  The pair moved here from card-view's dnd-payloads.ts so the whole
		*  drag contract — MIME pair + both parsers — has ONE home beside the
		*  asset half (DRY sweep J10, 2026-10-18). */
		function parseCapabilityDrop(raw) {
			if (raw === "") return null;
			try {
				const p = JSON.parse(raw);
				if (typeof p.service === "string" && typeof p.title === "string") return p;
				return null;
			} catch {
				return null;
			}
		}
		/** True when the capability MIME body is PRESENT but unparseable or
		*  shape-wrong — a corrupt drag, not a foreign one. The consumer must
		*  badge this (never a silent no-op); foreign drags (raw === '') stay
		*  silent. */
		function isMalformedCapabilityDrop(raw) {
			if (raw === "") return false;
			try {
				const p = JSON.parse(raw);
				return !(typeof p.service === "string" && typeof p.title === "string");
			} catch {
				return true;
			}
		}
		//#endregion
		//#region \0dsh-css:packages/web/card-base/src/card.module.css.mjs
		const css$4 = ".emezXW_specForm :where(input,textarea,select,button){box-sizing:border-box}.emezXW_specForm{flex-direction:column;gap:12px;display:flex}.emezXW_specGroup{flex-direction:column;gap:8px;display:flex}.emezXW_modelAxes{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;display:grid}.emezXW_modelAxes .emezXW_specGroupTitle{grid-column:1/-1;margin-bottom:0}.emezXW_modelAxes>.emezXW_specHint{grid-column:1/-1}.emezXW_axesPair{grid-column:1/-1;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;gap:10px;display:grid}.emezXW_axesPair>*{min-width:0}.emezXW_specGroupTitle{color:var(--dsw-alias-label-secondary);letter-spacing:.04em;text-transform:uppercase;margin:0 0 2px;font-size:11px;font-weight:600}.emezXW_specField{flex-direction:column;gap:6px;display:flex}.emezXW_specFieldKey{color:var(--dsw-alias-label-secondary);align-items:center;min-height:20px;font-size:12px;display:flex}.emezXW_specRequired{color:var(--dsw-alias-state-critical,#e5484d)}.emezXW_specHint{color:var(--dsw-alias-label-secondary);font-size:11px}.emezXW_laneWarn{border-top:1px solid var(--dsw-alias-state-critical,#e5484d);border-bottom:1px solid var(--dsw-alias-state-critical,#e5484d);color:var(--dsw-alias-state-critical,#e5484d);margin:0;padding:6px 0;font-size:11px;line-height:1.5}.emezXW_laneWarn p{margin:0}.emezXW_specInfo{border:1px solid var(--dsw-alias-label-secondary);width:12px;height:12px;color:var(--dsw-alias-label-secondary);cursor:help;vertical-align:middle;user-select:none;border-radius:50%;flex:none;justify-content:center;align-items:center;margin-left:5px;font-family:Georgia,Times New Roman,serif;font-size:9px;font-style:italic;line-height:1;display:inline-flex}.emezXW_specFieldHead{justify-content:space-between;align-items:center;gap:6px;display:flex}.emezXW_specDice{width:20px;height:20px;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.65;background:0 0;border:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.emezXW_specDice:hover{opacity:1}.emezXW_specDiceOn{color:var(--dsw-alias-accent-primary,#4a7dbd);opacity:1}select option{color:canvastext;background:canvas}.emezXW_specSelect{color-scheme:light;background:var(--dsw-alias-interactive-bg-hover);border:.5px solid var(--dsw-alias-border-l2);color:inherit;font:inherit;border-radius:6px;width:100%;padding:5px 8px;font-size:13px}.emezXW_specSliderRow{align-items:center;gap:8px;display:flex}.emezXW_specSlider{flex:1}.emezXW_specSliderValue{color:var(--dsw-alias-label-secondary);font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);text-align:right;min-width:4ch;font-size:12px}.emezXW_specTextarea{background:var(--dsw-alias-interactive-bg-hover);border:.5px solid var(--dsw-alias-border-l2);color:inherit;font:inherit;resize:vertical;border-radius:6px;width:100%;padding:6px 8px;font-size:13px}.emezXW_squareWrap{flex-direction:column;align-items:center;gap:4px;width:84px;display:flex}.emezXW_squareOff{opacity:.5;pointer-events:none}.emezXW_squareBox{border:.5px solid var(--dsw-alias-border-l2);cursor:pointer;height:80px;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out);border-radius:8px;justify-content:center;align-items:center;width:80px;display:flex;position:relative;overflow:hidden}.emezXW_squareOver{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 2px var(--dsw-alias-border-l1)}.emezXW_squareThumb{object-fit:cover;width:100%;height:100%}.emezXW_squareMesh{pointer-events:none;position:absolute;inset:0}.emezXW_squareGlyph{color:var(--dsw-alias-label-tertiary)}.emezXW_squareEmptyIcon{align-items:center;display:flex}.emezXW_squareActions{pointer-events:none;justify-content:flex-end;align-items:flex-end;padding:4px;display:flex;position:absolute;inset:0}.emezXW_squareActions>*{pointer-events:auto}.emezXW_squarePick{background:var(--dsw-alias-interactive-bg-hover-solid);border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:999px;justify-content:center;align-items:center;width:22px;height:22px;padding:0;display:flex;position:absolute;top:4px;left:4px}.emezXW_squareBadge{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;max-width:100%;font-size:10px;line-height:17px;overflow:hidden}.emezXW_squareX{background:var(--dsw-alias-interactive-bg-hover-solid);border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:999px;align-items:center;padding:0 4px;font-size:10px;line-height:17px;display:flex;position:absolute;top:4px;right:4px}.emezXW_squareLabel{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;width:100%;font-size:11px;line-height:17px;overflow:hidden}.emezXW_squareMetric{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:17px}.emezXW_squareFileInput{display:none}.emezXW_modSection{border-top:1px dashed var(--border,#80808040);flex-direction:column;gap:6px;margin-top:10px;padding-top:8px;display:flex}.emezXW_modHead{align-items:baseline;gap:8px;display:flex}.emezXW_modTitle{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}.emezXW_modHint{opacity:.45;font-size:9px}.emezXW_modRow{flex-wrap:wrap;align-items:stretch;gap:6px;margin:0;padding:0;list-style:none;display:flex}.emezXW_modTile{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#80808014);cursor:grab;touch-action:none;border-radius:8px;flex-direction:column;justify-content:center;gap:2px;min-width:84px;max-width:132px;padding:6px 8px;display:flex}.emezXW_modTile:active{cursor:grabbing}.emezXW_modTileLabel{text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.2;overflow:hidden}.emezXW_modTileStrength{opacity:.55;font-size:9px}.emezXW_modTileSteps{opacity:.55;font-variant-numeric:tabular-nums;font-size:9px}.emezXW_modAddSquare{border:1px dashed var(--dsw-alias-border-l3);cursor:pointer;opacity:.7;height:64px;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background-color var(--ds-transition-duration) var(--ds-ease-in-out);background:0 0;border-radius:8px;justify-content:center;align-items:center;width:64px;display:flex}.emezXW_modAddSquare:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4);opacity:1}.emezXW_tileDragging{opacity:.5}.emezXW_modTileRecipe{cursor:default;border-style:dashed}.emezXW_modTileRecipe .emezXW_modTileStrength:after{content:\" · recipe\"}.emezXW_specChips{flex-wrap:wrap;gap:4px;display:flex}.emezXW_modLeafModal{width:min(760px,100vw - 32px);max-height:min(80vh,760px);overflow-y:auto}.emezXW_modLeafSplit{grid-template-columns:minmax(0,7fr) minmax(240px,5fr);align-items:start;gap:12px;display:grid}.emezXW_modLeafStage{min-width:0}.emezXW_modStageCaption{letter-spacing:.06em;text-transform:uppercase;opacity:.7;font-size:10px;font-weight:600}@media (width<=720px){.emezXW_modLeafSplit{grid-template-columns:minmax(0,1fr)}}.emezXW_modLeaf{flex-direction:column;gap:10px;min-width:260px;display:flex}.emezXW_modLeafFields{gap:8px;display:grid}.emezXW_modLeafActions{gap:8px;display:flex}.emezXW_modField{flex-direction:column;gap:4px;font-size:11px;display:flex}.emezXW_modSelect{border:1px solid var(--border,#8080804d);background:var(--bg-elevated,#8080800f);color:inherit;color-scheme:light;border-radius:6px;padding:6px 8px;font-size:12px}.emezXW_modLeafError{color:#e06c5f;margin:0;font-size:11px}.emezXW_pickList{flex-direction:column;gap:4px;max-height:60vh;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.emezXW_pickRow{display:block}.emezXW_pickBtn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background-color var(--ds-transition-duration) var(--ds-ease-in-out);background:0 0;border-radius:6px;align-items:center;gap:10px;width:100%;padding:6px;display:flex}.emezXW_pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l4)}.emezXW_pickThumb{object-fit:cover;border-radius:4px;flex:none;width:40px;height:40px}.emezXW_pickGlyph{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:4px;flex:none;justify-content:center;align-items:center;width:40px;height:40px;font-size:15px;font-weight:600;display:inline-flex}.emezXW_pickLabel{text-overflow:ellipsis;white-space:nowrap;font-size:13px;overflow:hidden}.emezXW_pickEmpty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}.emezXW_sourceRow{flex-direction:column;display:flex}.emezXW_specSlotRow{flex-wrap:wrap;align-items:flex-start;gap:8px;display:flex}.emezXW_specGrid{align-items:start;gap:8px;display:grid}.emezXW_specSlotCell{flex-direction:column;gap:4px;display:flex}.emezXW_inputRail{gap:10px}.emezXW_specStack{flex-direction:column;gap:6px;display:flex}[data-stack-add] .emezXW_squareBox{border-style:dashed}.emezXW_sz14{flex:none;width:14px;height:14px}.emezXW_wireDialog{width:min(448px,100vw - 32px);max-height:60vh;overflow-y:auto}.emezXW_wireUnwire{text-align:left;cursor:pointer;border:0;border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);width:100%;color:var(--dsw-alias-state-error-primary);background:0 0;align-items:center;gap:8px;padding:8px 12px;font-size:11px;display:flex}.emezXW_wireUnwire:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 40%, transparent)}.emezXW_wireList{margin:0;padding:0;list-style:none}.emezXW_wireList>li+li{border-top:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent)}.emezXW_wireEmpty{color:color-mix(in srgb, var(--dsw-alias-label-primary) 48%, transparent);padding:12px;font-size:11px}.emezXW_wireOption{text-align:left;cursor:pointer;width:100%;color:var(--dsw-alias-label-primary);background:0 0;border:0;align-items:center;gap:8px;padding:8px 12px;display:flex}.emezXW_wireOption:hover{background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 40%, transparent)}.emezXW_wireSelected{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent)}.emezXW_wireIdx{font-variant-numeric:tabular-nums;background:color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);width:20px;height:20px;color:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent);border-radius:4px;flex:none;justify-content:center;align-items:center;font-size:9px;font-weight:700;display:flex}.emezXW_wireThumb{object-fit:cover;border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);border-radius:4px;flex:none;width:32px;height:32px}.emezXW_wireThumbFallback{border:1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);background:color-mix(in srgb, var(--dsw-alias-bg-module-platform) 40%, transparent);width:32px;height:32px;color:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent);border-radius:4px;flex:none;justify-content:center;align-items:center;display:flex}.emezXW_wireMeta{flex:1;min-width:0}.emezXW_wireTitle{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:11px;font-weight:500;overflow:hidden}.emezXW_wireOut{font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);color:color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);margin-left:4px;font-size:9px}.emezXW_wireSub{text-overflow:ellipsis;white-space:nowrap;font-family:var(--dsw-alias-font-mono,ui-monospace, monospace);color:color-mix(in srgb, var(--dsw-alias-label-primary) 48%, transparent);font-size:9px;overflow:hidden}.emezXW_wiredTag{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);color:var(--dsw-alias-brand-primary);border-radius:4px;flex:none;padding:2px 6px;font-size:9px;font-weight:600}.emezXW_specLinkBtn{all:unset;cursor:pointer;color:var(--melite-accent,#6ea8fe);font:inherit;text-decoration:underline}.emezXW_specLinkBtn:disabled{cursor:default;color:var(--melite-muted,#8a8f98);text-decoration:none}.emezXW_specGrid :where(input,select){width:100%}.emezXW_groupTabs{flex-wrap:wrap;gap:6px;margin-bottom:10px;display:flex}.emezXW_groupTab{all:unset;cursor:pointer;font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:3px 10px}.emezXW_groupTab:hover{background:var(--dsw-alias-bg-module,#80808014)}.emezXW_groupTabActive{background:var(--dsw-alias-bg-module,#8080802e);border-color:var(--dsw-alias-border-l3)}.emezXW_tipAnchor{display:inline-flex}.emezXW_ctlRow,.emezXW_ctlRowSm{color:var(--dsw-alias-label-secondary);justify-content:space-between;align-items:center;gap:8px;font-size:10px;display:flex}.emezXW_ctlRow select,.emezXW_ctlRowSm select{font-size:10px}.emezXW_sectionLabel{justify-content:space-between;align-items:baseline;gap:8px;display:flex}.emezXW_sectionLabelText{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);font-size:9px;font-weight:600}.emezXW_sectionLabelTail{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:9px}.emezXW_emptyPane,.emezXW_emptyOverlay{text-align:center;flex-direction:column;justify-content:center;align-items:center;gap:6px;display:flex}.emezXW_emptyPane{box-sizing:border-box;width:100%;height:100%;padding:24px 0}.emezXW_emptyOverlay{pointer-events:none;padding:24px;position:absolute;inset:0}.emezXW_emptyTitle{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;font-weight:500}.emezXW_emptyHint{color:var(--dsw-alias-label-tertiary);max-width:25rem;margin:0;font-size:10px;line-height:1.6}.emezXW_paneHeaderPreview{flex:none;align-items:baseline;gap:6px;padding-bottom:6px;display:flex}.emezXW_paneHeaderStrip{border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);align-items:center;gap:8px;padding:4px 10px;display:flex}.emezXW_paneTitle{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}.emezXW_paneMeta{color:var(--dsw-alias-label-tertiary);font-size:9px}.emezXW_paneMetaNum{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:9px}.emezXW_paneHint{color:var(--dsw-alias-label-tertiary);margin-left:auto;font-size:9px}.emezXW_paneShell{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:6px;flex:none;overflow:hidden}@keyframes emezXW_panePulse{0%,to{opacity:1}50%{opacity:.45}}.emezXW_skeleton{background:color-mix(in srgb, var(--dsw-alias-label-secondary) 22%, transparent);border-radius:6px;animation:1.6s ease-in-out infinite emezXW_panePulse}@keyframes emezXW_iconSpin{to{transform:rotate(360deg)}}.emezXW_iconSpin{animation:1s linear infinite emezXW_iconSpin}";
		const tagId$4 = "@melite/card-base/card.module.css@1573b5f4";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/card-base";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"axesPair": "emezXW_axesPair",
			"ctlRow": "emezXW_ctlRow",
			"ctlRowSm": "emezXW_ctlRowSm",
			"emptyHint": "emezXW_emptyHint",
			"emptyOverlay": "emezXW_emptyOverlay",
			"emptyPane": "emezXW_emptyPane",
			"emptyTitle": "emezXW_emptyTitle",
			"groupTab": "emezXW_groupTab",
			"groupTabActive": "emezXW_groupTabActive",
			"groupTabs": "emezXW_groupTabs",
			"iconSpin": "emezXW_iconSpin",
			"inputRail": "emezXW_inputRail",
			"laneWarn": "emezXW_laneWarn",
			"modAddSquare": "emezXW_modAddSquare",
			"modField": "emezXW_modField",
			"modHead": "emezXW_modHead",
			"modHint": "emezXW_modHint",
			"modLeaf": "emezXW_modLeaf",
			"modLeafActions": "emezXW_modLeafActions",
			"modLeafError": "emezXW_modLeafError",
			"modLeafFields": "emezXW_modLeafFields",
			"modLeafModal": "emezXW_modLeafModal",
			"modLeafSplit": "emezXW_modLeafSplit",
			"modLeafStage": "emezXW_modLeafStage",
			"modRow": "emezXW_modRow",
			"modSection": "emezXW_modSection",
			"modSelect": "emezXW_modSelect",
			"modStageCaption": "emezXW_modStageCaption",
			"modTile": "emezXW_modTile",
			"modTileLabel": "emezXW_modTileLabel",
			"modTileRecipe": "emezXW_modTileRecipe",
			"modTileSteps": "emezXW_modTileSteps",
			"modTileStrength": "emezXW_modTileStrength",
			"modTitle": "emezXW_modTitle",
			"modelAxes": "emezXW_modelAxes",
			"paneHeaderPreview": "emezXW_paneHeaderPreview",
			"paneHeaderStrip": "emezXW_paneHeaderStrip",
			"paneHint": "emezXW_paneHint",
			"paneMeta": "emezXW_paneMeta",
			"paneMetaNum": "emezXW_paneMetaNum",
			"panePulse": "emezXW_panePulse",
			"paneShell": "emezXW_paneShell",
			"paneTitle": "emezXW_paneTitle",
			"pickBtn": "emezXW_pickBtn",
			"pickEmpty": "emezXW_pickEmpty",
			"pickGlyph": "emezXW_pickGlyph",
			"pickLabel": "emezXW_pickLabel",
			"pickList": "emezXW_pickList",
			"pickRow": "emezXW_pickRow",
			"pickThumb": "emezXW_pickThumb",
			"sectionLabel": "emezXW_sectionLabel",
			"sectionLabelTail": "emezXW_sectionLabelTail",
			"sectionLabelText": "emezXW_sectionLabelText",
			"skeleton": "emezXW_skeleton",
			"sourceRow": "emezXW_sourceRow",
			"specChips": "emezXW_specChips",
			"specDice": "emezXW_specDice",
			"specDiceOn": "emezXW_specDiceOn",
			"specField": "emezXW_specField",
			"specFieldHead": "emezXW_specFieldHead",
			"specFieldKey": "emezXW_specFieldKey",
			"specForm": "emezXW_specForm",
			"specGrid": "emezXW_specGrid",
			"specGroup": "emezXW_specGroup",
			"specGroupTitle": "emezXW_specGroupTitle",
			"specHint": "emezXW_specHint",
			"specInfo": "emezXW_specInfo",
			"specLinkBtn": "emezXW_specLinkBtn",
			"specRequired": "emezXW_specRequired",
			"specSelect": "emezXW_specSelect",
			"specSlider": "emezXW_specSlider",
			"specSliderRow": "emezXW_specSliderRow",
			"specSliderValue": "emezXW_specSliderValue",
			"specSlotCell": "emezXW_specSlotCell",
			"specSlotRow": "emezXW_specSlotRow",
			"specStack": "emezXW_specStack",
			"specTextarea": "emezXW_specTextarea",
			"squareActions": "emezXW_squareActions",
			"squareBadge": "emezXW_squareBadge",
			"squareBox": "emezXW_squareBox",
			"squareEmptyIcon": "emezXW_squareEmptyIcon",
			"squareFileInput": "emezXW_squareFileInput",
			"squareGlyph": "emezXW_squareGlyph",
			"squareLabel": "emezXW_squareLabel",
			"squareMesh": "emezXW_squareMesh",
			"squareMetric": "emezXW_squareMetric",
			"squareOff": "emezXW_squareOff",
			"squareOver": "emezXW_squareOver",
			"squarePick": "emezXW_squarePick",
			"squareThumb": "emezXW_squareThumb",
			"squareWrap": "emezXW_squareWrap",
			"squareX": "emezXW_squareX",
			"sz14": "emezXW_sz14",
			"tileDragging": "emezXW_tileDragging",
			"tipAnchor": "emezXW_tipAnchor",
			"wireDialog": "emezXW_wireDialog",
			"wireEmpty": "emezXW_wireEmpty",
			"wireIdx": "emezXW_wireIdx",
			"wireList": "emezXW_wireList",
			"wireMeta": "emezXW_wireMeta",
			"wireOption": "emezXW_wireOption",
			"wireOut": "emezXW_wireOut",
			"wireSelected": "emezXW_wireSelected",
			"wireSub": "emezXW_wireSub",
			"wireThumb": "emezXW_wireThumb",
			"wireThumbFallback": "emezXW_wireThumbFallback",
			"wireTitle": "emezXW_wireTitle",
			"wireUnwire": "emezXW_wireUnwire",
			"wiredTag": "emezXW_wiredTag"
		};
		//#endregion
		//#region src/layout.tsx
		/** The estate's tooltip anchor: the DSH Tooltip atom over a REAL
		*  layout box (a display:contents or fragment child measures a zero
		*  rect and pins the bubble to the viewport corner).
		* @param props.tip - bubble text; absent renders the child bare.
		* @param props.side - bubble placement, default 'top'.
		* @param props.delayDuration - hover delay in ms, default 300.
		* @param props.children - the single anchor element. */
		function Tip({ tip, side = "top", delayDuration = 300, children }) {
			if (tip === void 0) return children;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: tip,
				side,
				delayMs: delayDuration,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: card_module_css_default.tipAnchor,
					children
				})
			});
		}
		function ControlRow({ label, hint, children, density = "md", className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: cn(density === "sm" ? card_module_css_default.ctlRowSm : card_module_css_default.ctlRow, className),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [label, hint != null ? hint : null] }), children]
			});
		}
		function SectionLabel({ children, tail, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cn(card_module_css_default.sectionLabel, className),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: card_module_css_default.sectionLabelText,
					children
				}), tail != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: card_module_css_default.sectionLabelTail,
					children: tail
				}) : null]
			});
		}
		function EmptyState({ icon, title, hint, variant = "pane", className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "empty-state",
				"data-variant": variant,
				className: cn(variant === "overlay" ? card_module_css_default.emptyOverlay : card_module_css_default.emptyPane, className),
				children: [
					icon,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: card_module_css_default.emptyTitle,
						children: title
					}),
					hint != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: card_module_css_default.emptyHint,
						children: hint
					}) : null
				]
			});
		}
		/** Skeleton — the quiet loading block (promoted 2026-09-18 from
		*  motion's kit, where it was the estate's only copy): a bare div
		*  with the estate pulse. EmptyState is the pane's empty face;
		*  Skeleton is its loading face. */
		function Skeleton({ className, ...props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "skeleton",
				className: cn(card_module_css_default.skeleton, className),
				...props
			});
		}
		function PaneHeader({ title, meta, hint, lead, variant = "strip", className }) {
			if (variant === "preview") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "pane-header",
				"data-variant": "preview",
				className: cn(card_module_css_default.paneHeaderPreview, className),
				children: [
					lead,
					title != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.paneTitle,
						children: title
					}) : null,
					meta != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.paneMeta,
						children: meta
					}) : null,
					hint
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "pane-header",
				"data-variant": "strip",
				className: cn(card_module_css_default.paneHeaderStrip, className),
				children: [
					lead,
					title != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.paneTitle,
						children: title
					}) : null,
					meta != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.paneMetaNum,
						children: meta
					}) : null,
					hint != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: card_module_css_default.paneHint,
						children: hint
					}) : null
				]
			});
		}
		function PaneShell({ children, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "pane-shell",
				className: cn(card_module_css_default.paneShell, className),
				children
			});
		}
		//#endregion
		//#region src/icons.tsx
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
		function ChevronLeft({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m15 18-6-6 6-6" })
			});
		}
		function ChevronRight({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m9 18 6-6-6-6" })
			});
		}
		function Upload({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m17 8-5-5-5 5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 3v12" })
				]
			});
		}
		function PersonStanding({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "5",
						r: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m9 20 3-6 3 6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 8 6 2 6-2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 10v4" })
				]
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
		function Check({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 6 9 17l-5-5" })
			});
		}
		function Box({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5a2 2 0 0 1 1 1.73Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5.3 7.3 6.7 3.9 6.7-3.9" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 22V11" })
				]
			});
		}
		function Layers({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12 2 9 4.9-9 4.9-9-4.9L12 2Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m3 11.9 9 4.9 9-4.9" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m3 16.9 9 4.9 9-4.9" })
				]
			});
		}
		function Palette({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "13.5",
						cy: "6.5",
						r: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "17.5",
						cy: "10.5",
						r: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "8.5",
						cy: "7.5",
						r: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "6.5",
						cy: "12.5",
						r: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A5.46 5.46 0 0 0 22 10.5C21.94 5.75 17.5 2 12 2Z" })
				]
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
		/** The circular-arrow glyph, spinning by construction (the Loader2
		*  contract: callers size and tint it, never animate it). */
		function Loader2({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className: cn(card_module_css_default.iconSpin, className),
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
		/** h3's name for the alert triangle — same drawing. */
		function TriangleAlert({ className, style, ...rest }) {
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
		function Clapperboard({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6.2 5.3 3.1 3.9" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m12.4 3.4 3.1 4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" })
				]
			});
		}
		function Type({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 7V5h16v2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 5v14" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 19h6" })
				]
			});
		}
		function Copy({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "9",
					y: "9",
					width: "12",
					height: "12",
					rx: "2"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })]
			});
		}
		function Image({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "3",
						y: "3",
						width: "18",
						height: "18",
						rx: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "9",
						r: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21 15-3.5-3.5a1.5 1.5 0 0 0-2 0L6 21" })
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
		function Info({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "10"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 16v-4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 8h.01" })
				]
			});
		}
		function Pause({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "14",
					y: "4",
					width: "4",
					height: "16",
					rx: "1"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "6",
					y: "4",
					width: "4",
					height: "16",
					rx: "1"
				})]
			});
		}
		function Download({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m7 10 5 5 5-5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 15V3" })
				]
			});
		}
		function EyeOff({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m2 2 20 20" })
				]
			});
		}
		function RefreshCw({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 3v5h-5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 21v-5h5" })
				]
			});
		}
		function RotateCw({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 3v5h-5" })]
			});
		}
		function RotateCcw({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 3v5h5" })]
			});
		}
		function Target({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "10"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "6"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "2"
					})
				]
			});
		}
		function ImagePlus({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 5h6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 2v6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "9",
						r: "2"
					})
				]
			});
		}
		function Camera({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "12",
					cy: "13",
					r: "3"
				})]
			});
		}
		function FileBox({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 9H8" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 13H8" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 17H8" })
				]
			});
		}
		/** Lucide-faithful `audio-lines` (new 2026-10-08 — the history kind
		* face's audio glyph; no prior card copy existed to unify). */
		function AudioLines({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 10v3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 6v11" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 3v18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 8v7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 5v13" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M22 10v3" })
				]
			});
		}
		function Film({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "3",
						y: "3",
						width: "18",
						height: "18",
						rx: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 3v18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 7.5h4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 12h18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 16.5h4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 3v18" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 7.5h4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17 16.5h4" })
				]
			});
		}
		function Crop({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 2v14a2 2 0 0 0 2 2h14" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 22V8a2 2 0 0 0-2-2H2" })]
			});
		}
		function Frame({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M22 6H2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M22 18H2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 2v20" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 2v20" })
				]
			});
		}
		function Volume2({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" })
				]
			});
		}
		function VolumeX({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "22",
						x2: "16",
						y1: "9",
						y2: "15"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
						x1: "16",
						x2: "22",
						y1: "9",
						y2: "15"
					})
				]
			});
		}
		function Maximize({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" })
				]
			});
		}
		function Minimize2({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 14h6v6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M20 10h-6V4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m14 10 7-7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m3 21 7-7" })
				]
			});
		}
		function Dices({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						width: "12",
						height: "12",
						x: "2",
						y: "10",
						rx: "2",
						ry: "2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 18h.01" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 14h.01" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 6h.01" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M18 9h.01" })
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
		/** Motion's simplified eye variant. */
		function EyeAlt({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Svg, {
				className,
				style,
				...rest,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "12",
					cy: "12",
					r: "3"
				})]
			});
		}
		/** Motion's sharp-corner play variant. */
		function PlayAlt({ className, style, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Svg, {
				className,
				style,
				...rest,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 4l14 8-14 8V4z" })
			});
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
		({}).env?.BASE_URL;
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
		//#region src/stage3d.ts
		/**
		* stage3d — the SHARED raw-three stage core (the substrate law).
		*
		* One imperative mount that every 3D viewport in the card plane builds
		* on: renderer + camera + OrbitControls + the rAF loop + resize
		* observation + pointer picking + full disposal. Pure TypeScript over
		* three and three/addons — NO @react-three anywhere (the r3f
		* react-reconciler version-skew boot crash is why this exists).
		*
		* Consumers own their SCENE CONTENT (lights, floor, figures) and their
		* FRAME LOGIC via addTick (ordered registry — ticks run in registration
		* order before each render, the raw analogue of useFrame declared top
		* to bottom in a JSX tree).
		*
		* Pointer semantics (the r3f onClick/onPointerOver/onPointerOut
		* analogue): an object becomes interactive by carrying
		* `userData.pick = { click?, over?, out? }` on itself or an ancestor.
		* The stage raycasts on pointermove and click, walks parentward from
		* the hit to the first pick carrier, and calls the handlers with the
		* world intersection point + the DOM event. A drag-orbit never reads
		* as a click (the 350ms threshold). Gizmo subtrees (TransformControls)
		* are excluded from picking — r3f did this implicitly.
		*/
		/** THE 3D STAGE COLOUR (the one owner). The void every raw-three
		*  viewport clears behind its scene, and the light counterpart the
		*  pose stage flips to. Every renderer/background that paints this
		*  stage reads these constants — a stage colour edited in one place
		*  lands at every stage.
		*
		*  The CSS channel is the `--melite-stage-bg` custom property:
		*  ViewportFrame sets it from STAGE_BACKGROUND_DARK on the frame
		*  element, and the sheets that tint the frame and the overlays on
		*  it read that property, so no stylesheet restates the hex. */
		const STAGE_BACKGROUND_DARK = "#0e0e1a";
		const STAGE_BACKGROUND_LIGHT = "#e4e4f0";
		/** The r3f pointer-events analogue lives on userData.pick (see header). */
		function findPickCarrier(o) {
			let cur = o;
			while (cur !== null) {
				if (cur.userData !== void 0 && cur.userData.pick !== void 0) return cur;
				cur = cur.parent;
			}
			return null;
		}
		/** Skip hits on a TransformControls gizmo subtree (invisible pick planes
		*  would swallow every click while a gizmo is attached). */
		function isGizmoHit(o) {
			let cur = o;
			while (cur !== null) {
				if (cur.gizmo !== void 0) return true;
				cur = cur.parent;
			}
			return false;
		}
		function mountStage3D(canvas, opts = {}) {
			let renderer;
			try {
				renderer = new _melite_three_client_client.WebGLRenderer({
					canvas,
					antialias: true,
					alpha: opts.alpha !== false,
					preserveDrawingBuffer: opts.preserveDrawingBuffer === true
				});
			} catch (e) {
				opts.onContextFailure?.(rejectionVoice(e));
				return null;
			}
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = _melite_three_client_client.PCFShadowMap;
			renderer.toneMapping = opts.toneMapping ?? _melite_three_client_client.ACESFilmicToneMapping;
			const scene = new _melite_three_client_client.Scene();
			scene.background = null;
			const camera = new _melite_three_client_client.PerspectiveCamera(opts.fov ?? 45, 1, opts.near ?? .05, opts.far ?? 60);
			camera.position.set(...opts.camera ?? [
				2.2,
				1.6,
				2.6
			]);
			camera.lookAt(0, .8, 0);
			const controls = new _melite_three_client_client.OrbitControls(camera, canvas);
			controls.target.set(...opts.target ?? [
				0,
				.8,
				0
			]);
			controls.enableDamping = true;
			controls.dampingFactor = .1;
			if (opts.minDistance !== void 0) controls.minDistance = opts.minDistance;
			if (opts.maxDistance !== void 0) controls.maxDistance = opts.maxDistance;
			if (opts.maxPolarAngle !== void 0) controls.maxPolarAngle = opts.maxPolarAngle;
			controls.update();
			const ticks = [];
			const addTick = (fn) => {
				ticks.push(fn);
				return () => {
					const i = ticks.indexOf(fn);
					if (i >= 0) ticks.splice(i, 1);
				};
			};
			const raycaster = new _melite_three_client_client.Raycaster();
			const pointer = new _melite_three_client_client.Vector2();
			let hovered = null;
			let downAt = 0;
			const threshold = opts.clickVsDragMs ?? 350;
			const pickAt = (ev) => {
				const r = canvas.getBoundingClientRect();
				if (r.width === 0 || r.height === 0) return null;
				pointer.x = (ev.clientX - r.left) / r.width * 2 - 1;
				pointer.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
				raycaster.setFromCamera(pointer, camera);
				const hits = raycaster.intersectObjects(scene.children, true);
				for (const hit of hits) {
					if (isGizmoHit(hit.object)) continue;
					const carrier = findPickCarrier(hit.object);
					if (carrier !== null) return {
						carrier,
						point: hit.point
					};
				}
				return null;
			};
			const onPointerDown = (e) => {
				downAt = e.timeStamp;
			};
			const onPointerMove = (e) => {
				const found = pickAt(e);
				const carrier = found?.carrier ?? null;
				if (carrier !== hovered) {
					(hovered?.userData.pick)?.out?.(e);
					document.body.style.cursor = "auto";
					hovered = carrier;
					if (carrier !== null && found !== null) carrier.userData.pick.over?.(found.point, e);
				}
			};
			const onPointerLeave = (e) => {
				if (hovered !== null) {
					hovered.userData.pick.out?.(e);
					document.body.style.cursor = "auto";
					hovered = null;
				}
			};
			const onClick = (e) => {
				if (e.timeStamp - downAt > threshold) return;
				const found = pickAt(e);
				if (found !== null) found.carrier.userData.pick.click?.(found.point, e);
				else opts.onEmptyClick?.();
			};
			canvas.addEventListener("pointerdown", onPointerDown);
			canvas.addEventListener("pointermove", onPointerMove);
			canvas.addEventListener("pointerleave", onPointerLeave);
			canvas.addEventListener("click", onClick);
			let raf = 0;
			const clock = new _melite_three_client_client.Clock();
			const frame = () => {
				raf = requestAnimationFrame(frame);
				const delta = clock.getDelta();
				for (const t of ticks) t(delta);
				controls.update();
				renderer.render(scene, camera);
			};
			frame();
			const resize = () => {
				const w = canvas.clientWidth, h = canvas.clientHeight;
				if (w === 0 || h === 0) return;
				renderer.setSize(w, h, false);
				camera.aspect = w / h;
				camera.updateProjectionMatrix();
			};
			resize();
			const ro = new ResizeObserver(resize);
			ro.observe(canvas);
			return {
				canvas,
				renderer,
				scene,
				camera,
				controls,
				addTick,
				resize,
				dispose: () => {
					cancelAnimationFrame(raf);
					ro.disconnect();
					canvas.removeEventListener("pointerdown", onPointerDown);
					canvas.removeEventListener("pointermove", onPointerMove);
					canvas.removeEventListener("pointerleave", onPointerLeave);
					canvas.removeEventListener("click", onClick);
					controls.dispose();
					renderer.dispose();
				}
			};
		}
		/** A billboard TEXT label — the drei <Billboard><Text/></Text> analogue:
		*  canvas-drawn glyphs on a THREE.Sprite (sprites always face the camera,
		*  which IS the billboard). worldHeight is the label's height in scene
		*  units (drei Text's fontSize is world units too). */
		function makeLabelSprite(text, color, worldHeight) {
			const px = 96;
			const c = document.createElement("canvas");
			const ctx = c.getContext("2d");
			if (ctx !== null) {
				ctx.font = `600 ${px}px system-ui, sans-serif`;
				const w = Math.ceil(ctx.measureText(text).width) + 32;
				c.width = w;
				c.height = 128;
				ctx.font = `600 ${px}px system-ui, sans-serif`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillStyle = color;
				ctx.fillText(text, w / 2, 64);
			}
			const tex = new _melite_three_client_client.CanvasTexture(c);
			tex.minFilter = _melite_three_client_client.LinearFilter;
			const mat = new _melite_three_client_client.SpriteMaterial({
				map: tex,
				transparent: true
			});
			const sprite = new _melite_three_client_client.Sprite(mat);
			const aspect = c.width / c.height;
			sprite.scale.set(worldHeight * aspect, worldHeight, 1);
			return sprite;
		}
		//#endregion
		//#region \0dsh-css:packages/web/card-base/src/preview.module.css.mjs
		const css$3 = ".oHl7Va_stagePreview{flex-direction:column;flex:1;gap:8px;min-height:0;display:flex;position:relative;overflow:hidden}.oHl7Va_figureError{z-index:2;color:var(--dsw-alias-label-error);background:var(--dsw-alias-bg-solid);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:4px 8px;font-size:11px;position:absolute;top:8px;left:8px;right:8px}.oHl7Va_hero{object-fit:contain;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;flex:1;width:100%;min-height:0}.oHl7Va_heroImg{object-fit:contain;background:var(--dsw-alias-bg-base);border:1px solid var(--dsh-alias-border-l2);border-radius:6px;flex:none;width:auto;min-width:0;max-width:100%;height:46vh;margin:0 auto;display:block}.oHl7Va_heroAudio{flex:none;width:100%;min-height:48px;margin:auto 0}.oHl7Va_empty{color:var(--dsw-alias-label-dimmed);border:1px dashed var(--dsw-alias-border-l2);border-radius:6px;flex:1;justify-content:center;align-items:center;font-size:11px;display:flex}.oHl7Va_strip{flex:none;gap:6px;display:flex;overflow-x:auto}.oHl7Va_stripLink{color:var(--dsw-alias-brand-primary);white-space:nowrap;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:2px 6px;font-size:10px;text-decoration:none}.oHl7Va_thumbVideoBtn{box-sizing:border-box;cursor:pointer;background:0 0;border:1px solid #0000;border-radius:8px;flex-direction:column;gap:2px;width:128px;padding:2px;display:flex}.oHl7Va_thumbVideoBtn:hover{border-color:var(--dsw-alias-border-l2)}.oHl7Va_thumbVideoActive{border-color:var(--dsw-alias-brand-primary)}.oHl7Va_thumbVideo{background:var(--dsw-alias-bg-base);object-fit:contain;border-radius:6px;width:100%;height:66px;display:block}.oHl7Va_thumbVideoName{color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;font-size:10px;overflow:hidden}.oHl7Va_thumbRow{overscroll-behavior:contain;flex-wrap:wrap;flex:none;gap:6px;display:flex;overflow-x:auto}.oHl7Va_thumb{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;height:48px}.oHl7Va_thumbFace{box-sizing:content-box;border:1px solid var(--dsw-alias-border-l2);width:16px;height:16px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-base);border-radius:4px;flex:none;padding:15px}.oHl7Va_historyBlock{overscroll-behavior:contain;flex-direction:column;flex:none;gap:4px;max-height:240px;padding-top:4px;display:flex;overflow-y:auto}.oHl7Va_historyTitle{color:var(--dsw-alias-label-secondary);font-size:11px}.oHl7Va_historyTile{cursor:pointer;background:0 0;border:1px solid #0000;border-radius:4px;padding:0;display:inline-flex}.oHl7Va_historyTile:hover,.oHl7Va_historyTileActive{border-color:var(--dsw-alias-border-l2)}.oHl7Va_staleBadge{color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);cursor:pointer;background:0 0;border-radius:6px;flex:none;align-self:flex-start;padding:2px 6px;font-size:10px}.oHl7Va_staleBadge:hover{border-color:var(--dsw-alias-border-l2)}.oHl7Va_layerRow{flex:none;gap:6px;display:flex}.oHl7Va_layerChip{color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);cursor:pointer;background:0 0;border-radius:6px;flex:none;padding:2px 6px;font-size:10px}.oHl7Va_layerChip[aria-pressed=true]{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}.oHl7Va_reportCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);text-align:left;border-radius:8px;flex-direction:column;gap:6px;padding:8px 10px;display:flex}.oHl7Va_reportHead{align-items:center;gap:6px;min-width:0;display:flex}.oHl7Va_reportStatus{letter-spacing:.04em;color:var(--dsw-alias-label-secondary);font-size:10px}.oHl7Va_reportTitle{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;overflow:hidden}.oHl7Va_reportChips{flex-wrap:wrap;gap:4px;display:flex}.oHl7Va_reportChip{color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;flex:none;padding:1px 6px;font-size:10px}.oHl7Va_reportRows{flex-direction:column;gap:2px;margin:0;display:flex}.oHl7Va_reportRow{justify-content:space-between;gap:12px;min-width:0;display:flex}.oHl7Va_reportKey{overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-dimmed);flex:0 auto;font-size:10px}.oHl7Va_reportVal{font-family:var(--dsw-alias-font-mono);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:10px}.oHl7Va_stageCanvas{touch-action:none;width:100%;height:100%;min-height:320px;max-height:46vh;display:block}.oHl7Va_heroIncoming{opacity:0;pointer-events:none;width:100%;height:100%;position:absolute;inset:0}";
		const tagId$3 = "@melite/card-base/preview.module.css@5953f945";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/card-base";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var preview_module_css_default = {
			"empty": "oHl7Va_empty",
			"figureError": "oHl7Va_figureError",
			"hero": "oHl7Va_hero",
			"heroAudio": "oHl7Va_heroAudio",
			"heroImg": "oHl7Va_heroImg",
			"heroIncoming": "oHl7Va_heroIncoming",
			"historyBlock": "oHl7Va_historyBlock",
			"historyTile": "oHl7Va_historyTile",
			"historyTileActive": "oHl7Va_historyTileActive",
			"historyTitle": "oHl7Va_historyTitle",
			"layerChip": "oHl7Va_layerChip",
			"layerRow": "oHl7Va_layerRow",
			"reportCard": "oHl7Va_reportCard",
			"reportChip": "oHl7Va_reportChip",
			"reportChips": "oHl7Va_reportChips",
			"reportHead": "oHl7Va_reportHead",
			"reportKey": "oHl7Va_reportKey",
			"reportRow": "oHl7Va_reportRow",
			"reportRows": "oHl7Va_reportRows",
			"reportStatus": "oHl7Va_reportStatus",
			"reportTitle": "oHl7Va_reportTitle",
			"reportVal": "oHl7Va_reportVal",
			"stageCanvas": "oHl7Va_stageCanvas",
			"stagePreview": "oHl7Va_stagePreview",
			"staleBadge": "oHl7Va_staleBadge",
			"strip": "oHl7Va_strip",
			"stripLink": "oHl7Va_stripLink",
			"thumb": "oHl7Va_thumb",
			"thumbFace": "oHl7Va_thumbFace",
			"thumbRow": "oHl7Va_thumbRow",
			"thumbVideo": "oHl7Va_thumbVideo",
			"thumbVideoActive": "oHl7Va_thumbVideoActive",
			"thumbVideoBtn": "oHl7Va_thumbVideoBtn",
			"thumbVideoName": "oHl7Va_thumbVideoName"
		};
		//#endregion
		//#region src/glb-stage.tsx
		/**
		* glb-stage.tsx — THE MESH PREVIEW (the preview seam's mesh-kind
		* claim, hour 14 2026-09-13). Grown from img-to-mesh's GlbViewport
		* (the raw-three substrate, verbatim) + the old @melite-plugin/3d
		* Stage's multi-asset contract (assets/selection/per-asset errors —
		* the four props anny's assembly actually uses; drop-placement
		* gizmos and mixers stay unported until a consumer ports them, the
		* promotion law).
		*
		* SUBSTRATE LAW (verbatim, the 2026-09-12 boot-crash lesson): RAW
		* three.js — imperative scene in a useEffect, NO @react-three. r3f's
		* bundled react-reconciler reads the seeded React 19 internals by
		* minified single-letter fields and a version-skew throws at boot
		* ("reading 'S' of undefined"). three is a pure leaf library: no
		* React entanglement, mounts like any imperative canvas lib.
		*
		* THE PREVIEW-PORT INTERACTION LAW (the operator's catch, hour 14:
		* "Anny and Trellis are close to the same, but the way they interact
		* with the preview port is different"): ONE stage component serves
		* both — selection + per-asset errors are the stage's own uniform
		* interaction surface; studio chrome (anchors, badges, in-card
		* actions like anny's HMR fit-body) docks AROUND it, never inside.
		*/
		let draco = null;
		function loader() {
			if (draco === null) {
				draco = new _melite_three_client_client.DRACOLoader();
				draco.setDecoderPath("/draco/gltf/");
			}
			const l = new _melite_three_client_client.GLTFLoader();
			l.setDRACOLoader(draco);
			return l;
		}
		/** One stage asset — the old Stage contract's live subset (the four
		*  fields consumers set: id/url/name + the placement override; the
		*  drop-raycast position stays caller-computed). */
		function meshAssetUrl(value) {
			const match = /^data\/input\/([^?#]+)$/i.exec(value);
			return match === null ? value : `/v1/assets/inputs/${encodeURIComponent(match[1] ?? "")}`;
		}
		/** Normalize a loaded scene to a known viewing size — the fit law:
		*  center X/Z, scale the largest dimension to targetHeight, feet on
		*  y=0, mutating the root in place. The ALGORITHM lives in
		*  @melite/formats (fitObjectToHeight); this adapts the return shape
		*  its callers read. Meshes arrive at wildly different scales, and
		*  the one rule is that every viewport frames them identically. */
		function autoFitToHeight(root, targetHeight = 1.6) {
			fitObjectToHeight(root, targetHeight);
			const box = new _melite_three_client_client.Box3().setFromObject(root);
			return {
				box,
				height: box.getSize(new _melite_three_client_client.Vector3()).y
			};
		}
		/** The imperative three scene — BUILT ON THE SHARED STAGE CORE
		*  (stage3d.ts): the core owns renderer/camera/controls/rAF/resize/picking;
		*  this adds the glb-stage's own light rig + floor grid and maps the core's
		*  pick semantics onto the stage-asset id (group.userData.pick → clickSink,
		*  empty click → clickSink(null)). A drag-orbit never reads as a click. */
		function mountScene(canvas, onFail) {
			let clickSink = () => {};
			const stage = mountStage3D(canvas, {
				fov: 40,
				camera: [
					2.2,
					1.6,
					2.6
				],
				target: [
					0,
					.8,
					0
				],
				toneMapping: _melite_three_client_client.NoToneMapping,
				onContextFailure: onFail,
				onEmptyClick: () => clickSink(null)
			});
			if (stage === null) return null;
			const scene = stage.scene;
			scene.add(new _melite_three_client_client.HemisphereLight(16777215, 9079434, 1.4));
			const key = new _melite_three_client_client.DirectionalLight(16777215, 2.2);
			key.position.set(3, 5, 2);
			scene.add(key);
			const fill = new _melite_three_client_client.DirectionalLight(16777215, .6);
			fill.position.set(-3, 2, -2);
			scene.add(fill);
			const grid = new _melite_three_client_client.GridHelper(6, 24, 12303291, 14540253);
			const gridMat = grid.material;
			gridMat.transparent = true;
			gridMat.opacity = .35;
			scene.add(grid);
			return {
				scene,
				setClickSink: (fn) => {
					clickSink = fn;
				},
				addTick: stage.addTick,
				dispose: () => {
					grid.geometry.dispose();
					stage.dispose();
				}
			};
		}
		/** The selection tint — emissive lift on the selected group's meshes
		*  (the old Stage's highlight, the DOM-free way; lifted meshes read
		*  at any theme because emissive adds, never replaces). */
		function tint(root, on) {
			root.traverse((o) => {
				const m = o.material;
				if (m !== void 0 && m !== null && "emissive" in m) m.emissive.setHex(on ? 3159626 : 0);
			});
		}
		/** Flip the wireframe flag on every wireframe-capable material under
		*  the root (mesh materials; points/lines have no such flag and are
		*  left alone). Idempotent — loads mint fresh materials, so no
		*  original-flag bookkeeping is owed. */
		function applyWireframe(root, on) {
			root.traverse((o) => {
				const m = o.material;
				if (m !== void 0 && m !== null && "wireframe" in m) m.wireframe = on;
			});
		}
		/** A bone-visualization overlay for one loaded group — null when
		*  the group carries no bones (unrigged meshes seat no overlay, the
		*  honest absence). The caller adds the helper to the scene and owns
		*  its visibility + disposal. */
		function skeletonHelperFor(group) {
			const bones = [];
			group.traverse((o) => {
				if (o.isBone === true) bones.push(o);
			});
			if (bones.length === 0) return null;
			return new _melite_three_client_client.SkeletonHelper(group);
		}
		/** THE TURNTABLE SPEED (radians/sec) — one revolution every ~12.5s,
		*  the gentle review idle; fast enough to read as motion in a
		*  glance, slow enough to inspect. */
		const TURNTABLE_SPEED = .5;
		/** One turntable frame: rotate every group about its OWN Y axis
		*  (each spins in place — the row layout's positions stand). Pure —
		*  the stage's tick seam calls it with the rAF delta; a 0 delta is
		*  a no-op. Declared per-asset rotation rides along (the spin adds
		*  to the current angle, never resets it). */
		function turntableTick(groups, delta) {
			if (delta === 0) return;
			const d = TURNTABLE_SPEED * delta;
			for (const g of groups) g.rotation.y += d;
		}
		/** ── THE WEIGHTS HEAT OVERLAY (primitive ②, fourth slice) ───────────
		*
		* Per-vertex skin-weight heat: a skinned mesh's dominant-bone weight
		* (the max of its skinWeight components, ∈ [0.25,1] under 4
		* influences) paints a blue→red ramp through vertex colors. Unskinned
		* meshes are untouched (no skinWeight attribute — no lane, no paint).
		* OFF restores each geometry's ORIGINAL color attribute (cached the
		* first time we touch it — absent means we delete ours) and the
		* material's vertexColors flag. Idempotent both ways. */
		/** The heat ramp — 5 stops (blue→cyan→green→yellow→red), t clamped.
		*  Pure: the same ramp every stage paints, the wall pins the stops. */
		function heatColor(t) {
			const x = Math.min(1, Math.max(0, t));
			const stops = [
				[
					0,
					0,
					1
				],
				[
					0,
					1,
					1
				],
				[
					0,
					1,
					0
				],
				[
					1,
					1,
					0
				],
				[
					1,
					0,
					0
				]
			];
			const s = x * (stops.length - 1);
			const i = Math.min(stops.length - 2, Math.floor(s));
			const f = s - i;
			const a = stops[i], b = stops[i + 1];
			return [
				a[0] + (b[0] - a[0]) * f,
				a[1] + (b[1] - a[1]) * f,
				a[2] + (b[2] - a[2]) * f
			];
		}
		const weightColorCache = /* @__PURE__ */ new WeakMap();
		function applyWeightsHeat(root, on) {
			root.traverse((o) => {
				const mesh = o;
				const geo = mesh.geometry;
				if (geo === void 0) return;
				const mat = mesh.material;
				if (mat === void 0 || mat === null || Array.isArray(mat)) return;
				const sw = geo.getAttribute("skinWeight");
				if (sw === void 0) return;
				const pos = geo.getAttribute("position");
				if (pos === void 0) return;
				const sm = mat;
				if (on) {
					if (!weightColorCache.has(geo)) weightColorCache.set(geo, geo.getAttribute("color") ?? null);
					const colors = new Float32Array(pos.count * 3);
					const comps = Math.min(4, sw.itemSize);
					for (let i = 0; i < pos.count; i++) {
						let w = sw.getX(i);
						for (let c = 1; c < comps; c++) {
							const v = c === 1 ? sw.getY(i) : c === 2 ? sw.getZ(i) : sw.getW(i);
							if (v > w) w = v;
						}
						const [r, g, b] = heatColor(w);
						colors[i * 3] = r;
						colors[i * 3 + 1] = g;
						colors[i * 3 + 2] = b;
					}
					geo.setAttribute("color", new _melite_three_client_client.BufferAttribute(colors, 3));
					sm.vertexColors = true;
					sm.needsUpdate = true;
				} else {
					const orig = weightColorCache.get(geo);
					if (orig === null) geo.deleteAttribute("color");
					else if (orig !== void 0) geo.setAttribute("color", orig);
					if (sm.vertexColors === true) {
						sm.vertexColors = false;
						sm.needsUpdate = true;
					}
				}
			});
		}
		/** ── NAMED MESH SLOTS (primitive ②, third slice) ────────────────────
		* A comparison seat: assets may declare a SLOT (`slot: 'source'` /
		* `'result'`, body/garment, donor/target, LOD names) — the stage
		* paints the slot's label above the asset (a billboard sprite, the
		* stage3d makeLabelSprite). Unslotted assets seat unlabeled, as
		* ever. Pure derivation, mount-side paint (the WebGL-exempt arm). */
		function slotLabelOf(asset) {
			return typeof asset.slot === "string" && asset.slot !== "" ? asset.slot : null;
		}
		/** THE MESH STAGE PREVIEW — the multi-asset GLB viewport (assets in a
		*  row, click to select, per-asset load failures reported upward).
		*  No assets → the honest empty state; the canvas mounts when the
		*  first asset lands. */
		function GlbStagePreview({ assets, selectedId, onSelect, onAssetError, emptyHint, label, layers, onLayers, turntable }) {
			const canvasRef = (0, react.useRef)(null);
			const sceneRef = (0, react.useRef)(null);
			const skeletonHelpers = (0, react.useRef)([]);
			const slotLabels = (0, react.useRef)([]);
			const [loaded, setLoaded] = (0, react.useState)([]);
			const [failed, setFailed] = (0, react.useState)(null);
			const [ready, setReady] = (0, react.useState)(false);
			const selectRef = (0, react.useRef)(onSelect);
			selectRef.current = onSelect;
			const key = assets.map((a) => a.id + "@" + a.url).join("|");
			const errRef = (0, react.useRef)(onAssetError);
			errRef.current = onAssetError;
			const groupsRef = (0, react.useRef)([]);
			groupsRef.current = loaded.map((l) => l.group);
			const turntableRef = (0, react.useRef)(turntable === true);
			turntableRef.current = turntable === true;
			(0, react.useEffect)(() => {
				setLoaded([]);
				setFailed(null);
				setReady(false);
				if (assets.length === 0) return;
				let alive = true;
				let pending = assets.length;
				const settle = () => {
					if (alive && pending === 0) setReady(true);
				};
				for (const a of assets) loader().load(meshAssetUrl(a.url), (g) => {
					if (!alive) return;
					autoFitToHeight(g.scene);
					const group = new _melite_three_client_client.Group();
					group.userData.stageId = a.id;
					group.userData.pick = { click: () => selectRef.current?.(a.id) };
					group.add(g.scene);
					if (a.scale !== void 0) group.scale.multiplyScalar(a.scale);
					if (a.rotation !== void 0) group.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
					if (a.position !== void 0) group.position.set(a.position[0], a.position[1], a.position[2]);
					setLoaded((prev) => [...prev, {
						asset: a,
						group
					}]);
					errRef.current?.(a.id, null);
					pending -= 1;
					settle();
				}, void 0, (e) => {
					if (!alive) return;
					errRef.current?.(a.id, rejectionVoice(e));
					pending -= 1;
					settle();
				});
				return () => {
					alive = false;
				};
			}, [key]);
			(0, react.useEffect)(() => {
				if (!ready || loaded.length === 0) return;
				const canvas = canvasRef.current;
				const mounted = mountScene(canvas, (m) => setFailed(m));
				if (mounted === null) return;
				sceneRef.current = mounted;
				mounted.setClickSink((id) => selectRef.current?.(id));
				let x = 0;
				for (const { asset, group } of loaded) {
					mounted.scene.add(group);
					if (asset.position === void 0) {
						const box = new _melite_three_client_client.Box3().setFromObject(group);
						const size = new _melite_three_client_client.Vector3();
						box.getSize(size);
						group.position.x += x + size.x / 2;
						x += size.x + .4;
					}
				}
				const helpers = [];
				for (const { group } of loaded) {
					const helper = skeletonHelperFor(group);
					if (helper !== null) {
						helper.visible = false;
						mounted.scene.add(helper);
						helpers.push(helper);
					}
				}
				skeletonHelpers.current = helpers;
				const labels = [];
				for (const { asset, group } of loaded) {
					const text = slotLabelOf(asset);
					if (text === null) continue;
					const sprite = makeLabelSprite(text, "#1c1f26", .05);
					const box = new _melite_three_client_client.Box3().setFromObject(group);
					sprite.position.set(group.position.x, box.max.y + .06, 0);
					mounted.scene.add(sprite);
					labels.push(sprite);
				}
				slotLabels.current = labels;
				mounted.addTick((dt) => {
					if (!turntableRef.current) return;
					turntableTick(groupsRef.current, dt);
				});
				return () => {
					for (const helper of skeletonHelpers.current) {
						mounted.scene.remove(helper);
						helper.dispose();
					}
					skeletonHelpers.current = [];
					for (const sprite of slotLabels.current) {
						mounted.scene.remove(sprite);
						const mat = sprite.material;
						mat.map?.dispose();
						mat.dispose();
					}
					slotLabels.current = [];
					sceneRef.current = null;
					mounted.dispose();
				};
			}, [ready, loaded]);
			(0, react.useEffect)(() => {
				for (const { asset, group } of loaded) tint(group, asset.id === selectedId);
			}, [loaded, selectedId]);
			const wireframe = layers?.wireframe ?? false;
			(0, react.useEffect)(() => {
				for (const { group } of loaded) applyWireframe(group, wireframe);
			}, [loaded, wireframe]);
			const skeleton = layers?.skeleton ?? false;
			(0, react.useEffect)(() => {
				for (const helper of skeletonHelpers.current) helper.visible = skeleton;
			}, [loaded, skeleton]);
			const weights = layers?.weights === true;
			(0, react.useEffect)(() => {
				for (const { group } of loaded) applyWeightsHeat(group, weights);
			}, [loaded, weights]);
			return (0, react.createElement)("div", {
				className: preview_module_css_default.stagePreview,
				"data-viewport": label ?? "glb-stage"
			}, assets.length === 0 ? (0, react.createElement)("div", { className: preview_module_css_default.empty }, emptyHint ?? "Run the card to see the mesh") : failed !== null ? (0, react.createElement)("div", { className: preview_module_css_default.empty }, "viewport failed: " + failed) : !ready ? (0, react.createElement)("div", { className: preview_module_css_default.empty }, "loading mesh…") : (0, react.createElement)("canvas", {
				ref: canvasRef,
				className: preview_module_css_default.stageCanvas,
				"data-testid": "stage-preview-glb"
			}), onLayers !== void 0 && assets.length > 0 ? (0, react.createElement)("div", {
				className: preview_module_css_default.layerRow,
				role: "group",
				"aria-label": "mesh layers"
			}, (0, react.createElement)("button", {
				type: "button",
				className: preview_module_css_default.layerChip,
				"aria-pressed": !wireframe,
				onClick: () => {
					onLayers({
						wireframe: false,
						skeleton,
						weights
					});
				}
			}, "Shaded"), (0, react.createElement)("button", {
				type: "button",
				className: preview_module_css_default.layerChip,
				"aria-pressed": wireframe,
				onClick: () => {
					onLayers({
						wireframe: true,
						skeleton,
						weights
					});
				}
			}, "Wireframe"), (0, react.createElement)("button", {
				type: "button",
				className: preview_module_css_default.layerChip,
				"aria-pressed": skeleton,
				onClick: () => {
					onLayers({
						wireframe,
						skeleton: !skeleton,
						weights
					});
				}
			}, "Skeleton"), (0, react.createElement)("button", {
				type: "button",
				className: preview_module_css_default.layerChip,
				"aria-pressed": weights,
				onClick: () => {
					onLayers({
						wireframe,
						skeleton,
						weights: !weights
					});
				}
			}, "Weights")) : null);
		}
		//#endregion
		//#region src/square.tsx
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
		/** THE "is this a thumbnail" rule (SlotSquare's, kept verbatim):
		*  data: images, blob: fresh-upload mirrors, and http(s)/root-relative
		*  artifact URLs. Every slot-shaped value renders the same way. */
		const IMAGE_EXTS = [...mediaVocab().image, "avif"].filter((e) => e !== "svg");
		const IMAGE_EXT_RE = new RegExp("\\.(?:" + IMAGE_EXTS.join("|") + ")(?:[?#]|$)", "i");
		function isImageUrl(value) {
			return /^data:image\//i.test(value) || /^blob:/i.test(value) || /^(?:https?:)?\/[^"'<>]*\./i.test(value) && IMAGE_EXT_RE.test(value);
		}
		/** THE MESH FACE of the same rule (the mesh wire type, 2026-09-21 —
		*  the base-gaps primitive ③): a .glb/.gltf value — an estate path
		*  ('data/input/x.glb') or a run artifact URL — renders the ONE
		*  square with the inline GLB thumb (the mini GlbStagePreview), the
		*  same square grammar as images: never a bespoke mesh picker. */
		function isMeshUrl(value) {
			return isModelUrl(value);
		}
		const DEFAULT_SQUARE_ACCEPT = "image/png,image/jpeg,image/webp";
		const MESH_SQUARE_ACCEPT = ".glb,.gltf";
		function InputSquare(props) {
			const { label, value, metric, disabled } = props;
			const seat = props.ariaLabel ?? label;
			const fileRef = (0, react.useRef)(null);
			const boxRef = (0, react.useRef)(null);
			const [over, setOver] = (0, react.useState)(false);
			const thumb = typeof value === "string" && isImageUrl(value) ? value : null;
			const mesh = thumb === null && typeof value === "string" && value !== "" && isMeshUrl(value) ? value : null;
			const empty = thumb === null && mesh === null;
			const acceptsDrop = (event) => {
				if (event.dataTransfer.getData("application/tech-noir-asset") !== "" || event.dataTransfer.files.length > 0) return true;
				const types = event.dataTransfer.types;
				if (types === void 0 || types === null) return false;
				return types.includes("application/tech-noir-asset") || types.includes("Files");
			};
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
				"data-slot-square": true,
				"aria-label": (seat || "source") + (seat !== "" ? " source" : ""),
				onClick: pick,
				onKeyDown: (e) => {
					if (e.key === "Enter") pick();
				},
				onDragOver: (e) => {
					if (disabled || !acceptsDrop(e)) return;
					e.preventDefault();
					setOver(true);
				},
				onDragLeave: () => {
					setOver(false);
				},
				onDrop: (e) => {
					setOver(false);
					if (disabled || !acceptsDrop(e)) return;
					e.preventDefault();
					const asset = parseAssetDrop(e.dataTransfer.getData(ASSET_DRAG_MIME));
					if (asset.url !== void 0 && props.onAsset !== void 0) {
						props.onAsset(asset.url);
						return;
					}
					const file = e.dataTransfer.files[0];
					if (file !== void 0 && props.onFile !== void 0) props.onFile(file);
				}
			}, thumb !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.squareThumb,
				src: thumb,
				alt: label
			}) : mesh !== null ? (0, react.createElement)("div", { className: card_module_css_default.squareMesh }, (0, react.createElement)(GlbStagePreview, {
				assets: [{
					id: "square-mesh",
					url: mesh
				}],
				label: "square-mesh"
			})) : props.emptyIcon === void 0 ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { className: card_module_css_default.squareGlyph }) : (0, react.createElement)("span", { className: card_module_css_default.squareEmptyIcon }, props.emptyIcon), props.actions !== void 0 && props.actions !== null && props.actions !== false && !disabled ? (0, react.createElement)("span", {
				className: card_module_css_default.squareActions,
				onClick: (event) => {
					event.stopPropagation();
				}
			}, props.actions) : null, !empty && props.onClear !== void 0 ? (0, react.createElement)("button", {
				className: card_module_css_default.squareX,
				type: "button",
				title: "Detach",
				"aria-label": "Detach " + (seat || "source"),
				onClick: (e) => {
					e.stopPropagation();
					props.onClear();
				}
			}, "✕") : null, props.showFileAction === true && props.onFile !== void 0 && !disabled ? (0, react.createElement)("button", {
				className: card_module_css_default.squarePick,
				type: "button",
				title: `Pick a file for ${label}`,
				"aria-label": `Pick a file for ${label}`,
				"data-slot-pick": true,
				onClick: (event) => {
					event.stopPropagation();
					fileRef.current?.click();
				}
			}, (0, react.createElement)(Upload, { "aria-hidden": true })) : null), label !== "" ? (0, react.createElement)("span", {
				className: card_module_css_default.squareLabel,
				"data-slot-label": true
			}, label) : null, props.badge === void 0 ? null : (0, react.createElement)("span", {
				className: card_module_css_default.squareBadge,
				"data-slot-badge": true
			}, props.badge), metric !== void 0 ? (0, react.createElement)("span", { className: card_module_css_default.squareMetric }, metric) : null, props.onFile !== void 0 && !disabled ? (0, react.createElement)("input", {
				ref: fileRef,
				type: "file",
				accept: props.accept ?? "image/png,image/jpeg,image/webp",
				className: card_module_css_default.squareFileInput,
				"data-slot-input": true,
				"aria-hidden": true,
				tabIndex: -1,
				onChange: (e) => {
					const file = e.target.files?.[0];
					if (file !== void 0 && file !== null) props.onFile?.(file);
					if (fileRef.current !== null) fileRef.current.value = "";
				}
			}) : null);
		}
		//#endregion
		//#region src/wirePicker.tsx
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
				className: card_module_css_default.wireDialog,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					"data-wire-modal": true,
					children: [currentId && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onUnwire,
						"data-wire-unwire": true,
						className: card_module_css_default.wireUnwire,
						children: "Unwire — this slot will ask for a file or wire again"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
						className: card_module_css_default.wireList,
						children: [priorStages.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							className: card_module_css_default.wireEmpty,
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
									className: clsx(card_module_css_default.wireOption, selected && card_module_css_default.wireSelected),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: card_module_css_default.wireIdx,
											children: String(i + 1).padStart(2, "0")
										}),
										row.thumb && isImageUrl(row.thumb) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
											src: row.thumb,
											alt: "",
											className: card_module_css_default.wireThumb
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: card_module_css_default.wireThumbFallback,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Link2, { className: card_module_css_default.sz14 })
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: card_module_css_default.wireMeta,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: card_module_css_default.wireTitle,
												children: [u.title, multi && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: card_module_css_default.wireOut,
													children: ["· ", row.label]
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: card_module_css_default.wireSub,
												children: u.result ? row.thumb ?? "no artifacts" : "not run yet"
											})]
										}),
										selected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: card_module_css_default.wiredTag,
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
		//#region src/estate-remote.ts
		/** The estate's domain refusal ({ok:false} answers): the message
		* rides verbatim; the class separates DOMAIN verdicts from transport
		* failures so policy code (the gone-verdict, the poll, the CAS
		* rebase) can discriminate. */
		var EstateRefusedError = class extends Error {
			/** The door's stable refusal code when the failure carried one
			*  (the RemoteError discriminator; policy code matches this,
			*  never message text). */
			code;
			constructor(message, code) {
				super(message);
				this.name = "EstateRefusedError";
				this.code = code;
			}
		};
		let bound;
		/** The armed lazy source (see armEstateRemoteLazyBind): the studio
		*  bind's order-proof wake, plain JS — no cordis fiber. */
		let lazySource;
		/** Capture the namespaces (the mounter's direct bind — or a test's
		*  honest fake). Idempotent; the last bind wins. */
		function bindEstateRemote(namespaces) {
			bound = namespaces;
		}
		/** Drop the bind (tests isolate between cases; also disarms the lazy
		*  source so the next case starts from the honest unbound state). */
		function unbindEstateRemote() {
			bound = void 0;
			lazySource = void 0;
		}
		/** Arm the lazy bind (the studio bundles' order-proof wake): the
		*  factory captures a plain getter reading the namespaces through
		*  the inject-free reflect seam (ctx.get — cordis' own type doc:
		*  "Read a service from the store without the inject requirement").
		*  No cordis fiber, no inject list, no epoch — a getter cannot be
		*  parked dormant, refused by a proxy, or poisoned into a parent
		*  fiber's inject set (the four receipts that killed every fiber
		*  binder). The FIRST verb pulls it (estateRemote, below); if the
		*  namespaces still do not exist the loud refusal below speaks. */
		function armEstateRemoteLazyBind(source) {
			lazySource = source;
		}
		/** The bound namespaces — LOUD when unbound, and the LAZY BIND'S
		*  MOUTH: the first verb after the mounts land pulls the armed
		*  getter once (order-proof — by first use, the mounter has long
		*  booted); a verb before the mounts (or on a host without the
		*  estate plugin) meets the loud wiring refusal, never a hang and
		*  never a silent fallback. */
		function estateRemote() {
			if (bound === void 0 && lazySource !== void 0) try {
				bindEstateRemoteFromRemote(lazySource());
			} catch {}
			if (bound === void 0) throw new Error("estate remote not mounted — the verbs ride ctx.remote (the TYPERT_REMOTE contributions must mount before any call)");
			return bound;
		}
		/** THE BIND SEAM, HARNESS-SHAPED (2026-09-29, the fourth lane
		*  receipt): the client-bundle preset inlines card-base into every
		*  consumer bundle, so this module's `bound` singleton exists PER
		*  BUNDLE — the from-media outage's second layer. Every attempt to
		*  bind through a RUNTIME child fiber died on cordis' own machinery
		*  (dotted-only injects: the proxy refuses `child.remote`; parent-
		*  only: the fiber starts INACTIVE; both: the runner's own inspect
		*  sync breaks). The harness never binds this way. Its consumers —
		*  product-analytics, ui-settings, ui-model-selection — declare
		*  STATIC plugin injects with BOTH levels (`['remote',
		*  'remote.productAnalytics']`), the loader waits for the mounted
		*  namespaces before their apply runs, and they read
		*  `ctx.remote.<namespace>` directly. That is this bind:
		*
		*  - a CONSUMING studio declares `export const inject = ['slots',
		*    'remote', 'remote.bench', 'remote.drafts', 'remote.runs',
		*    'remote.media']` on its client entry — the loader guarantees
		*    the namespaces exist when its apply runs;
		*  - the MOUNTER (card-view) injects only the parent 'remote' (the
		*    dotted names on the mounter would wait on its own $mount — the
		*    2026-09-15 deadlock) and binds directly after its mounts;
		*  - both call THIS function, the one spelling of the bind, loud on
		*    any absent namespace (a mis-injected entry is a wiring bug,
		*    never a silent hole).
		*
		*  THE WALL pins every studio entry's inject list; the singleton
		*  throw stays the runtime guard. */
		function bindEstateRemoteFromRemote(remote) {
			const { bench, drafts, runs, media, manage } = remote;
			if (bench === void 0 || drafts === void 0 || runs === void 0 || media === void 0) throw new Error("estate remote not mounted — the verbs ride ctx.remote (the TYPERT_REMOTE contributions must mount before any call)");
			const namespaces = {
				bench,
				drafts,
				runs,
				media,
				...manage === void 0 ? {} : { manage }
			};
			bindEstateRemote(namespaces);
			return namespaces;
		}
		/** The manage namespace — LOUD when the mounter did not bind it (a
		*  caller that manages on a host without the manage contribution
		*  meets the wiring refusal, never a silent fallback to a
		*  hand-rolled lane). */
		function manageRemote() {
			const ns = estateRemote().manage;
			if (ns === void 0) throw new Error("manage remote not mounted — the manage verbs ride ctx.remote (the manage contribution must mount before any call)");
			return ns;
		}
		/** Await one namespace method's RemoteResult and unwrap it: the
		*  value on ok, the estate's refusal text (verbatim) on the error
		*  branch. Accepts the promise directly so call sites stay one
		*  expression. */
		async function unwrapRemote(result, voice) {
			const settled = await result;
			if (settled.ok === true) return settled.value;
			const { error } = settled;
			const failure = error;
			throw new EstateRefusedError(typeof failure === "object" && failure !== null && typeof failure.message === "string" && failure.message !== "" ? failure.message : voice + ": refused", typeof failure === "object" && failure !== null && typeof failure.code === "string" ? failure.code : void 0);
		}
		/** The door's stable CAS refusal code (bench verbs, bench ensure,
		*  drafts/patch — every voice that means "the bench moved under
		*  you; re-read and re-apply"). */
		const CAS_CONFLICT_CODE = "bench/cas-conflict";
		/** True when the throw is the door's CAS verdict (stale or missing
		*  expect_rev) — the ONLY refusal a rebase-and-retry may answer. Any
		*  other refusal (admission, unknown stage, store failure) throws
		*  through untouched: retrying those would be a fallback.
		*
		*  THE CODE IS THE VOICE (2026-10-12): the protocol's own law is
		*  "discrimination is always by code, never by instanceof" — and
		*  never by message text. Two dead-matcher incidents (2026-09-15,
		*  2026-10-09) were substring law: each new door phrasing
		*  ('bench main moved: rev is…', 'bench moved under the patch…')
		*  slipped past the arms and the rebase went dead in production.
		*  unwrapRemote forwards the RemoteError code, and every CAS
		*  refusal carries bench/cas-conflict, so this matches the one
		*  stable truth. */
		function isCasConflict(error) {
			return error instanceof EstateRefusedError && error.code === "bench/cas-conflict";
		}
		/** Refusal discrimination for policy code (the CAS rebase, the
		* gone-verdict, the poll's file-era arms). */
		function isEstateRefusal(error) {
			return error instanceof EstateRefusedError;
		}
		//#endregion
		//#region src/wire.ts
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
		/** POST one manage action through the MOUNTED `manage` remote —
		* ctx.remote's generated namespace (the typert contribution card-view
		* mounts; the api-gateway law reserves transport, RPC ids, response
		* envelopes, and cancellation to the Connection, and the zod codecs
		* on both ends own frame validation). The single argument is `doc`
		* (the action plus its JSON params — the dispatcher validates the
		* params per action). THE DOWNLOAD PROMPT's arm (no-silent-drop law,
		* stroke 18): a boarded-but-not-downloaded model is OFFERED — the
		* surfaces prompt the user, the click lands here as provision_model
		* (the manager queues the download; present files are skipped). A
		* refusal is a DOMAIN outcome: the seat throws manage/refused, the
		* Connection folds it into the RemoteResult error branch, and the
		* envelope carries it (ok:false + detail) — the caller renders the
		* truth, never a throw past the surface. Transport failures (an
		* unmounted lane, a dead connection) still throw LOUD — never a
		* silent ok:false.
		* @param action - the manage action name (the doc's action field).
		* @param payload - the action's JSON params (spread over the doc).
		* @param signal - caller cancellation, threaded to the Connection.
		* @returns the envelope reply: ok true with detail/data, or ok false
		* with the refusal's text. */
		async function postManageAction(action, payload, signal) {
			const doc = {
				action,
				...payload
			};
			const settled = await manageRemote().act(doc, signal);
			if (settled.ok === true) {
				const row = settled.value;
				if (row.ok !== true) return {
					ok: false,
					detail: row.detail
				};
				return {
					ok: true,
					detail: row.detail,
					data: row.data
				};
			}
			const failure = settled.error;
			return {
				ok: false,
				detail: typeof failure === "object" && failure !== null && typeof failure.message === "string" && failure.message !== "" ? failure.message : "manage/" + action + " refused"
			};
		}
		/** /v1/model-catalog → the cards section (the picker's ONE surface —
		*  action cards, one tile per card package; models are NOT entries). */
		async function fetchCardCatalog(signal) {
			const raw = (await v1Get("/v1/model-catalog", signal))["cards"] ?? {};
			const out = [];
			for (const [id, row] of Object.entries(raw)) {
				if (typeof row !== "object" || row === null) continue;
				const famsRaw = row["families"];
				out.push({
					id,
					label: typeof row["label"] === "string" ? row["label"] : id,
					description: typeof row["description"] === "string" ? row["description"] : "",
					genre: typeof row["genre"] === "string" ? row["genre"] : "",
					families: Array.isArray(famsRaw) ? famsRaw.filter((x) => typeof x === "string") : [id]
				});
			}
			return out.sort((a, b) => a.label.localeCompare(b.label));
		}
		/** The form-spec boundary judgment (one home — audit #48's cure):
		* refuses a doc without a schema envelope and walks every envelope's
		* refs for a wtype outside WTYPE_SET (strictness fix 5, 2026-10-01 —
		* LAW 8's missing side: the write-side bag guard refuses foreign
		* spellings at the declaration; THIS is the boundary the served doc
		* crosses, and a foreign wtype renders the silent plain-text
		* fallback, so here it refuses, naming the field and the set's home).
		* Exported so a test seating a fixture crosses the SAME judgment the
		* live fetch does — no `as unknown as` sidestep can outlive it.
		* @param doc the served doc (or a fixture standing in for one)
		* @param model names the doc in the refusal
		* @returns the doc, narrowed, when every judgment passes
		* @throws Error naming the first structural failure */
		function assertFormSpecDoc(doc, model) {
			const env = doc["schema"];
			if (env !== null && (typeof env !== "object" || typeof env.uid !== "number" || typeof env.refs !== "object")) throw new Error("form-spec: no schema envelope");
			const wtypeErrors = [];
			const judgeEnvelope = (e, surface) => {
				if (e === null || e === void 0 || typeof e !== "object") return;
				const refs = e.refs;
				if (typeof refs !== "object" || refs === null) return;
				for (const [id, node] of Object.entries(refs)) {
					if (typeof node !== "object" || node === null) continue;
					const extra = node.meta?.["extra"];
					if (typeof extra !== "object" || extra === null) continue;
					const w = extra["wtype"];
					if (w !== void 0 && w !== "" && !WTYPE_SET.includes(w)) wtypeErrors.push(`${surface} ref ${id}: wtype '${String(w)}' is not in WTYPE_SET (@melite/contracts/extraKeys)`);
				}
			};
			judgeEnvelope(doc["schema"], "schema");
			for (const [pack, env2] of Object.entries(doc["mod_schemas"] ?? {})) judgeEnvelope(env2, `mod:${pack}`);
			if (wtypeErrors.length > 0) throw new Error(`form-spec ${model}: ${wtypeErrors.join("; ")}`);
			return doc;
		}
		/** /v1/form-spec?model=<family> — the card family's emission (the
		*  serialized schema envelope + model defaults + the declared edges
		*  + the mod kinds and their envelopes). */
		async function fetchFormSpec(model, signal) {
			return assertFormSpecDoc(await v1Get("/v1/form-spec?model=" + encodeURIComponent(model), signal), model);
		}
		/** /v1/forms — every card's meta row (the edge emission included). */
		async function fetchFormsTable(signal) {
			return v1Get("/v1/forms", signal);
		}
		/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL; the
		*  mesh wire type boards .glb/.gltf — model/gltf-binary, or the
		*  browser's octet-stream with a GLB name) → the input-dir path the
		*  param accepts. The door's own gates (type whitelist, one clean
		*  segment) are the law — the client only voices its refusals, never
		*  invents its own. */
		async function uploadInputFile(file) {
			const isImage = file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp";
			const isAudio = file.type.startsWith("audio/");
			const glbName = /\.glb$/i.test(file.name) || /\.gltf$/i.test(file.name);
			const isMesh = file.type === "model/gltf-binary" || file.type === "model/gltf+json" || file.type === "application/octet-stream" && glbName;
			if (!isImage && !isAudio && !isMesh) throw new Error("Input cards don’t accept " + (file.type !== "" ? file.type : "that file") + " — drop an image, audio, or .glb/.gltf file");
			if (isAudio) throw new Error("audio uploads have no door yet — the uploads door boards png / jpeg / webp / glb only");
			const dataUrl = await readAsDataURL(file);
			const res = await fetch("/v1/uploads", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					filename: file.name,
					data: dataUrl
				})
			});
			if (!res.ok) throw new Error("upload refused: HTTP " + String(res.status));
			const out = await res.json();
			const path = typeof out === "object" && out !== null && typeof Reflect.get(out, "path") === "string" ? Reflect.get(out, "path") : "";
			if (path === "") throw new Error("upload answered without a path");
			return {
				name: path,
				file: path.split("/").pop()
			};
		}
		//#endregion
		//#region src/square-provider.tsx
		/** square-provider.tsx — extracted from form.tsx (hour 15, the godfile split; the
		* operator's DRY audit law: one seam, one small file, one wall). */
		/** The media-kind the picker fetches for a field: image fields name
		*  image; mesh fields name the MEDIA vocabulary's kind for 3D, which
		*  is `model` — NOT `mesh`. `mesh` is the client PREVIEW kind
		*  (preview-kinds.ts), a different vocabulary; the media list door
		*  admits image/audio/video/model/all and refuses anything else with
		*  `media/kind`, so asking it for `mesh` was a guaranteed refusal that
		*  the picker swallowed into an empty list (the "From media" row was
		*  empty for every mesh field, with no error anywhere). file fields
		*  take the whole library (their accept narrows client-side per row). */
		function mediaKindForField(f) {
			if (f.type === "image") return "image";
			if (f.type === "mesh") return "model";
			return "all";
		}
		/** THE OS-DIALOG ACCEPT, derived per field (primitive ③): mesh rows
		*  offer the GLB pair; everything else keeps the image triad (the
		*  historic default). The provider's ONE hidden input re-targets
		*  imperatively at click time — the accept is a property of the
		*  field being picked, never of the provider instance. */
		function acceptOfField(f) {
			return f !== null && f.type === "mesh" ? MESH_SQUARE_ACCEPT : DEFAULT_SQUARE_ACCEPT;
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
			const [mediaErr, setMediaErr] = (0, react.useState)(null);
			const fileRef = (0, react.useRef)(null);
			const onFile = (0, react.useCallback)(async (f, file) => {
				if (wire.onFile !== void 0) {
					wire.onFile(file);
					return;
				}
				try {
					const dataUrl = await readAsDataURL(file);
					if (f.type !== "mesh") setMirror((m) => ({
						...m,
						[f.name]: dataUrl
					}));
					const { name } = await uploadInputFile(file);
					onEdit(f.name, name);
				} catch (e) {
					onEdit(f.name, rejectionVoice(e));
				}
			}, [onEdit, wire.onFile]);
			const square = (f) => {
				if (f.type !== "image" && f.type !== "file" && f.type !== "mesh") return void 0;
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
						const input = fileRef.current;
						input.accept = acceptOfField(f);
						input.click();
						return;
					}
					setMirror((m) => {
						const n = { ...m };
						delete n[f.name];
						return n;
					});
					onEdit(f.name, "");
				},
				onClose: () => {
					setPickAt(null);
				},
				portal: true
			});
			const loadMedia = wire?.loadMedia;
			(0, react.useEffect)(() => {
				if (modalAt?.mode !== "media") return;
				if (loadMedia === void 0) {
					setMediaRows([]);
					return;
				}
				const ctrl = new AbortController();
				setMediaRows(null);
				loadMedia(mediaKindForField(modalAt.field), ctrl.signal).then((items) => {
					setMediaRows(items.map((it) => ({
						id: it.url,
						label: it.name,
						url: it.url
					})));
					setMediaErr(null);
				}).catch((e) => {
					setMediaRows([]);
					setMediaErr(e instanceof Error ? e.message : String(e));
				});
				return () => {
					ctrl.abort();
				};
			}, [modalAt, loadMedia]);
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
				}, candidates.length === 0 ? (0, react.createElement)("p", { className: card_module_css_default.pickEmpty }, modalAt.mode === "media" && mediaRows === null ? "loading…" : mediaErr !== null ? "media library unavailable — " + mediaErr : "nothing to pick yet") : (0, react.createElement)("ul", { className: card_module_css_default.pickList }, candidates.map((c) => (0, react.createElement)("li", {
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
				accept: wire.accept ?? acceptOfField(null),
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
					fileRef.current.value = "";
				}
			});
			return {
				square,
				wireMenu: (0, react.createElement)(react.Fragment, null, sourceMenu, pickerModal, fileInput)
			};
		}
		//#endregion
		//#region src/atoms.tsx
		/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
		* operator's DRY audit law: one seam, one small file, one wall). */
		function SourceRow(props) {
			const field = {
				name: props.name ?? "__source_row__",
				label: props.label,
				type: props.kind === "image" ? "image" : "file"
			};
			const { square, wireMenu } = useSquareProvider((0, react.useCallback)((name, v) => {
				props.onEdit(v);
			}, [props.onEdit]), {
				candidates: props.candidates ?? [],
				...props.candidatesFor !== void 0 ? { candidatesFor: props.candidatesFor } : {},
				...props.loadMedia !== void 0 ? { loadMedia: props.loadMedia } : {},
				...props.onFile !== void 0 ? { onFile: props.onFile } : {},
				...props.accept !== void 0 ? { accept: props.accept } : {},
				...props.renderSourcePick !== void 0 ? { renderSourcePick: props.renderSourcePick } : {}
			});
			const host = square(field);
			const shown = host.display ?? props.value ?? null;
			return (0, react.createElement)("div", {
				className: card_module_css_default.sourceRow,
				"data-source-row": props.label
			}, wireMenu, (0, react.createElement)(InputSquare, {
				label: props.hideLabel === true ? "" : props.label,
				...props.ariaLabel !== void 0 ? { ariaLabel: props.ariaLabel } : {},
				value: shown !== null && (isImageUrl(shown) || isMeshUrl(shown)) ? shown : null,
				metric: typeof props.value === "string" && props.value !== "" && !isImageUrl(props.value) && !isMeshUrl(props.value) ? props.value : void 0,
				...host.verbs
			}));
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
		function useLocalSliderValue(value) {
			const num = typeof value === "number" ? value : Number(value);
			const [local, setLocal] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				setLocal(null);
			}, [num]);
			return {
				value: local !== null ? local : Number.isFinite(num) ? num : null,
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
		*  value actually moves.
		*
		*  THE VARIANT-ENVELOPE CLAMP (the dragbar law, 2026-10-13): the
		*  track clamps to the ACTIVE variant's declared envelope (min and
		*  max intersected with the field's own bounds) — an
		*  out-of-envelope value cannot be dragged or saved from the form
		*  while the wire gate stays loud for API authors. A HELD value
		*  outside the envelope renders AS ITSELF, refused (the
		*  no-fallback law): the track never paints a clamped neighbor over
		*  an impossible contract. @param f the knob's field row.
		*  @param value the resolved display value.
		*  @param onEdit the settle seam.
		*  @param envelope the active variant's [min,max] for THIS knob,
		*  null when the variant declares none. */
		function SpecSliderAtom({ f, value, onEdit, envelope }) {
			const shown = useLocalSliderValue(value);
			if (shown.value === null) return (0, react.createElement)("span", {
				className: card_module_css_default.specSliderRow,
				"data-refused": f.name
			}, (0, react.createElement)("span", { className: card_module_css_default.specSliderValue }, String(value) + " — REFUSED: not a number"));
			const clamped = envelope !== void 0 && envelope !== null ? {
				min: Math.max(f.min ?? Number.NEGATIVE_INFINITY, envelope[0]),
				max: Math.min(f.max ?? Number.POSITIVE_INFINITY, envelope[1])
			} : null;
			if (clamped !== null && (clamped.min > clamped.max || shown.value < clamped.min || shown.value > clamped.max)) {
				const lo = clamped.min > clamped.max ? Math.min(clamped.min, clamped.max) : clamped.min;
				const hi = clamped.min > clamped.max ? Math.max(clamped.min, clamped.max) : clamped.max;
				return (0, react.createElement)("span", {
					className: card_module_css_default.specSliderRow,
					"data-refused": f.name
				}, (0, react.createElement)("span", { className: card_module_css_default.specSliderValue }, String(shown.value) + " — OUTSIDE the variant envelope [" + String(lo) + ", " + String(hi) + "]"));
			}
			return (0, react.createElement)("span", { className: card_module_css_default.specSliderRow }, (0, react.createElement)("input", {
				className: card_module_css_default.specSlider,
				type: "range",
				min: clamped !== null ? clamped.min : f.min ?? 0,
				max: clamped !== null ? clamped.max : f.max ?? 10,
				step: f.step ?? .1,
				value: shown.value,
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
		function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost, envelope }) {
			if ((f.type === "image" || f.type === "file" || f.type === "mesh") && square !== void 0) {
				const shown = square.display !== void 0 && square.display !== null && square.display !== "" ? square.display : typeof value === "string" ? value : null;
				return (0, react.createElement)(InputSquare, {
					label: f.label !== "" ? f.label : f.name,
					value: shown !== null && (isImageUrl(shown) || isMeshUrl(shown)) ? shown : null,
					metric: typeof value === "string" && value !== "" && !isImageUrl(value) && !isMeshUrl(value) ? value : void 0,
					...square.verbs
				});
			}
			if (f.type === "select" && f.multi === true && Array.isArray(f.options) && f.options.length > 0) {
				const rows = f.options.map((o) => typeof o === "string" ? {
					value: o,
					label: o
				} : o);
				const held = new Set(String(value ?? "").split(",").map((w) => w.trim()).filter((w) => w !== ""));
				return (0, react.createElement)("div", {
					className: card_module_css_default.specChips,
					role: "group",
					"aria-label": f.label,
					...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
				}, rows.map((row) => {
					const on = held.has(row.value);
					return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
						key: row.value,
						active: on,
						"aria-pressed": on,
						onClick: () => {
							const next = new Set(held);
							if (on) next.delete(row.value);
							else next.add(row.value);
							onEdit(f.name, rows.filter((r) => next.has(r.value)).map((r) => r.value).join(","));
						}
					}, titleCaseId(row.label));
				}));
			}
			if (f.type === "select" && Array.isArray(f.options) && f.options.length > 0) return (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				value: String(value ?? ""),
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label,
				...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
			}, ghost !== void 0 ? (0, react.createElement)("option", { value: "" }, ghost) : null, f.options.map((o) => {
				const row = typeof o === "string" ? {
					value: o,
					label: o
				} : o;
				return (0, react.createElement)("option", {
					key: row.value,
					value: row.value
				}, titleCaseId(row.label));
			}));
			if (f.type === "slider") return (0, react.createElement)(SpecSliderAtom, {
				f,
				value,
				onEdit,
				...envelope !== void 0 ? { envelope } : {}
			});
			if (f.type === "tri") return (0, react.createElement)(TriStateAtom, {
				label: f.label !== "" ? f.label : f.name,
				value: value === void 0 || value === null ? void 0 : value === true || value === "true",
				onEdit,
				name: f.name
			});
			if (f.type === "switch" || f.type === "boolean") {
				if (value !== void 0 && value !== null && typeof value !== "boolean" && value !== "true" && value !== "false") return (0, react.createElement)("span", {
					className: card_module_css_default.specField,
					"data-refused": f.name
				}, f.label + ": " + String(value) + " — REFUSED: not a boolean");
				const on = value === true || value === "true";
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
					label: f.label,
					checked: on,
					onChange: (next) => {
						onEdit(f.name, next);
					}
				});
			}
			if (f.type === "textarea") {
				const fitStable = (0, react.useCallback)((el) => {
					if (el === null) return;
					el.style.height = "auto";
					el.style.height = Math.max(el.scrollHeight, 44) + "px";
				}, []);
				const fitEl = (0, react.useRef)(null);
				(0, react.useEffect)(() => {
					const el = fitEl.current;
					el.style.height = "auto";
					el.style.height = Math.max(el.scrollHeight, 44) + "px";
				}, [String(value ?? "")]);
				return (0, react.createElement)("textarea", {
					className: card_module_css_default.specTextarea,
					rows: 2,
					value: String(value ?? ""),
					placeholder: f.placeholder ?? "",
					ref: (el) => {
						const ta = el ?? null;
						fitEl.current = ta;
						fitStable(ta);
					},
					onChange: (e) => {
						const el = e.target;
						fitStable(el);
						onEdit(f.name, el.value);
					},
					"aria-label": f.label
				});
			}
			if (f.type === "number") return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				type: "number",
				min: f.min,
				max: f.max,
				step: f.step,
				value: String(value ?? ""),
				placeholder: placeholder ?? f.placeholder ?? "",
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label,
				...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
			});
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: String(value ?? ""),
				placeholder: placeholder ?? f.placeholder ?? "",
				onChange: (e) => onEdit(f.name, e.target.value),
				"aria-label": f.label,
				...f.tooltip !== void 0 && f.tooltip !== "" ? { title: f.tooltip } : {}
			});
		}
		/** THE MODEL AXES (the pass-along law, 2026-09-12): the Model select
		*  plus ONE SELECT PER SERVED AXIS GROUP — Variant, Quant, Recipe,
		*  Precision, … the declaration's whole vocabulary, NEVER a hardcoded
		*  list (the operator's lane proof caught the hardcoded Quant-only
		*  list dropping seedvr2's and qwen's other axes). Order: the door's
		*  variant_groups contract, else first-seen. Chain: an axis' options
		*  are the rows composing with the axes above (the row's `owner`).
		*  Each pick applies the row's defaults overlay through onEdit — the
		*  values (model + every axis key + overlay keys) ride the caller's
		*  map and pass along at Run. Renders nothing when the spec declares
		*  no matrix. */
		//#endregion
		//#region src/rows.tsx
		/** rows.tsx — extracted from form.tsx (hour 15, the godfile split; the
		* operator's DRY audit law: one seam, one small file, one wall). */
		/** THE INFO GLYPH (hour 21): the field's declared help prose (the
		*  schema's extra.tooltip) rides a hover (i) beside the label — one
		*  definition for every card; absent prose, no glyph. The text is
		*  aria-carried (the DSH Tooltip is hover-only). */
		function infoGlyph(f) {
			if (f.tooltip === void 0 || f.tooltip === "") return null;
			return (0, react.createElement)(Tip, {
				tip: f.tooltip,
				children: (0, react.createElement)("span", {
					className: card_module_css_default.specInfo,
					role: "note",
					"aria-label": `info: ${f.tooltip}`
				}, "i")
			});
		}
		/** THE SEED DICE (stroke 39 — the operator's QOL law): the seed
		*  knob carries the RANDOM sentinel -1 (GATE S: -1 mints a fresh
		*  seed in the lane, EVERY run). The dice sits at the key line's
		*  right end, across from the field's name: FILLED pips = random
		*  (a new seed every run), HOLLOW pips = fixed (this exact seed
		*  re-runs). The state DERIVES from the resolved value alone — no
		*  hidden mode to drift; the click writes the value: fixed → -1
		*  (random), random → a minted concrete int (the kit's own mint
		*  law, Math.floor(random * 2147483647)). Typing a number while
		*  random fixes it — the dice unfills by derivation, one source
		*  of truth. The input never paints the sentinel: random shows
		*  the placeholder, never "-1". */
		function SeedDice({ random, onToggle }) {
			return (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.specDice + (random ? " " + card_module_css_default.specDiceOn : ""),
				"data-seed-dice": random ? "random" : "fixed",
				"aria-pressed": random,
				"aria-label": "seed dice",
				title: random ? "Random — a new seed every run. Click to fix one." : "Fixed seed — this exact seed re-runs. Click for a new one every run.",
				onClick: onToggle
			}, (0, react.createElement)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true"
			}, (0, react.createElement)("rect", {
				x: 1.4,
				y: 1.4,
				width: 13.2,
				height: 13.2,
				rx: 3.2,
				stroke: "currentColor",
				strokeWidth: 1.3
			}), (0, react.createElement)("circle", {
				cx: 5,
				cy: 5,
				r: 1.35,
				...random ? { fill: "currentColor" } : {
					stroke: "currentColor",
					strokeWidth: 1
				}
			}), (0, react.createElement)("circle", {
				cx: 11,
				cy: 5,
				r: 1.35,
				...random ? { fill: "currentColor" } : {
					stroke: "currentColor",
					strokeWidth: 1
				}
			}), (0, react.createElement)("circle", {
				cx: 8,
				cy: 8,
				r: 1.35,
				...random ? { fill: "currentColor" } : {
					stroke: "currentColor",
					strokeWidth: 1
				}
			}), (0, react.createElement)("circle", {
				cx: 5,
				cy: 11,
				r: 1.35,
				...random ? { fill: "currentColor" } : {
					stroke: "currentColor",
					strokeWidth: 1
				}
			}), (0, react.createElement)("circle", {
				cx: 11,
				cy: 11,
				r: 1.35,
				...random ? { fill: "currentColor" } : {
					stroke: "currentColor",
					strokeWidth: 1
				}
			})));
		}
		function SpecFieldRow({ f, value, onEdit, square, wireCandidates, envelope }) {
			const seedKnob = f.name === "seed";
			const seedRandom = seedKnob && (value === -1 || value === "-1");
			return (0, react.createElement)("div", { className: card_module_css_default.specField }, seedKnob ? (0, react.createElement)("div", { className: card_module_css_default.specFieldHead }, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null, infoGlyph(f)), (0, react.createElement)(SeedDice, {
				random: seedRandom,
				onToggle: () => {
					if (seedRandom) onEdit(f.name, Math.floor(Math.random() * 2147483647));
					else onEdit(f.name, -1);
				}
			})) : (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null, infoGlyph(f)), (0, react.createElement)(SpecAtom, {
				f,
				value: seedRandom ? void 0 : value,
				...seedRandom ? { placeholder: "random — new every run" } : {},
				...envelope !== void 0 ? { envelope } : {},
				onEdit,
				square,
				...wireCandidates !== void 0 ? { wireCandidates } : {}
			}));
		}
		/** ── THE OVERRIDE PARAMETER LAYER (hour 22 — the operator's law) ──
		*
		* OverlayKnob: ONE generic primitive for every LAYERED parameter
		* face — a sparse overlay over a base over the schema floor (h3's
		* call knobs over run stamps; any card's stages over a flow, its
		* variants over a base). It renders ONE field's control with THE
		* UNSET-FACE LAW (composeUnset, the generic surface): an unset
		* value shows EXACTLY what composes — the base layer's explicit
		* stamp, else the schema's own declared default (the admission gate
		* fills it), else 'inherit' (honest only when no schema truth
		* exists). REPLACE semantics at the write: unset edits serialize
		* ABSENT (undefined, never a sentinel).
		*
		* The field rides the SERVED envelope's walk (SpecField — the same
		* schemastery serialization every other face consumes): type, label,
		* options, default, min/max/step, tooltip — all the schema's truth,
		* never a per-card projection. Cards own only WHAT layers exist and
		* which keys ride them; this row owns the semantics, once. */
		function OverlayKnob({ name, field, value, base, ariaLabel, onEdit }) {
			const label = field?.label ?? name;
			const face = composeUnset(base, field?.default);
			const tip = unsetFaceTip(face, field?.type === "boolean" ? (v) => v === "true" ? "on" : v === "false" ? "off" : v : void 0);
			const aria = ariaLabel ?? label;
			const boolLabel = (v) => v === "true" ? "on" : v === "false" ? "off" : v;
			if (field?.type === "boolean") return (0, react.createElement)(ControlRow, {
				label,
				density: "sm",
				children: (0, react.createElement)(SpecAtom, {
					f: {
						name,
						label: aria,
						type: "select",
						options: [{
							value: "true",
							label: "on"
						}, {
							value: "false",
							label: "off"
						}],
						tooltip: tip
					},
					ghost: face.composed === void 0 ? "inherit" : boolLabel(unsetFaceLabel(face)),
					value: value === true ? "true" : value === false ? "false" : void 0,
					onEdit: (_, v) => onEdit(v === void 0 || v === "" ? void 0 : v === "true")
				})
			});
			if (Array.isArray(field?.options) && field.options.length > 0) {
				const f = {
					name,
					label: aria,
					type: "select",
					options: field.options,
					tooltip: tip
				};
				return (0, react.createElement)(ControlRow, {
					label,
					density: "sm",
					children: (0, react.createElement)(SpecAtom, {
						f,
						ghost: unsetFaceLabel(face),
						value: typeof value === "string" ? value : typeof value === "number" ? String(value) : void 0,
						onEdit: (_, v) => onEdit(v === "" ? void 0 : v)
					})
				});
			}
			if (field?.type === "number" || field?.type === "integer") {
				const f = {
					name,
					label: aria,
					type: "number",
					step: field.step ?? (field.type === "integer" ? 1 : .1),
					...field.min !== void 0 ? { min: field.min } : {},
					...field.max !== void 0 ? { max: field.max } : {},
					tooltip: tip
				};
				return (0, react.createElement)(ControlRow, {
					label,
					density: "sm",
					children: (0, react.createElement)(SpecAtom, {
						f,
						value: typeof value === "number" ? value : void 0,
						placeholder: face.composed === void 0 ? "inherit" : face.composed,
						onEdit: (_, v) => {
							if (typeof v !== "string" || v.trim() === "") {
								onEdit(void 0);
								return;
							}
							const n = Number(v);
							onEdit(Number.isFinite(n) ? n : void 0);
						}
					})
				});
			}
			return (0, react.createElement)(ControlRow, {
				label,
				density: "sm",
				children: (0, react.createElement)(SpecAtom, {
					f: {
						name,
						label: aria,
						type: "text",
						tooltip: tip
					},
					value: typeof value === "string" ? value : void 0,
					placeholder: face.composed === void 0 ? "inherit" : face.composed,
					onEdit: (_, v) => {
						const t = typeof v === "string" ? v.trim() : "";
						onEdit(t === "" ? void 0 : t);
					}
				})
			});
		}
		//#endregion
		//#region src/axes.tsx
		/** axes.tsx — extracted from form.tsx (hour 15, the godfile split; the
		* operator's DRY audit law: one seam, one small file, one wall). */
		/** THE PACK PROMPT (the no-silent-drop law's extension half,
		*  stroke 18): the card's DECLARED extension packs that the engine
		*  cannot see render AS THEMSELVES — marked missing, with the
		*  install verb one click away (the manage door's install_extension;
		*  the host owns the wire). Present and unknown packs render nothing
		*  (nothing to act on; the spec carries their truth for anyone who
		*  reads it). Never a silently absent pack: the run's refusal text
		*  and this prompt name the same id. */
		function PackPrompt({ spec, onInstallPack }) {
			const missing = (spec.packs ?? []).filter((p) => p.present === false);
			if (missing.length === 0 || onInstallPack === void 0) return null;
			return (0, react.createElement)("section", {
				className: `${card_module_css_default.specGroup} ${card_module_css_default.modelAxes}`,
				"data-pack-prompt": "1"
			}, (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, "Extensions"), missing.map((p) => (0, react.createElement)(PackPromptRow, {
				key: p.id,
				id: p.id,
				onInstallPack
			})));
		}
		function PackPromptRow({ id, onInstallPack }) {
			const [st, setSt] = (0, react.useState)("idle");
			return (0, react.createElement)("div", {
				className: card_module_css_default.specHint,
				"data-missing-pack": id
			}, id + " is required by this card but not installed on the engine.", " ", (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.specLinkBtn,
				disabled: st !== "idle",
				onClick: () => {
					setSt("busy");
					onInstallPack(id).then((ok) => setSt(ok ? "queued" : "failed")).catch(() => setSt("failed"));
				}
			}, st === "idle" ? "Install " + id : st === "busy" ? "Requesting…" : st === "queued" ? "Install queued ✓ (restart the engine when it lands)" : "Install request failed — retry from the assets tab"));
		}
		function ModelAxes({ spec, value, onSet, onPick, onDownloadModel }) {
			const groups = axisGroups(spec);
			if (groups.length === 0 && (spec.families ?? []).length === 0) return null;
			const models = modelChoices(spec);
			const matrixSet = new Set(models);
			const familyRows = (spec.families ?? []).map((f) => ({
				...f,
				inMatrix: matrixSet.has(f.id)
			}));
			const familyFace = /* @__PURE__ */ new Map();
			for (const f of spec.families ?? []) if (f.label !== void 0 && f.label !== "") familyFace.set(f.id, f.label);
			const contract = spec.features?.variant_groups ?? {};
			const pick = (row) => {
				onPick(axisPickPatch(spec, row));
			};
			const knobStamp = (r) => axisPickPatch(spec, r);
			rowsFor(spec, "Recipe").filter((r) => Object.keys(knobStamp(r)).length > 0);
			const heldModelRaw = value["model"];
			const heldModel = typeof heldModelRaw === "string" && heldModelRaw !== "" ? heldModelRaw : void 0;
			const knownModel = (m) => models.includes(m) || (spec.families ?? []).some((f) => f.id === m);
			const refusedModel = heldModel !== void 0 && !knownModel(heldModel) ? heldModel : void 0;
			const shownModel = heldModel ?? (typeof spec.model === "string" && spec.model !== "" ? spec.model : models[0] ?? "");
			const heldFam = (spec.families ?? []).find((f) => f.id === shownModel && !f.present);
			const [dlState, setDlState] = (0, react.useState)("idle");
			(0, react.useEffect)(() => {
				setDlState("idle");
			}, [shownModel]);
			const rowsOf = (g, active) => composingRows(spec, g, active);
			const active = {};
			for (const g of groups) {
				const heldRaw = value[axisKey(g)];
				const heldId = typeof heldRaw === "string" && heldRaw !== "" ? heldRaw : void 0;
				const rows = rowsOf(g, active);
				if (heldId !== void 0 && rows.some((r) => r.id === heldId || (r.quant ?? "") === heldId)) {
					const grounded = rows.find((r) => r.quant === heldId && r.id !== heldId);
					active[g] = grounded !== void 0 ? grounded.id : heldId;
				} else if (heldId !== void 0) active[g] = heldId;
				else active[g] = activeRowId(spec, value, g, active) ?? (rows.length > 0 ? rows[0].id : "");
			}
			const modelField = (0, react.createElement)("label", { className: card_module_css_default.specField }, (0, react.createElement)("span", {
				className: card_module_css_default.specFieldKey,
				"aria-hidden": "true"
			}), (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				"aria-label": "Model",
				...refusedModel !== void 0 ? { "data-refused": "model" } : {},
				value: shownModel,
				onChange: (e) => {
					const m = e.target.value;
					onPick(modelSwitchPatch(spec, m));
				}
			}, refusedModel !== void 0 ? (0, react.createElement)("option", {
				key: refusedModel,
				value: refusedModel
			}, titleCaseId(refusedModel) + " — not an offered model of this card") : null, familyRows.map((f) => f.inMatrix ? null : (0, react.createElement)("option", {
				key: "fam-" + f.id,
				value: f.id
			}, (f.label ?? titleCaseId(f.id)) + (f.present ? "" : " — not downloaded on this machine"))), models.map((m) => (0, react.createElement)("option", {
				key: m,
				value: m
			}, familyFace.get(m) ?? titleCaseId(m)))));
			const axisField = (g) => {
				const rows = rowsOf(g, active);
				const heldRaw = value[axisKey(g)];
				const heldId = typeof heldRaw === "string" && heldRaw !== "" ? heldRaw : void 0;
				const refusedId = heldId !== void 0 && !rows.some((r) => r.id === heldId || (r.quant ?? "") === heldId) ? heldId : void 0;
				if (rows.length === 0 && refusedId === void 0) return null;
				const label = contract[g]?.label ?? titleCaseId(g);
				return (0, react.createElement)("label", {
					key: g,
					className: card_module_css_default.specField
				}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, label), (0, react.createElement)("select", {
					className: card_module_css_default.specSelect,
					"aria-label": label,
					"data-axis": g,
					...refusedId !== void 0 ? { "data-refused": g } : {},
					value: active[g],
					onChange: (e) => {
						const id = e.target.value;
						const row = rows.find((v) => v.id === id);
						if (row !== void 0) pick(row);
					}
				}, refusedId !== void 0 ? (0, react.createElement)("option", {
					key: refusedId,
					value: refusedId
				}, titleCaseId(refusedId) + " — invalid " + label.toLowerCase() + " for " + titleCaseId(heldModel ?? shownModel)) : null, rows.map((v) => (0, react.createElement)("option", {
					key: v.id,
					value: v.id
				}, titleCaseId(v.label) + (typeof v.hint === "string" && v.hint !== "" ? ` — ${v.hint}` : "")))));
			};
			const variantAxis = groups.includes("Variant") ? "Variant" : void 0;
			const variantField = variantAxis !== void 0 ? axisField(variantAxis) : null;
			const restGroups = variantAxis !== void 0 ? groups.filter((g) => g !== variantAxis) : groups;
			return (0, react.createElement)("section", {
				className: `${card_module_css_default.specGroup} ${card_module_css_default.modelAxes}`,
				"data-model-axes": "1"
			}, (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, "Model"), variantField !== null ? (0, react.createElement)("div", {
				className: card_module_css_default.axesPair,
				"data-axes-pair": "Model+Variant"
			}, modelField, variantField) : modelField, heldFam !== void 0 && onDownloadModel !== void 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.specHint,
				"data-download-prompt": heldFam.id
			}, titleCaseId(heldFam.id) + " is offered by this card but not downloaded on this machine.", " ", (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.specLinkBtn,
				disabled: dlState !== "idle",
				onClick: () => {
					setDlState("busy");
					onDownloadModel(heldFam.id).then((ok) => setDlState(ok ? "queued" : "failed")).catch(() => setDlState("failed"));
				}
			}, dlState === "idle" ? "Download " + (heldFam.label ?? titleCaseId(heldFam.id)) : dlState === "busy" ? "Requesting…" : dlState === "queued" ? "Download queued ✓ (run when it lands)" : "Download request failed — retry from the assets tab")) : null, restGroups.map((g) => axisField(g)), (0, react.createElement)(RecipePills, {
				spec,
				onPick,
				values: value
			}));
		}
		/** THE FAMILY RECIPE DROPDOWN (Rule A -- the recipe law; the
		* operator's order, 2026-09-18: "RECIPES AREN'T EVEN A DROPDOWN"):
		* the family's preset macros as ONE SELECT beside the axes -- the
		* same shape every axis rides, never a list of link-buttons. The
		* pick writes the row's FULL stamp (axisPickPatch -- mod-owned keys
		* included, the Rule A amendment); the SELECTION derives from the
		* ONE truth (activeRecipeId -- the row whose stamp the user layer
		* holds; no recipe key persists, nothing goes stale when the rail
		* moves). Stamp-less rows (the family `default`) render nothing: a
		* row that writes nothing is a dead option. A hand-edited layer
		* (no stamp-for-stamp match) shows the placeholder -- the form
		* never lies that a recipe is active.
		*
		* THE REUSE LAW: extracted so EVERY model surface seats the same
		* dropdown -- CardForm under the axes, a studio beside its model
		* route. Never a second implementation. */
		function RecipePills({ spec, onPick, values }) {
			const pillRows = rowsFor(spec, "Recipe").filter((r) => Object.keys(axisPickPatch(spec, r)).length > 0);
			if (pillRows.length === 0) return null;
			const active = values !== void 0 ? activeRecipeId(spec, values) : void 0;
			const pick = (id) => {
				const row = pillRows.find((r) => r.id === id);
				if (row === void 0) return;
				onPick(axisPickPatch(spec, row));
			};
			return (0, react.createElement)("label", { className: card_module_css_default.specField }, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, "Recipe"), (0, react.createElement)("select", {
				className: card_module_css_default.specSelect,
				"data-recipe-select": "1",
				"aria-label": "Recipe",
				value: active ?? "",
				onChange: (e) => {
					const id = e.currentTarget.value;
					if (id !== "") pick(id);
				}
			}, (0, react.createElement)("option", {
				key: "__none__",
				value: "",
				disabled: active !== void 0
			}, active === void 0 ? "-- recipe --" : "-- custom --"), pillRows.map((r) => (0, react.createElement)("option", {
				key: r.id,
				value: r.id,
				title: typeof r.hint === "string" && r.hint !== "" ? r.hint : void 0
			}, titleCaseId(r.label) + (typeof r.hint === "string" && r.hint !== "" ? ` \u2014 ${r.hint}` : "")))));
		}
		/** THE CARD FORM (the constructor's surface half) — the emission's
		*  fields walked off the schema envelope, grouped, visible-when
		*  honored; the RESOLVED value derives per render (resolveValue —
		*  the engine's compose cascade mirrored), edits are set/unset ops
		*  over the USER layer (the settings law: presence IS the override
		*  mark, the reset chip removes it). Each field renders through the
		*  claimed atom for its emitted type when the caller passes one;
		*  the base's built-in atom is the default.
		*
		*  THE CONSTRUCTION LAW IS NOT OPTIONAL (operator, 2026-09-12: "the
		*  img-to-mesh input component — you are not using it around — you
		*  are hardcoding"): an emitted image/file/mesh input constructs THE ONE
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
		//#endregion
		//#region src/use-form-spec.ts
		/** use-form-spec.ts — extracted from form.tsx (hour 15, the godfile split; the
		* operator's DRY audit law: one seam, one small file, one wall). */
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
					setError(rejectionVoice(e));
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
		//#endregion
		//#region src/spec-panel.tsx
		/** spec-panel.tsx — extracted from form.tsx (hour 15, the godfile split; the
		* operator's DRY audit law: one seam, one small file, one wall). */
		/** THE DYNAMIC PARAMETER PANEL (2026-09-17, the operator's shared-
		* component law): sections of the SERVED form-spec's rows at their
		* wire names — ONE mechanism every card seats, never a per-card
		* re-walk. The card owns POLICY through the DECLARATION (which
		* fields exist, their visible_when leaves); the base owns MECHANISM
		* (fetch → walker → row atoms → visibility grammar → the error
		* law). A row the door never declared renders NOTHING (no ghost,
		* no twin); a refused spec renders AS an error — never a thinner
		* panel. */
		function SpecPanel({ model, sections, values, onEdit, spec: specProp, error: errorProp }) {
			const owned = useFormSpec(model);
			const spec = specProp !== void 0 ? specProp : owned.spec;
			const error = specProp !== void 0 ? errorProp ?? null : owned.error;
			if (error !== null) return (0, react.createElement)("div", {
				className: card_module_css_default.specGroup,
				role: "alert",
				"data-testid": "spec-panel-error"
			}, (0, react.createElement)("div", { className: card_module_css_default.specGroupTitle }, "form-spec failed — parameters unavailable"), (0, react.createElement)("div", { className: card_module_css_default.specHint }, error));
			if (spec === null) return null;
			const byName = new Map(fieldsOf(spec).map((f) => [f.name, f]));
			const guardModel = resolveFamilyKey(spec) ?? model;
			return (0, react.createElement)("div", { className: card_module_css_default.specForm }, sections.map((sec) => (0, react.createElement)("div", {
				className: card_module_css_default.specGroup,
				key: sec.title,
				...sec.testid !== void 0 ? { "data-testid": sec.testid } : {}
			}, (0, react.createElement)("div", { className: card_module_css_default.specGroupTitle }, sec.title), sec.rows.map((row) => {
				const f = byName.get(row.name);
				if (f === void 0) return null;
				if (!fieldVisible(f, {
					...values,
					model: guardModel
				})) return null;
				return (0, react.createElement)(SpecFieldRow, {
					key: row.name,
					f,
					value: values[row.name],
					onEdit
				});
			}))));
		}
		//#endregion
		//#region src/form.tsx
		/**
		* form.tsx — @melite/card-base: THE CONSTRUCTOR (the godfile
		* split, hour 15: the seams live in their own files now —
		* use-form-spec.ts, square-provider.tsx, atoms.tsx, rows.tsx,
		* spec-panel.tsx, axes.tsx — this file is the CardForm
		* composition + the stable re-export surface).
		*
		* THE CONSTRUCTION LAW (operator order, 2026-09-12: "The package to
		* construct the card ui should see that the card package emits an
		* image input, then constructs the input component automatically"):
		* the base reads the card package's EMISSION — the served form-spec
		* (the schema envelope, declared input/output edges, mod kinds) —
		* and constructs the surface. The resolved value derives per render
		* (resolveValue — the engine's compose cascade mirrored); every
		* image/file/mesh field gets THE ONE square (square.tsx) with the
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
		/** THE CARD FORM (the constructor's surface half) — the emission's
		*  fields walked off the schema envelope, grouped, visible-when
		*  honored; the RESOLVED value derives per render (resolveValue —
		*  the engine's compose cascade mirrored), edits are set/unset ops
		*  over the USER layer (the settings law: presence IS the override
		*  mark, the reset chip removes it). The constructor OWNS the square
		*  provider (no call site wires it, no call site can forget it). */
		function CardForm({ spec, user, base, onSet, onPick, onUnset, wire, square, atoms, onPatch, onDownloadModel, onInstallPack, paintFace, bboxFace, paintReference }) {
			const fields = fieldsOf(spec);
			const value = resolveValue(spec, user, base);
			const fieldByName = new Map(fields.map((f) => [f.name, f]));
			const edit = (name, v) => {
				if (v === void 0) {
					onUnset?.(name);
					return;
				}
				onSet(name, coerceFieldEdit(fieldByName.get(name), v));
			};
			const family = resolveFamilyKey(spec);
			const modKinds = (spec.features?.modifiers ?? []).map((k) => {
				const env = spec.mod_schemas?.[k.schema_key ?? k.param_key];
				const hybrid = k.entry === "hybrid";
				const declared = (rows) => rows?.map((f) => typeof f.wtype === "string" && f.wtype !== "" ? {
					...f,
					type: f.wtype
				} : f);
				return {
					...k,
					fields: hybrid ? entryFieldsOfEnvelope(env, k.param_key, family) : declared(k.fields) ?? fieldsOfEnvelope(env, family),
					kindFields: hybrid ? kindScalarFieldsOfEnvelope(env, k.param_key, family) : declared(k.kindFields) ?? []
				};
			});
			const owned = modOwnedFields(spec);
			const flatFields = owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields;
			const signature = Array.isArray(spec.inputs) ? spec.inputs : [];
			const modFieldByName = /* @__PURE__ */ new Map();
			for (const k of modKinds) for (const f of k.fields) if (!modFieldByName.has(f.name)) modFieldByName.set(f.name, f);
			const railOf = (inp) => {
				const f = flatFields.find((x) => x.name === inp.name);
				if (f === void 0) return void 0;
				if (f.type === "image" || f.type === "file" || f.type === "mesh") return f;
			};
			const railFields = signature.map((inp) => typeof inp?.name === "string" ? railOf(inp) : void 0).filter((f) => f !== void 0).filter((f) => fieldVisible(f, {
				...value,
				model: family ?? ""
			})).filter((f) => fieldOnLane(spec, f.name, {
				...value,
				model: family ?? ""
			}));
			const railNames = new Set(railFields.map((f) => f.name));
			const stackFields = flatFields.filter((f) => f.type === "image_list" && !modFieldByName.has(f.name)).filter((f) => fieldVisible(f, {
				...value,
				model: family ?? ""
			})).filter((f) => fieldOnLane(spec, f.name, {
				...value,
				model: family ?? ""
			}));
			const visible = (f) => f.type !== "image_list" && !railNames.has(f.name) && fieldOnLane(spec, f.name, {
				...value,
				model: family ?? ""
			});
			const groupFieldsAll = flatFields.filter(visible);
			const laneWarns = laneViolations(spec, flatFields, {
				...user,
				model: family ?? ""
			}, base).filter((v) => !isUnstatedRequiredVoice(v.message));
			const gateViolations = composeValidate(spec, user);
			const variantEnvelope = offeredVariantOf(spec.variants ?? [], value)?.sampler_envelope ?? null;
			const knobEnvelope = (f) => {
				if (f.name !== "steps" && f.name !== "cfg") return {};
				const bound = variantEnvelope?.[f.name];
				return { envelope: bound !== void 0 && bound.length === 2 ? [bound[0], bound[1]] : null };
			};
			const groups = groupFields(groupFieldsAll, {
				...value,
				model: family ?? ""
			});
			const submenu = groups.length > 1;
			const [openGroup, setOpenGroup] = (0, react.useState)(void 0);
			const activeGroup = submenu ? groups.find((g) => g.group === openGroup) ?? groups[0] : void 0;
			const shownGroups = submenu && activeGroup !== void 0 ? [activeGroup] : groups;
			const atomOf = (f) => atoms?.[f.type];
			const own = useSquareProvider(edit, wire ?? { candidates: [] });
			const squareFor = square ?? own.square;
			const stackRow = (f) => {
				const v = value[f.name];
				const entries = Array.isArray(v) ? v.filter((x) => typeof x === "string" && x !== "") : [];
				const cap = typeof f.max_stack === "number" && f.max_stack > 0 ? f.max_stack : void 0;
				const over = cap !== void 0 && entries.length > cap;
				const kind = f.media === "video" || f.media === "audio" || f.media === "mod" ? "file" : "image";
				const accept = f.media === "video" ? "video/*" : f.media === "audio" ? "audio/*" : f.media === "mod" ? ".safetensors" : void 0;
				return (0, react.createElement)("div", {
					key: "stack-" + f.name,
					className: card_module_css_default.specStack,
					"data-input-stack": f.name,
					"data-stack-count": String(entries.length),
					...over ? { "data-stack-over": String(cap) } : {}
				}, (0, react.createElement)("div", {
					className: card_module_css_default.modHead,
					"data-stack-head": f.name,
					title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
				}, (0, react.createElement)("span", { className: card_module_css_default.modTitle }, f.label), (0, react.createElement)("span", {
					className: card_module_css_default.modHint,
					...over ? { style: { color: "var(--dsh-danger, #f44)" } } : {}
				}, `${String(entries.length)}${cap !== void 0 ? " / " + String(cap) : ""}${f.media !== void 0 && f.media !== "" ? " · " + f.media : ""}`)), over ? (0, react.createElement)("p", {
					className: card_module_css_default.laneWarn,
					style: { margin: 0 }
				}, `'${f.name}': ${String(entries.length)} stated, this lane admits ${String(cap)} — remove ${String(entries.length - cap)} before the write (the capacity follows the boarded model)`) : null, (0, react.createElement)("div", { className: card_module_css_default.specSlotRow }, entries.map((entry, i) => (0, react.createElement)("div", {
					key: f.name + ":" + String(i),
					className: card_module_css_default.specSlotCell,
					title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
				}, (0, react.createElement)(SourceRow, {
					label: String(i + 1),
					ariaLabel: `${f.label} ${String(i + 1)}`,
					kind,
					value: entry,
					name: f.name,
					...accept !== void 0 ? { accept } : {},
					onEdit: (next) => {
						const arr = [...entries];
						if (next === "") arr.splice(i, 1);
						else arr[i] = next;
						edit(f.name, arr);
					},
					...wire?.loadMedia !== void 0 ? { loadMedia: wire.loadMedia } : {},
					...wire?.candidates !== void 0 ? { candidates: wire.candidates } : {},
					...wire?.candidatesFor !== void 0 ? { candidatesFor: wire.candidatesFor } : {}
				}))), cap === void 0 || entries.length < cap ? (0, react.createElement)("div", {
					className: card_module_css_default.specSlotCell,
					"data-stack-add": f.name,
					title: f.tooltip
				}, (0, react.createElement)(SourceRow, {
					label: "",
					ariaLabel: `Add ${f.label}`,
					kind,
					value: null,
					name: f.name,
					...accept !== void 0 ? { accept } : {},
					onEdit: (next) => {
						/* v8 ignore else -- the empty cell carries no clear verb (the square renders no Detach without an attached value, and the provider wires onClear for attached values only) — '' is unconstructible through the seam, so the else is the type fence, never a UI path */
						if (next !== "") edit(f.name, [...entries, next]);
					},
					...wire?.loadMedia !== void 0 ? { loadMedia: wire.loadMedia } : {},
					...wire?.candidates !== void 0 ? { candidates: wire.candidates } : {},
					...wire?.candidatesFor !== void 0 ? { candidatesFor: wire.candidatesFor } : {}
				})) : null));
			};
			return (0, react.createElement)("div", { className: card_module_css_default.specForm }, gateViolations.length > 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.laneWarn,
				"data-compose-gate": String(gateViolations.length),
				role: "alert"
			}, (0, react.createElement)("p", { style: { fontWeight: 700 } }, "THE COMPOSE GATE REFUSED THIS DOC — the card will not render an impossible contract. Fix the stated value, or reset the row."), gateViolations.map((v, i) => (0, react.createElement)("p", { key: "gate-" + String(i) }, v.message))) : null, laneWarns.length > 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.laneWarn,
				"data-lane-warn": String(laneWarns.length),
				role: "alert"
			}, laneWarns.map((v, i) => (0, react.createElement)("p", { key: "lane-" + String(i) }, v.message))) : null, (0, react.createElement)(PackPrompt, {
				spec,
				onInstallPack
			}), (0, react.createElement)(ModelAxes, {
				spec,
				value,
				onSet: edit,
				onPick,
				onDownloadModel
			}), railFields.length > 0 || stackFields.length > 0 ? (0, react.createElement)("section", {
				className: card_module_css_default.specGroup + " " + card_module_css_default.inputRail,
				"data-input-rail": "1"
			}, (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, "Inputs"), railFields.length > 0 ? (0, react.createElement)("div", { className: card_module_css_default.specSlotRow }, railFields.map((f) => {
				return (0, react.createElement)("div", {
					key: f.name,
					className: card_module_css_default.specSlotCell,
					title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
				}, (0, react.createElement)(SpecAtom, {
					f,
					value: value[f.name],
					onEdit: edit,
					square: squareFor(f),
					...wire?.candidates !== void 0 ? { wireCandidates: wire.candidates } : {}
				}));
			})) : null, stackFields.map((f) => stackRow(f))) : null, submenu && activeGroup !== void 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.groupTabs,
				role: "tablist",
				"data-form-submenu": "1"
			}, groups.map((g) => {
				const selected = activeGroup.group === g.group;
				return (0, react.createElement)("button", {
					key: g.group ?? "__general__",
					type: "button",
					role: "tab",
					"aria-selected": selected ? "true" : "false",
					"data-form-group-tab": g.group ?? "general",
					className: card_module_css_default.groupTab + (selected ? " " + card_module_css_default.groupTabActive : ""),
					onClick: () => {
						setOpenGroup(g.group);
					}
				}, titleCaseId(g.group ?? "General"));
			})) : null, shownGroups.map((g) => {
				const declared = g.fields.find((f) => typeof f.columns === "number" && f.columns >= 1)?.columns;
				const gridCols = Math.max(1, Math.floor(declared ?? 2));
				const cellStyle = (f) => {
					if (f.type === "textarea") return {
						gridColumn: "1 / -1",
						minWidth: "0"
					};
					return {
						gridColumn: `span ${Math.max(1, Math.floor(f.width ?? 1))}`,
						minWidth: "0"
					};
				};
				const children = [];
				let row = [];
				const flush = () => {
					if (row.length === 0) return;
					children.push((0, react.createElement)("div", {
						key: "slotrow-" + String(children.length),
						className: card_module_css_default.specSlotRow,
						style: {
							gridColumn: "1 / -1",
							minWidth: "0"
						}
					}, row));
					row = [];
				};
				for (const f of g.fields) {
					const claim = atomOf(f);
					const sq = squareFor(f);
					const wireCandidates = wire?.candidates;
					if (claim !== void 0) {
						flush();
						const cell = (0, react.createElement)("div", {
							key: f.name,
							className: card_module_css_default.specField
						}, (0, react.createElement)("span", { className: card_module_css_default.specFieldKey }, f.label, f.required === true ? (0, react.createElement)("span", { className: card_module_css_default.specRequired }, " *") : null, infoGlyph(f)), claim({
							f,
							value: value[f.name],
							onEdit: edit,
							square: sq
						}));
						children.push((0, react.createElement)("div", {
							key: f.name + "-cell",
							style: cellStyle(f)
						}, cell));
						continue;
					}
					if (f.type === "image" || f.type === "file" || f.type === "mesh") {
						row.push((0, react.createElement)("div", {
							key: f.name,
							className: card_module_css_default.specSlotCell,
							title: f.tooltip !== void 0 && f.tooltip !== "" ? f.tooltip : void 0
						}, (0, react.createElement)(SpecAtom, {
							f,
							value: value[f.name],
							onEdit: edit,
							square: sq,
							...wireCandidates !== void 0 ? { wireCandidates } : {}
						})));
						continue;
					}
					flush();
					const cell = (0, react.createElement)(SpecFieldRow, {
						key: f.name,
						f,
						value: value[f.name],
						onEdit: edit,
						...knobEnvelope(f),
						...sq !== void 0 ? { square: sq } : {},
						...wireCandidates !== void 0 ? { wireCandidates } : {}
					});
					children.push((0, react.createElement)("div", {
						key: f.name + "-cell",
						style: cellStyle(f)
					}, cell));
				}
				flush();
				return (0, react.createElement)("section", {
					key: g.group ?? "",
					className: card_module_css_default.specGroup,
					"data-form-group-panel": g.group ?? "general"
				}, g.group !== null && !submenu ? (0, react.createElement)("h4", { className: card_module_css_default.specGroupTitle }, titleCaseId(g.group)) : null, (0, react.createElement)("div", {
					className: card_module_css_default.specGrid,
					style: { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }
				}, children));
			}), modKinds.length > 0 ? (0, react.createElement)(ModifiersSection, {
				kinds: modKinds,
				values: value,
				onEdit: edit,
				railSeated: railNames,
				...onPatch !== void 0 ? { onPatch } : {},
				...paintFace !== void 0 ? { paintFace } : {},
				...bboxFace !== void 0 ? { bboxFace } : {},
				...paintReference !== void 0 ? { paintReference } : {},
				...wire?.loadMedia !== void 0 ? { loadMedia: wire.loadMedia } : {}
			}) : null, own.wireMenu);
		}
		//#endregion
		//#region src/mods.tsx
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
		*  - THREE kind shapes, all first-class (the leaf switches on the
		*    SERVED entry mode, never the kind name):
		*      OPTION kinds (lora): served catalog rows + strength; the
		*        entry is { id, strength } — the row's own defaults seed the
		*        strength.
		*      HYBRID kinds (controlnet): served catalog rows AND entry
		*        fields; the entry is the bag element keyed by its option_key
		*        (type) — the leaf stamps the row's resolved facts (model +
		*        preprocessor) onto new entries so the run record carries the
		*        retired wire shape; the lane re-validates them, never trusts
		*        them. Pack-level scalars (the strength floor) render as the
		*        section's own rows above the tiles.
		*      OPTION kinds (lora): served catalog rows + strength; the
		*        entry is { id, strength } — the row's own defaults seed the
		*        strength.
		*      FIELD kinds (mask): the kind's own spec fields (image squares,
		*        selects, sliders); the entry IS the params object. The leaf
		*        renders kind.fields through the same constructor atoms —
		*        the fields NEVER render flat on the card form.
		*/
		function ModifiersSection(props) {
			const { kinds, values, onEdit, onPatch } = props;
			const [dragTile, setDragTile] = (0, react.useState)(null);
			const [overTile, setOverTile] = (0, react.useState)(null);
			const [pickAt, setPickAt] = (0, react.useState)(null);
			const [leaf, setLeaf] = (0, react.useState)(null);
			const [leafError, setLeafError] = (0, react.useState)(null);
			const [draftOption, setDraftOption] = (0, react.useState)("");
			const [draftStrength, setDraftStrength] = (0, react.useState)("");
			const [draftSteps, setDraftSteps] = (0, react.useState)("");
			const [draftParams, setDraftParams] = (0, react.useState)({});
			const entriesOf = (k) => {
				const v = values[k.param_key];
				return Array.isArray(v) ? v.filter((e) => typeof e === "object" && e !== null) : [];
			};
			const optionOf = (k, value) => (k.options ?? []).find((o) => o.value === value) ?? null;
			/** THE HYBRID ENTRY FIELDS (the bag element minus its two bound
			*  rows — the option_key select and the scalar dial own those). */
			const hybridFields = (k, hidden) => {
				const key = optionKeyOf(k);
				const scalar = scalarKeyOf(k);
				return (k.fields ?? []).filter((f) => f.name !== key && f.name !== scalar && !(hidden?.has(f.name) ?? false));
			};
			/** The scalar seed (the row's own default wins; the contract
			*  field default is the backstop — 0.7, the retired leaf). */
			const strengthSeedOf = (k, option) => {
				const scalar = scalarKeyOf(k);
				const rowDefault = option?.defaults?.[scalar];
				if (typeof rowDefault === "number") return rowDefault;
				const field = (k.fields ?? []).find((f) => f.name === scalar);
				return typeof field?.default === "number" ? field.default : .7;
			};
			const commitScalar = (f, name, v) => {
				const coerced = coerceFieldEdit(f, v);
				onEdit(name, coerced);
				onPatch?.({ [name]: coerced });
			};
			const commit = (k, next) => {
				onEdit(k.param_key, next);
				onPatch?.({ [k.param_key]: next });
			};
			const addable = kinds.filter((k) => k.cardinality !== "scalar");
			if (kinds.length === 0) return null;
			const seated = props.railSeated;
			const fieldDefaults = (k) => {
				const out = {};
				for (const f of k.fields ?? []) {
					if (seated?.has(f.name) ?? false) continue;
					if (f.default !== void 0 && f.default !== null) out[f.name] = f.default;
				}
				return out;
			};
			const openCreate = (k) => {
				const entries = entriesOf(k);
				if (k.max_stack !== void 0 && entries.length >= k.max_stack) {
					setLeafError(k.label + " stack limit reached (" + String(k.max_stack) + ") — remove one to add another.");
					return;
				}
				setDraftOption("");
				setDraftStrength("");
				setDraftSteps("");
				setDraftParams(fieldDefaults(k));
				setLeafError(null);
				setLeaf({
					mode: "create",
					kind: k,
					index: -1
				});
			};
			const openEdit = (k, index) => {
				const entry = entriesOf(k)[index];
				if (isHybridKind(k)) {
					const key = optionKeyOf(k);
					setDraftOption(typeof entry[key] === "string" ? entry[key] : "");
					const scalar = scalarKeyOf(k);
					const strength = typeof entry[scalar] === "number" ? entry[scalar] : void 0;
					setDraftStrength(strength !== void 0 ? String(strength) : "");
					const params = {};
					for (const f of hybridFields(k, seated)) if (entry[f.name] !== void 0) params[f.name] = entry[f.name];
					setDraftParams(params);
				} else if (isOptionKind(k)) {
					setDraftOption(typeof entry["id"] === "string" ? entry["id"] : "");
					const strength = typeof entry["strength"] === "number" ? entry["strength"] : void 0;
					setDraftStrength(strength !== void 0 ? String(strength) : "");
					setDraftSteps(typeof entry["steps"] === "number" ? String(entry["steps"]) : "");
				} else {
					const params = { ...fieldDefaults(k) };
					for (const f of k.fields ?? []) {
						if (seated?.has(f.name) ?? false) continue;
						if (entry[f.name] !== void 0) params[f.name] = entry[f.name];
					}
					setDraftParams(params);
				}
				setLeafError(null);
				setLeaf({
					mode: "edit",
					kind: k,
					index
				});
			};
			const saveLeaf = () => {
				const open = leaf;
				const k = open.kind;
				const entries = entriesOf(k);
				if (isHybridKind(k)) {
					const key = optionKeyOf(k);
					if (draftOption === "") {
						setLeafError("Pick one from the served rows.");
						return;
					}
					const option = optionOf(k, draftOption);
					if (option === null) {
						setLeafError("‘" + draftOption + "’ is not a served " + k.label + " row — pick from the catalog, never hand-spell.");
						return;
					}
					const seed = strengthSeedOf(k, option);
					const strength = draftStrength.trim() === "" ? seed : Number(draftStrength);
					if (!Number.isFinite(strength)) {
						setLeafError("Strength must be a number.");
						return;
					}
					const scalar = { [scalarKeyOf(k)]: strength };
					const stamped = { [key]: draftOption };
					if (typeof option.model === "string") stamped["model"] = option.model;
					if (typeof option.preprocessor === "string") stamped["preprocessor"] = option.preprocessor;
					if (open.mode === "create") commit(k, [...entries, {
						...stamped,
						...draftParams,
						...scalar
					}]);
					else {
						const entry = entries[open.index];
						if (entry === void 0) {
							setLeaf(null);
							return;
						}
						const next = [...entries];
						next[open.index] = {
							...entry,
							...stamped,
							...draftParams,
							...scalar
						};
						commit(k, next);
					}
				} else if (isOptionKind(k)) {
					if (open.mode === "create") {
						if (draftOption === "") {
							setLeafError("Pick one from the served rows.");
							return;
						}
						const option = optionOf(k, draftOption);
						const seed = option !== null && option.defaults?.strength !== void 0 ? option.defaults.strength : 1;
						const strength = draftStrength.trim() === "" ? seed : Number(draftStrength);
						if (!Number.isFinite(strength)) {
							setLeafError("Strength must be a number.");
							return;
						}
						const stepsSeed = option?.defaults?.steps;
						const steps = draftSteps.trim() === "" ? typeof stepsSeed === "number" ? stepsSeed : void 0 : Number(draftSteps);
						if (steps !== void 0 && (!Number.isFinite(steps) || !Number.isInteger(steps) || steps < 1)) {
							setLeafError("Steps applied must be a whole number ≥ 1.");
							return;
						}
						if (steps !== void 0) {
							const min = option?.defaults?.steps_min;
							const max = option?.defaults?.steps_max;
							if (typeof min === "number" && steps < min) {
								setLeafError(`Steps applied must be \u2265 ${min} on this adapter.`);
								return;
							}
							if (typeof max === "number" && steps > max) {
								setLeafError(`Steps applied must be \u2264 ${max} on this adapter.`);
								return;
							}
						}
						commit(k, [...entries, steps === void 0 ? {
							id: draftOption,
							strength
						} : {
							id: draftOption,
							strength,
							steps
						}]);
					} else {
						const entry = entries[open.index];
						if (entry === void 0) {
							setLeaf(null);
							return;
						}
						const editRow = (k.options ?? []).find((o) => o.value === entry.id);
						const strengthSeed = typeof editRow?.defaults?.strength === "number" ? editRow.defaults.strength : 1;
						const strength = draftStrength.trim() === "" ? strengthSeed : Number(draftStrength);
						if (!Number.isFinite(strength)) {
							setLeafError("Strength must be a number.");
							return;
						}
						const steps = draftSteps.trim() === "" ? void 0 : Number(draftSteps);
						if (steps !== void 0 && (!Number.isFinite(steps) || !Number.isInteger(steps) || steps < 1)) {
							setLeafError("Steps applied must be a whole number ≥ 1.");
							return;
						}
						if (steps !== void 0) {
							const min = editRow?.defaults?.steps_min;
							const max = editRow?.defaults?.steps_max;
							if (typeof min === "number" && steps < min) {
								setLeafError(`Steps applied must be \u2265 ${min} on this adapter.`);
								return;
							}
							if (typeof max === "number" && steps > max) {
								setLeafError(`Steps applied must be \u2264 ${max} on this adapter.`);
								return;
							}
						}
						const next = [...entries];
						if (steps === void 0) {
							const rest = {
								...entry,
								strength
							};
							delete rest["steps"];
							next[open.index] = rest;
						} else next[open.index] = {
							...entry,
							strength,
							steps
						};
						commit(k, next);
					}
				} else if (open.mode === "create") commit(k, [...entries, { ...draftParams }]);
				else {
					const entry = entries[open.index];
					if (entry === void 0) {
						setLeaf(null);
						return;
					}
					const next = [...entries];
					next[open.index] = {
						...entry,
						...draftParams
					};
					commit(k, next);
				}
				setLeaf(null);
			};
			const deleteLeaf = () => {
				commit(leaf.kind, entriesOf(leaf.kind).filter((_, i) => i !== leaf.index));
				setLeaf(null);
			};
			const onTileDrop = (k, active, over) => {
				const entries = entriesOf(k);
				const from = entries.findIndex((_, i) => k.param_key + "-" + i === active);
				const to = entries.findIndex((_, i) => k.param_key + "-" + i === over);
				if (from < 0 || to < 0) return;
				const next = [...entries];
				const [moved] = next.splice(from, 1);
				next.splice(to, 0, moved);
				commit(k, next);
			};
			const isOrdered = (k) => k.category !== "standalone";
			const anyOrdered = kinds.some(isOrdered);
			return (0, react.createElement)("section", {
				className: card_module_css_default.modSection,
				"data-subcard-grid": "on",
				"data-testid": "cb-mods-section"
			}, (0, react.createElement)("div", { className: card_module_css_default.modHead }, (0, react.createElement)("span", { className: card_module_css_default.modTitle }, "Modifiers"), (0, react.createElement)("span", { className: card_module_css_default.modHint }, anyOrdered ? "drag to set apply order" : "each entry is its own output (standalone)")), leafError !== null && leaf === null ? (0, react.createElement)("p", { className: card_module_css_default.modLeafError }, leafError) : null, ...kinds.filter((k) => (k.kindFields ?? []).length > 0).map((k) => (0, react.createElement)("div", {
				key: k.param_key + ":kind",
				className: card_module_css_default.modLeafFields
			}, k.kindFields.map((f) => (0, react.createElement)("label", {
				key: f.name,
				className: card_module_css_default.modField
			}, f.label ?? f.name, (0, react.createElement)(SpecAtom, {
				f,
				value: values[f.name] ?? f.default,
				onEdit: (name, v) => {
					commitScalar(f, name, v);
				}
			}))))), (0, react.createElement)("div", {
				className: card_module_css_default.modRow,
				"data-subcard-row": "flow"
			}, kinds.map((k) => {
				const entries = entriesOf(k);
				if (entries.length === 0) return null;
				const ordered = isOrdered(k);
				return [...entries.map((entry, i) => {
					const id = typeof entry[optionKeyOf(k)] === "string" ? entry[optionKeyOf(k)] : "";
					const option = optionOf(k, id);
					const scalar = scalarKeyOf(k);
					const strength = typeof entry[scalar] === "number" ? entry[scalar] : option !== null && option.defaults !== void 0 && typeof option.defaults[scalar] === "number" ? option.defaults[scalar] : void 0;
					const steps = typeof entry["steps"] === "number" ? entry["steps"] : option !== null && option.defaults !== void 0 && typeof option.defaults["steps"] === "number" ? option.defaults["steps"] : void 0;
					const picked = (k.fields ?? []).find((f) => f.type === "select" && typeof entry[f.name] === "string" && entry[f.name] !== "");
					const pickedLabel = picked === void 0 ? null : (picked.options ?? []).map((o) => typeof o === "string" ? {
						value: o,
						label: o
					} : o).find((o) => o.value === entry[picked.name])?.label ?? null;
					return (0, react.createElement)(ModTile, {
						key: k.param_key + "-" + i,
						tileId: k.param_key + "-" + i,
						label: option !== null ? option.label : pickedLabel !== null ? pickedLabel : id !== "" ? titleCaseId(id) : isOptionKind(k) ? k.label + " " + String(i + 1) : k.label,
						...strength !== void 0 ? { strength } : {},
						...steps !== void 0 ? { steps } : {},
						onOpen: () => {
							openEdit(k, i);
						},
						dragging: dragTile === k.param_key + "-" + i,
						dragOver: overTile === k.param_key + "-" + i && dragTile !== null && dragTile !== overTile,
						...ordered ? {
							onReorderStart: (id) => {
								setDragTile(id);
								if (id === null) setOverTile(null);
							},
							onReorderOver: setOverTile,
							onReorderDrop: (active, over) => {
								setDragTile(null);
								setOverTile(null);
								onTileDrop(k, active, over);
							}
						} : {}
					});
				})];
			}), addable.length > 0 ? (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.modAddSquare,
				"data-subcard-add": "mod",
				"aria-label": "Add modifier",
				title: "Add a modifier",
				onClick: (e) => {
					setPickAt({ rect: e.currentTarget.getBoundingClientRect() });
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { className: card_module_css_default.squareGlyph })) : null), pickAt !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: true,
				anchor: null,
				getAnchorRect: () => pickAt.rect,
				items: addable.map((k) => ({
					id: k.kind,
					label: k.label
				})),
				onSelect: (id) => {
					setPickAt(null);
					openCreate(addable.find((x) => x.kind === id));
				},
				onClose: () => {
					setPickAt(null);
				},
				portal: true
			}) : null, leaf !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: () => {
					setLeaf(null);
				},
				title: (leaf.mode === "create" ? "Add " : "Edit ") + leaf.kind.label,
				closeLabel: "Close",
				className: card_module_css_default.modLeafModal
			}, (0, react.createElement)(ModLeaf, {
				leaf,
				values,
				hideFields: seated,
				onDraft: {
					setDraftOption,
					setDraftStrength,
					setDraftParams,
					setDraftSteps,
					draftOption,
					draftStrength,
					draftParams,
					draftSteps
				},
				onError: setLeafError,
				onSave: saveLeaf,
				onDelete: deleteLeaf,
				leafError,
				paintFace: props.paintFace,
				bboxFace: props.bboxFace,
				paintReferenceValue: typeof props.paintReference === "string" ? String(values[props.paintReference] ?? "") : "",
				...props.loadMedia !== void 0 ? { loadMedia: props.loadMedia } : {}
			})) : null);
		}
		/** THE LEAF BODY — split so the FIELD-kind editor gets its own
		*  square provider (the construction law: an image input constructs
		*  the square automatically, even inside a mod leaf). */
		function ModLeaf(props) {
			const { leaf, onDraft, onSave, onDelete, leafError } = props;
			const k = leaf.kind;
			const hidden = props.hideFields;
			const bboxCanvas = props.bboxFace !== void 0 && k.leaf_face === "bbox-canvas";
			const paintField = props.paintFace !== void 0 && k.leaf_face === "paint-canvas" ? (k.fields ?? []).find((f) => f.type === "image" || f.wtype === "image") : void 0;
			const facePresent = bboxCanvas || paintField !== void 0;
			const draftQuad = () => {
				const quad = [
					onDraft.draftParams["bbox_x"],
					onDraft.draftParams["bbox_y"],
					onDraft.draftParams["bbox_w"],
					onDraft.draftParams["bbox_h"]
				];
				return quad.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) ? {
					x: quad[0],
					y: quad[1],
					width: quad[2],
					height: quad[3]
				} : null;
			};
			const writeQuad = (b) => {
				onDraft.setDraftParams(b === null ? {
					...onDraft.draftParams,
					bbox_x: -1,
					bbox_y: -1,
					bbox_w: -1,
					bbox_h: -1
				} : {
					...onDraft.draftParams,
					bbox_x: Math.round(b.x),
					bbox_y: Math.round(b.y),
					bbox_w: Math.round(b.width),
					bbox_h: Math.round(b.height)
				});
			};
			const leafFields = (k.fields ?? []).filter((f) => !(hidden?.has(f.name) ?? false) && !(facePresent && f.faceOwned === true));
			const own = useSquareProvider((name, v) => {
				onDraft.setDraftParams({
					...onDraft.draftParams,
					[name]: v
				});
			}, {
				candidates: [],
				...props.loadMedia !== void 0 ? { loadMedia: props.loadMedia } : {}
			});
			return (0, react.createElement)("div", { className: card_module_css_default.modLeaf }, leafError !== null ? (0, react.createElement)("p", { className: card_module_css_default.modLeafError }, leafError) : null, isHybridKind(k) ? (0, react.createElement)("div", { className: card_module_css_default.modLeafFields }, (0, react.createElement)("label", { className: card_module_css_default.modField }, k.label, (0, react.createElement)("select", {
				className: card_module_css_default.modSelect,
				value: onDraft.draftOption,
				onChange: (e) => {
					onDraft.setDraftOption(e.target.value);
				}
			}, (0, react.createElement)("option", { value: "" }, "— pick —"), (k.options ?? []).map((o) => (0, react.createElement)("option", {
				key: o.value,
				value: o.value,
				title: o.tooltip ?? o.label
			}, o.label)), onDraft.draftOption !== "" && (k.options ?? []).every((o) => o.value !== onDraft.draftOption) ? (0, react.createElement)("option", { value: onDraft.draftOption }, titleCaseId(onDraft.draftOption) + " (unregistered)") : null)), (0, react.createElement)("label", { className: card_module_css_default.modField }, (k.fields ?? []).find((f) => f.name === scalarKeyOf(k))?.label ?? "Strength", (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				type: "number",
				step: "0.05",
				value: onDraft.draftStrength,
				placeholder: "the row default",
				onChange: (e) => {
					onDraft.setDraftStrength(e.target.value);
				}
			})), (k.fields ?? []).filter((f) => f.name !== optionKeyOf(k) && f.name !== scalarKeyOf(k) && !(hidden?.has(f.name) ?? false)).map((f) => {
				const sq = own.square(f);
				const atom = (0, react.createElement)(SpecAtom, {
					f,
					value: onDraft.draftParams[f.name] ?? f.default,
					onEdit: (name, v) => {
						onDraft.setDraftParams({
							...onDraft.draftParams,
							[name]: v
						});
					},
					...sq !== void 0 ? { square: sq } : {}
				});
				const caption = (0, react.createElement)("span", { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name);
				return sq !== void 0 ? (0, react.createElement)("div", {
					key: f.name,
					className: card_module_css_default.modField
				}, caption, atom) : (0, react.createElement)("label", {
					key: f.name,
					className: card_module_css_default.modField
				}, caption, atom);
			}), own.wireMenu) : isOptionKind(k) ? (0, react.createElement)("div", { className: card_module_css_default.modLeafFields }, leaf.mode === "create" ? (0, react.createElement)("label", { className: card_module_css_default.modField }, k.label, (0, react.createElement)("select", {
				className: card_module_css_default.modSelect,
				value: onDraft.draftOption,
				onChange: (e) => {
					onDraft.setDraftOption(e.target.value);
				}
			}, (0, react.createElement)("option", { value: "" }, "— pick —"), k.options.map((o) => (0, react.createElement)("option", {
				key: o.value,
				value: o.value
			}, o.label)))) : null, (0, react.createElement)("label", { className: card_module_css_default.modField }, "Strength", (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				type: "number",
				step: "0.05",
				value: onDraft.draftStrength,
				placeholder: "the row default",
				onChange: (e) => {
					onDraft.setDraftStrength(e.target.value);
				}
			})), (k.options ?? []).some((o) => typeof o.defaults?.steps === "number") ? (() => {
				const rowOpts = k.options ?? [];
				const activeRow = rowOpts.find((o) => o.value === onDraft.draftOption) ?? rowOpts[0];
				const rMin = activeRow?.defaults?.steps_min;
				const rMax = activeRow?.defaults?.steps_max;
				const rangeText = typeof rMin === "number" && typeof rMax === "number" && rMin !== rMax ? ` ${rMin}\u2013${rMax}` : typeof activeRow?.defaults?.steps === "number" ? ` (fixed at ${activeRow.defaults.steps})` : "";
				return (0, react.createElement)("label", { className: card_module_css_default.modField }, `Steps applied${rangeText}`, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					"aria-label": "Steps applied",
					type: "number",
					step: "1",
					min: typeof rMin === "number" ? String(rMin) : void 0,
					max: typeof rMax === "number" ? String(rMax) : void 0,
					value: onDraft.draftSteps,
					placeholder: String(activeRow?.defaults?.steps ?? ""),
					title: typeof rMin === "number" && typeof rMax === "number" && rMin !== rMax ? `This adapter runs ${rMin}\u2013${rMax} steps — the dial bounds to the row's declared domain; the run\u2019s sampler applies it unless a call pins steps explicitly.` : "The distill’s own step count — the run’s sampler applies it unless a call pins steps explicitly.",
					onChange: (e) => {
						onDraft.setDraftSteps(e.target.value);
					}
				}));
			})() : null) : bboxCanvas || paintField !== void 0 ? (0, react.createElement)("div", { className: card_module_css_default.modLeafSplit }, (0, react.createElement)("div", {
				className: card_module_css_default.modLeafStage,
				"data-leaf-stage": bboxCanvas ? "bbox" : "paint"
			}, bboxCanvas && props.bboxFace !== void 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.modStageCaption,
				"data-stage-caption": "region"
			}, "Region — optional (scopes the search; clear = whole image)") : null, bboxCanvas && props.bboxFace !== void 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.modField,
				"data-leaf-canvas": "bbox"
			}, (0, react.createElement)(props.bboxFace, {
				referenceUrl: props.paintReferenceValue,
				value: draftQuad(),
				onChange: writeQuad
			})) : null, paintField !== void 0 && props.paintFace !== void 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.modField,
				"data-leaf-canvas": "paint"
			}, (0, react.createElement)(props.paintFace, {
				referenceUrl: props.paintReferenceValue,
				value: typeof onDraft.draftParams[paintField.name] === "string" ? onDraft.draftParams[paintField.name] : "",
				onChange: (dataUrl) => {
					onDraft.setDraftParams({
						...onDraft.draftParams,
						[paintField.name]: dataUrl
					});
				}
			})) : null), (0, react.createElement)("div", { className: card_module_css_default.modLeafFields }, k.section !== void 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.modStageCaption,
				"data-stage-caption": "filter"
			}, k.section) : null, leafFields.map((f) => (0, react.createElement)("div", { key: f.name }, (() => {
				const sq = own.square(f);
				const atom = (0, react.createElement)(SpecAtom, {
					f,
					value: onDraft.draftParams[f.name],
					onEdit: (name, v) => {
						onDraft.setDraftParams({
							...onDraft.draftParams,
							[name]: v
						});
					},
					...sq !== void 0 ? { square: sq } : {}
				});
				return sq !== void 0 ? (0, react.createElement)("div", { className: card_module_css_default.modField }, (0, react.createElement)("span", { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name), atom) : (0, react.createElement)("label", { className: card_module_css_default.modField }, f.label ?? f.name, atom);
			})())), own.wireMenu)) : (0, react.createElement)("div", { className: card_module_css_default.modLeafFields }, k.section !== void 0 ? (0, react.createElement)("div", {
				className: card_module_css_default.modStageCaption,
				"data-stage-caption": "filter"
			}, k.section) : null, leafFields.map((f) => (0, react.createElement)("div", { key: f.name }, (() => {
				const sq = own.square(f);
				const atom = (0, react.createElement)(SpecAtom, {
					f,
					value: onDraft.draftParams[f.name],
					onEdit: (name, v) => {
						onDraft.setDraftParams({
							...onDraft.draftParams,
							[name]: v
						});
					},
					...sq !== void 0 ? { square: sq } : {}
				});
				return sq !== void 0 ? (0, react.createElement)("div", { className: card_module_css_default.modField }, (0, react.createElement)("span", { title: f.tooltip ?? f.label ?? f.name }, f.label ?? f.name), atom) : (0, react.createElement)("label", { className: card_module_css_default.modField }, f.label ?? f.name, atom);
			})())), own.wireMenu), (0, react.createElement)("div", { className: card_module_css_default.modLeafActions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				onClick: onSave
			}, leaf.mode === "create" ? "Add" : "Save"), leaf.mode === "edit" ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				onClick: onDelete
			}, "Remove") : null));
		}
		/** One mod tile (the original, verbatim: useSortable + click to
		*  edit + strength to 2 decimals). */
		/** The reorder drag's MIME (native HTML5 sortable). */
		const MOD_DRAG_MIME = "application/x-melite-mod";
		function ModTile(props) {
			const ordered = props.onReorderStart !== void 0;
			return (0, react.createElement)("li", {
				className: card_module_css_default.modTile + (props.dragging ? " " + card_module_css_default.tileDragging : "") + (props.dragOver ? " " + card_module_css_default.modTileOver : ""),
				draggable: ordered,
				"data-mod-tile": props.tileId,
				title: ordered ? "Drag to reorder · click to edit" : "Click to edit (standalone — own output)",
				onDragStart: (e) => {
					if (!ordered) return;
					e.dataTransfer.setData(MOD_DRAG_MIME, props.tileId);
					e.dataTransfer.effectAllowed = "move";
					props.onReorderStart(props.tileId);
				},
				onDragEnd: () => {
					if (ordered) props.onReorderStart(null);
				},
				onDragOver: (e) => {
					if (!ordered) return;
					if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
						e.preventDefault();
						e.dataTransfer.dropEffect = "move";
						props.onReorderOver(props.tileId);
					}
				},
				onDrop: (e) => {
					if (!ordered) return;
					if (e.dataTransfer.types.includes(MOD_DRAG_MIME)) {
						e.preventDefault();
						e.stopPropagation();
						const active = e.dataTransfer.getData(MOD_DRAG_MIME);
						if (active !== "" && active !== props.tileId) props.onReorderDrop(active, props.tileId);
					}
				},
				onClick: props.onOpen
			}, (0, react.createElement)("span", { className: card_module_css_default.modTileLabel }, props.label), props.strength !== void 0 ? (0, react.createElement)("span", { className: card_module_css_default.modTileStrength }, props.strength.toFixed(2)) : null, props.steps !== void 0 ? (0, react.createElement)("span", { className: card_module_css_default.modTileSteps }, `${String(props.steps)} steps`) : null);
		}
		//#endregion
		//#region src/slots.ts
		function defineStageViewRegistration(key, view, inject) {
			return (ctx) => {
				armEstateRemoteLazyBind(() => ({
					bench: ctx.get("remote.bench"),
					drafts: ctx.get("remote.drafts"),
					runs: ctx.get("remote.runs"),
					media: ctx.get("remote.media")
				}));
				ctx.slots.inject("cards.stage.view", () => {
					ctx.slots.register({
						name: "cards.stage.view",
						key,
						...inject === void 0 ? {} : { inject }
					}, view);
				});
			};
		}
		/** The seam ids, spelled once. Claims use these constants. */
		const CARD_SLOTS = {
			/** keyed by wire type: 'image' | 'file' | 'mesh' | 'select' | ... — the
			*  ATOM seam. The constructor renders every emitted field through
			*  the claim for its declared type; the base's built-in atom is
			*  the default, a card takes over its own type's atom. */
			field: "melite.card.field",
			/** keyed by card id: the WHOLE-FORM takeover — a card's client
			*  half replaces the constructed form entirely (the studio law's
			*  form half; the drill consults this before constructing). */
			form: "melite.card.form",
			/** keyed by card id: the BENCH stage view — a card's client half
			*  mounted on the bench slot (the studio law's bench half; the
			*  first-party studio surface every card package ships). */
			stageView: "cards.stage.view",
			/** keyed by media kind ('video' | 'image'): THE PREVIEW SEAM —
			*  every card's rendered output previews through one shared slot
			*  (shared DSH primitives, hour-9 law); a card claims its kind's
			*  preview only to specialize, never to bespoke. */
			stagePreview: "cards.stage.preview"
		};
		//#endregion
		//#region src/use-resolved.ts
		/**
		* use-resolved.ts — THE STUDIO SEAM, ONE UNIVERSAL DEFAULT SYSTEM
		* (operator, 2026-09-18: "there is no universal default system
		* right?"). ONE resolver composes EVERY layer — schema defaults <-
		* model_defaults <- base (the persisted/bench layer) <- user — and
		* the surface reads THE ONE resolved map. Never a hand `??` ladder
		* at a call site: a ladder IS a second resolver, and every extra
		* arm is a place the truth forks.
		*
		* PRE-FETCH LAW: the spec arrives async, but the resolved map is
		* STILL the layer composition — base under user, verbatim — so a
		* synchronous render shows the document's own held values; the
		* fetch landing fills the declared defaults under them (the same
		* one map, richer). Nothing renders blank, nothing flickers, no
		* call site branches on spec-null.
		*
		* THE EDIT LAW: `undefined` is the tri-state's inherit signal (the
		* unset) — it rides verbatim, the caller's write owns what it
		* means. Edits coerce at the SCHEMA BOUNDARY (coerceFieldEdit):
		* numeric strings ride as numbers, unparseable strings ride
		* verbatim for the run's schema parse to refuse LOUD, and keys the
		* spec never declared (the mod bag) ride verbatim — the mod plane
		* owns their validation.
		*/
		/** The resolved studio seam: spec + error from the door, values
		* resolved through the ONE cascade, edits coerced at the schema
		* boundary. `user` is the surface's explicit layer (a document's
		* params — sparse by design); `base` is the persisted layer under
		* it (the bench/stage row's params), when the surface has one. */
		function useResolvedForm(family, user, onWrite, base) {
			const { spec, error } = useFormSpec(family);
			const resolved = (0, react.useMemo)(() => resolveValueLayered(spec, base, user), [
				spec,
				base,
				user
			]);
			const fieldOf = (0, react.useCallback)((name) => spec !== null ? fieldsOf(spec).find((f) => f.name === name) : void 0, [spec]);
			return {
				spec,
				error,
				resolved,
				edit: (0, react.useCallback)((name, v) => {
					const f = fieldOf(name);
					if (v === "" && f !== void 0 && (f.type === "number" || f.type === "seed" || f.type === "slider")) {
						onWrite(name, void 0);
						return;
					}
					onWrite(name, coerceFieldEdit(f, v));
				}, [fieldOf, onWrite]),
				fieldOf
			};
		}
		/** The layer composition — PURE, exported for the seam's own wall:
		* with a spec it is exactly resolveValue (schema <- model_defaults
		* <- base <- user); without one (the pre-fetch render, the dead
		* door) it is still the LAYERS — base under user, verbatim — so
		* every surface reads the same shape at every moment. */
		function resolveValueLayered(spec, base, user) {
			if (spec === null) {
				const out = { ...base ?? {} };
				for (const [k, v] of Object.entries(user)) {
					if (v === null || v === void 0) continue;
					out[k] = v;
				}
				return out;
			}
			return resolveValue(spec, user, base);
		}
		//#endregion
		//#region ../melite-run-wire/src/index.ts
		init_benchStage();
		init_stageView();
		/** The ONE media-url rewrite (readRunStatus + the file-era list
		*  fallback share it): bare run-relative names ride the estate's
		*  media route (/melite-media/runs/<runId>/<rel>); urls that already
		*  carry a scheme or lead with / pass verbatim (never double-encoded). */
		function toRunMediaUrl(runId, url) {
			if (url === "") return "";
			if (!/^(https?:\/\/|\/)/.test(url)) return RUN_MEDIA_PREFIX + "/" + encodeURIComponent(runId) + "/" + url.split("/").map((seg) => encodeURIComponent(seg)).join("/");
			return url;
		}
		/** Normalize a runs/status doc: stage rows distilled, bare run-
		*  relative urls rewritten onto the estate's media route (absolute
		*  and leading-/ urls pass verbatim — the one rewrite, never two). */
		function readRunStatus(runId, doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			for (const stage of stages) {
				if (typeof stage.url === "string" && stage.url !== "") stage.url = toRunMediaUrl(runId, stage.url);
				if (typeof stage.error !== "string" || stage.error === "") delete stage.error;
				const p = stage.progress;
				if (p === void 0 || typeof p !== "object" || typeof p.value !== "number" || typeof p.max !== "number") delete stage.progress;
				if (typeof stage.activity !== "string" || stage.activity === "") delete stage.activity;
			}
			const status = doc["status"];
			if (typeof status !== "string" || !RUN_STATUS_WORDS.has(status.toLowerCase())) throw new Error(`runs/status ${runId}: run-level status ${JSON.stringify(status)} is outside the vocabulary`);
			return {
				runId,
				status,
				draftId: typeof doc["draft_id"] === "string" && doc["draft_id"] !== "" ? doc["draft_id"] : null,
				stages,
				...typeof doc["error"] === "string" && doc["error"] !== "" ? { error: doc["error"] } : {}
			};
		}
		/** The list row's served artifact url onto the media route. The
		*  list's currency DIFFERS from the status door's: runArtifacts
		*  serves urls already prefixed with the run dir
		*  (`<runId>/<rel>` — `url: runBase + "/" + cand.rel`), while live
		*  stage urls are bare rels (runRel strips the dir). So the list
		*  url rides under the route root directly — prepending the run id
		*  again would double it. Absolute and rooted urls pass verbatim. */
		function listArtifactMediaUrl(url) {
			if (url === "") return null;
			if (/^(https?:\/\/|\/)/.test(url)) return url;
			return RUN_MEDIA_PREFIX + "/" + url.split("/").map((seg) => encodeURIComponent(seg)).join("/");
		}
		/** The list row's first media artifact url, rewritten onto the media
		*  route (the row's own currency is run-prefixed, like the
		*  thumbnail). Truncated markers carry no url and are skipped. */
		function listRowMediaUrl(row) {
			const arts = Array.isArray(row["artifacts"]) ? row["artifacts"] : [];
			for (const a of arts) {
				if (typeof a !== "object" || a === null) continue;
				const url = a["url"];
				if (typeof url === "string") {
					const media = listArtifactMediaUrl(url);
					if (media !== null) return media;
				}
			}
			return null;
		}
		//#endregion
		//#region src/runs-policy.ts
		/**
		* runs-policy.ts — the run verbs over THE ONE LANE (stroke 81; the
		* shared home, stroke 81b — beside estate-remote, for the same
		* singleton reason: sibling studio clients poll runs here).
		*
		* The run-wire package's policy laws, moved verbatim onto the
		* mounted runs namespace: status/list/start/stop are typed calls
		* through ctx.remote (the generated client — the Connection owns
		* transport, RPC ids, envelopes, cancellation; the hand-written
		* envelope lane is dead). Refusals resolve as RemoteResult error
		* branches and throw EstateRefusedError carrying the estate's
		* message verbatim (WireRefusedError's discrimination role — the
		* gone-verdict, the poll's file-era arms key on the CLASS, not the
		* words). The PURE laws (readRunStatus's normalize, toRunMediaUrl's
		* one rewrite, the terminal vocabulary, the list-row url law) stay
		* in the run-wire package — their ONE definition; only the
		* transport moved.
		*/
		/** THE WIRE SPELLING OF THE INCOMPLETE-DRAFT CLASS (the wire-chain
		*  audit cure, 2026-10-18): one exported const for every client
		*  comparer — the tab's heal-vs-carry split, the run seat, the
		*  specs. The ENVELOPE spelling (card_compose_incomplete) stays
		*  server-side in RUNS_ERROR_CODES; this is what the wire answers
		*  and the only literal the client owns. */
		const WIRE_CARD_COMPOSE_INCOMPLETE = "runs/card-compose-incomplete";
		/** One runs/status read (normalized once — readRunStatus's law). */
		async function fetchRunStatus(runId, signal) {
			return readRunStatus(runId, await unwrapRemote(estateRemote().runs.status(runId, signal), "runs/status"));
		}
		/** The runs/list rows as loose records (the restore port's own
		*  shape — run_id, draft_id, created_at, status, artifacts). */
		async function listRunRows(signal) {
			const row = await unwrapRemote(estateRemote().runs.list("500", signal), "runs/list");
			return (Array.isArray(row["runs"]) ? row["runs"] : []).filter((r) => typeof r === "object" && r !== null);
		}
		/** One runs/list row by run_id (the file-era face — runs/status only
		*  knows live runs; the list is the completed runs' SSOT). */
		async function fetchListRow(runId, signal) {
			for (const r of await listRunRows(signal)) {
				const rid = r["run_id"] ?? r["id"];
				if (typeof rid === "string" && rid !== "" && rid === runId) return r;
			}
			return null;
		}
		/** THE SINGLE-STAGE FALLBACK: a one-stage run's only stage IS the
		*  asked stage — the {model:} door names its stage by the card's
		*  declared skeleton ('img-to-mesh'), not the bench row id ('s_1')
		*  the caller holds; matching ids first keeps multi-stage runs
		*  exact while single-stage card runs answer under any label.
		*  File-era arm: a REFUSED status (the run is not in the live
		*  map) falls back to the runs/list row's first artifact —
		*  completed runs answer here, not at the status door.
		*  Transport errors rethrow (the caller decides retry); a live
		*  answer with no url yet is null (the poll loop keeps going). */
		async function fetchRunStageUrl(runId, stageId, signal) {
			let value;
			try {
				value = await fetchRunStatus(runId, signal);
			} catch (e) {
				if (e instanceof Error && e.name === "EstateRefusedError") {
					const listed = await fetchListRow(runId, signal).catch(() => null);
					return listed !== null ? listRowMediaUrl(listed) : null;
				}
				throw e;
			}
			const row = value.stages.find((s) => s.id === stageId) ?? (value.stages.length === 1 ? value.stages[0] : void 0);
			return row !== void 0 && typeof row.url === "string" && row.url !== "" ? row.url : null;
		}
		/** A run's terminal read (stops poll loops). */
		async function fetchRunTerminal(runId, signal) {
			return isTerminalStatus$1((await fetchRunStatus(runId, signal)).status);
		}
		/** THE GONE-VERDICT (2026-09-13 phantom-running incident): for a run
		*  the live registry no longer knows (an estate restart wiped the
		*  in-memory map). The file-era law: a refused id may still answer
		*  from runs/list (the completed runs' SSOT); absent from both, the
		*  run is GONE — nothing will ever write its terminal, so the caller
		*  stamps 'stopped'. Transport errors rethrow (not a verdict — the
		*  caller retries or leaves the row alone). */
		async function probeRunGone(runId, signal) {
			try {
				await fetchRunStatus(runId, signal);
				return "live";
			} catch (e) {
				if (!(e instanceof Error && e.name === "EstateRefusedError")) throw e;
				const listed = await fetchListRow(runId, signal).catch(() => null);
				if (listed === null) return "gone";
				const status = listed["status"];
				return typeof status === "string" && status !== "" ? status : "unknown";
			}
		}
		/** The draft's newest run (runs/list adoption — the reload-proof
		*  bridge: the estate is the SSOT, never the client's memory).
		*  NOTE the list's ordering: media-bearing runs first, then
		*  newest-first — scan the wide tail, newest by created_at. */
		async function fetchLatestRunForDraft(draftId, signal) {
			let newest = null;
			for (const r of await listRunRows(signal)) {
				const rid = r["run_id"] ?? r["id"];
				const did = r["draft_id"];
				if (typeof rid !== "string" || rid === "" || did !== draftId) continue;
				const created = r["created_at"];
				const at = typeof created === "number" ? created : 0;
				if (newest === null || at > newest.created) newest = {
					rid,
					created: at
				};
			}
			return newest !== null ? newest.rid : null;
		}
		/** runs/stop — the cancel door (the registry seat's flag +
		*  interrupt). Refusals throw the estate's text. */
		async function stopRun(runId, signal) {
			await unwrapRemote(estateRemote().runs.stop(runId, signal), "runs/stop");
		}
		/** The shared start core — ONE envelope walk for both doors (the
		*  registry demands draft_id + an explicit test boolean; the flow
		*  body needs its id — the bench runs under its own draft_id). */
		async function startRun(doc, signal) {
			try {
				const runId = (await unwrapRemote(estateRemote().runs.start(doc, signal), "runs/start"))["run_id"];
				if (typeof runId === "string" && runId !== "") return { runId };
				return { refused: "run refused: no run_id in the answer" };
			} catch (e) {
				const code = e instanceof Error && e.name === "EstateRefusedError" ? e.code : void 0;
				return code === void 0 ? { refused: rejectionVoice(e) } : {
					refused: rejectionVoice(e),
					refusedCode: code
				};
			}
		}
		/** Start ONE card through the composing door (the bench drill's
		*  Run, a studio's Run — every single-card gesture rides this). */
		async function startCardRun(input, signal) {
			return await startRun({
				...input.params,
				model: input.model,
				draft_id: input.draftId,
				test: input.test ?? false
			}, signal);
		}
		/** Start pre-composed stages through the flow door (whole-bench Run —
		*  honest refusal when the stages carry no workflow or the bench is
		*  multi-stage: the single-stage policy is the estate's). */
		async function startFlowInlineRun(input, signal) {
			return await startRun({
				flow_inline: {
					id: input.flowId,
					stages: input.stages
				},
				draft_id: input.draftId,
				test: input.test ?? false
			}, signal);
		}
		/** THE ARTIFACT POLL (the old pollFlowRun law, moved verbatim onto
		*  the mounted runs namespace — stroke 81 dropped it by accident and
		*  the img-to-mesh studio's import caught the hole): the run is the
		*  SSOT — check the stage's url immediately, then on the cadence
		*  until it lands (onUrl once, resolve), the run settles without
		*  one (resolve silent — the caller's empty state is honest), or
		*  signal aborts.
		*
		*  THE TWO ERROR CLASSES settle differently:
		*  - TRANSPORT failures (the wire is down) are swallowed: the next
		*    poll may recover.
		*  - REFUSALS (EstateRefusedError — the estate answered) on
		*    runs/status prove the run is NOT in the live map: nothing is
		*    executing for it. The file-era arm then consults the runs/list
		*    row ONCE and settles from it — its artifact url when it
		*    carries one, silent otherwise (file-era rows never update, so
		*    waiting would be the lie); no row at all settles silent the
		*    same way. A transport-failed list read keeps the poll alive
		*    (the answer may land next cadence). */
		async function pollRunStageUrl(runId, stageId, opts, signal) {
			const interval = opts.intervalMs ?? 1500;
			const sleep = (ms) => new Promise((resolve) => {
				const t = setTimeout(() => {
					signal?.removeEventListener("abort", onAbort);
					resolve("slept");
				}, ms);
				const onAbort = () => {
					clearTimeout(t);
					resolve("abort");
				};
				if (signal?.aborted === true) {
					onAbort();
					return;
				}
				signal?.addEventListener("abort", onAbort, { once: true });
			});
			while (signal?.aborted !== true) {
				let row;
				let readFailed = false;
				try {
					row = await fetchRunStatus(runId, signal);
				} catch (e) {
					if (isEstateRefusal(e)) try {
						const listed = await fetchListRow(runId, signal);
						const url = listed !== null ? listRowMediaUrl(listed) : null;
						if (url !== null) opts.onUrl(url);
						return;
					} catch (listErr) {
						if (isEstateRefusal(listErr)) return;
					}
					row = {
						runId,
						status: "unknown",
						draftId: null,
						stages: []
					};
					readFailed = true;
				}
				const stage = row.stages.find((s) => s.id === stageId) ?? (row.stages.length === 1 ? row.stages[0] : void 0);
				if (stage !== void 0 && typeof stage.url === "string" && stage.url !== "") {
					opts.onUrl(stage.url);
					return;
				}
				if (!readFailed && isTerminalStatus$1(row.status)) return;
				if (await sleep(interval) === "abort") return;
			}
		}
		//#endregion
		//#region src/studioRail.tsx
		/**
		* StudioRail — the shell-provided TOOLS slot in the studio's left rail
		* (spec dev_docs/design/card-studio-pattern.md §5 + §7.10).
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
		//#region src/toastStore.ts
		/**
		* THE ONE TOAST STORE (node-safe half of the one toast system,
		* stroke 37): the module state and the dual API (hook selector for
		* React, zustand-classic statics for module-level pushers and
		* tests) over the DSH platform engine `createSnapshotStore`
		* (`@deepseek-ai/dsh-client-store` — zustand vanilla + immer,
		* React-free by design; see its README Summary: "React-free
		* observable and snapshot-store primitives"). The engine owns
		* observation and publication; this module owns the record and
		* the toast lifetime. The renderer half lives in ./toast.tsx
		* (ToastViewport); the store is the system, the viewport is its
		* face.
		*
		* One store for the whole system: pusher modules call the
		* `getState()`/`subscribe()`/`setState()` statics from module
		* context, React seats use the hook selector. The last two private
		* stores (in web-kit/catalog and mask-studio) are gone; their
		* pushers now ride the `contractToast` seam in @melite/catalog,
		* wired by each browser entry to this store.
		*
		* The mount-claim registry lives here too (the viewport ids and
		* their epoch store): toast.tsx is a pure renderer that calls
		* hooks, per the client component law — no subscription machinery
		* in business components.
		*/
		const engine = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)([]);
		let nextId = 1;
		function subscribe(listener) {
			return engine.subscribe(() => listener());
		}
		function getSnapshot() {
			return engine.getSnapshot();
		}
		/** How long a toast of a severity holds before it dismisses, in ms.
		*  THE ONE OWNER of that number: the store arms its dismissal timer
		*  from it (the lifetime holds without a viewport mounted) and the
		*  renderer face passes it to the DSH Toast as `holdMs`, so a
		*  duration is spelled once. Errors persist long enough for the
		*  operator to read what broke; success and info clear quickly. */
		function toastHoldMs(type) {
			return type === "error" ? 15e3 : 5e3;
		}
		function addToast(type, message, _action) {
			const id = nextId++;
			engine.update((draft) => {
				draft.push({
					id,
					type,
					message
				});
			});
			if (type === "error") console.error("[toast]", message);
			else console.info("[toast]", message);
			setTimeout(() => {
				removeToast(id);
			}, toastHoldMs(type));
		}
		function removeToast(id) {
			const index = engine.getSnapshot().findIndex((t) => t.id === id);
			if (index < 0) return;
			engine.update((draft) => {
				draft.splice(index, 1);
			});
		}
		let liveAddToast = addToast;
		function getStore() {
			return {
				toasts: engine.getSnapshot(),
				addToast: liveAddToast,
				removeToast
			};
		}
		function setStoreState(patch) {
			if (patch.addToast !== void 0) liveAddToast = patch.addToast;
			engine.set(patch.toasts !== void 0 ? [...patch.toasts] : [...engine.getSnapshot()]);
		}
		/** The hook half — inside React: `useToastStore((s) => s.addToast)`.
		*  The static half (getState/subscribe/setState) hangs off the same
		*  function, the zustand-classic shape — module-level pushers and
		*  tests use those without calling the hook. */
		const useToastStore = Object.assign(function useToastStore(selector) {
			const toasts = (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
			return selector({
				addToast: liveAddToast,
				removeToast,
				toasts
			});
		}, {
			getState: getStore,
			setState: setStoreState,
			subscribe
		});
		const viewportEngine = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)([]);
		let nextViewportId = 1;
		/** Mint the stable id for a viewport mount (one per mounted
		*  component; the owner is the smallest live id).
		*  @returns the minted id. */
		function mintViewportId() {
			return nextViewportId++;
		}
		/** Claim rendering rights for a viewport id (mount arm).
		*  @param id - the minted viewport id. */
		function acquireViewport(id) {
			viewportEngine.update((draft) => {
				draft.push(id);
			});
		}
		/** Release a viewport id's claim (unmount arm). An id that was
		*  never acquired is a no-op (the removeToast law): an unguarded
		*  splice would read indexOf's -1 and drop the LAST live claim.
		*  @param id - the minted viewport id. */
		function releaseViewport(id) {
			const index = viewportEngine.getSnapshot().indexOf(id);
			if (index < 0) return;
			viewportEngine.update((draft) => {
				draft.splice(index, 1);
			});
		}
		/** The hook a viewport reads the live id set through — every
		*  acquire/release re-renders every mounted viewport. */
		function useViewportIds() {
			return (0, react.useSyncExternalStore)(viewportEngine.subscribe, viewportEngine.getSnapshot, viewportEngine.getSnapshot);
		}
		//#endregion
		//#region src/toast.tsx
		/**
		* ToastViewport — THE RENDERER FACE of the one toast system
		* (stroke 37). The store lives in ./toastStore.ts (node-safe, no
		* atom); this file re-exports it so UI users keep one import —
		* `@melite/card-base/client` — and mounts the viewport.
		*
		* THE MOUNT-CLAIM LAW: the viewport may mount at every seat — the
		* studio shell, the cards console — and the document still renders
		* toasts exactly ONCE. The first live viewport owns rendering;
		* every other mounted viewport renders nothing; ownership
		* re-broadcasts when owners unmount. No studio wires it, no studio
		* can forget it, no seat can duplicate it.
		*
		* This file is a pure renderer: it holds no subscription
		* machinery — the claim registry and both store hooks live in
		* ./toastStore.ts (the client component law: business components
		* contain no useSyncExternalStore, no manual subscribe wiring).
		*
		* Reached through the `/client` door (`@melite/card-base/client`).
		*/
		/** Mount anywhere the system needs a renderer — the studio shell,
		*  the cards console, any seat. The claim law guarantees exactly one
		*  live renderer per document: the first-mounted viewport renders,
		*  others render nothing until the owner unmounts. Renders the live
		*  entries through the DSH Toast atom (body-portaled banner, owner
		*  unmounts onDone). */
		function ToastViewport() {
			const idRef = (0, react.useRef)(mintViewportId());
			(0, react.useEffect)(() => {
				const id = idRef.current;
				acquireViewport(id);
				return () => {
					releaseViewport(id);
				};
			}, []);
			const ids = useViewportIds();
			const toasts = useToastStore((s) => s.toasts);
			if (!(ids.length === 0 || Math.min(...ids) === idRef.current) || toasts.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: toasts.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				text: t.message,
				holdMs: toastHoldMs(t.type),
				onDone: () => removeToast(t.id)
			}, t.id)) });
		}
		//#endregion
		//#region \0dsh-css:packages/web/card-base/src/shell.module.css.mjs
		const css$2 = "._6zZDNa_shell{grid-template-rows:minmax(0,1fr) auto;grid-template-columns:minmax(280px,330px) minmax(0,1fr);height:100%;min-height:0;display:grid}@media (width<=640px){._6zZDNa_shell{grid-template-rows:none;grid-template-columns:1fr}._6zZDNa_shell>:first-child{max-height:none;overflow-y:visible}}._6zZDNa_shell>:first-child{scrollbar-gutter:stable;grid-area:1/1;min-height:0;padding-right:10px;overflow-y:auto}._6zZDNa_shell>:nth-child(2){grid-area:1/2;min-height:0;overflow-y:auto}._6zZDNa_shell>:nth-child(3){grid-area:2/1/auto/-1;min-height:0;max-height:none;overflow:visible}._6zZDNa_errorLine{flex-direction:column;grid-column:1/-1;gap:4px;display:flex}._6zZDNa_errorRow{border:1px solid color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-danger,#dc2626) 10%, transparent);color:var(--dsw-alias-danger,#dc2626);overflow-wrap:break-word;white-space:pre-wrap;border-radius:4px;margin:0;padding:6px 8px;font-family:ui-monospace,monospace;font-size:9px;line-height:1.4}._6zZDNa_errorIcon{vertical-align:-2px;width:12px;height:12px;margin-right:4px;display:inline}._6zZDNa_railSection{border:1px solid var(--dsw-alias-border,#e2e4e9);border-radius:8px;padding:8px 12px}._6zZDNa_railHead{justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;display:flex}._6zZDNa_railTitle{text-transform:uppercase;letter-spacing:.14em;color:var(--dsw-alias-label-tertiary);margin:0;font-size:10px;font-weight:600}";
		const tagId$2 = "@melite/card-base/shell.module.css@85d4e6fe";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/card-base";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var shell_module_css_default = {
			"errorIcon": "_6zZDNa_errorIcon",
			"errorLine": "_6zZDNa_errorLine",
			"errorRow": "_6zZDNa_errorRow",
			"railHead": "_6zZDNa_railHead",
			"railSection": "_6zZDNa_railSection",
			"railTitle": "_6zZDNa_railTitle",
			"shell": "_6zZDNa_shell"
		};
		//#endregion
		//#region src/shell.tsx
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
		*  are the same grain, forms simply leave the right/bottom slots empty.
		*
		*  THE TOAST LAW (stroke 36): the shell mounts the ONE toast viewport
		*  — toasts are shell-owned chrome exactly like the error line (the
		*  construction law: no studio wires it, no studio can forget it).
		*  Before: motion hand-mounted a copy in a slot the contract never
		*  had (type drift), anny pushed toasts with NO viewport mounted —
		*  silently dropped — and ideogram4 hand-wired its own outside the
		*  shell. The per-studio mount is DEAD; any toast pushed from any
		*  seam renders here, once. */
		function StudioShell({ params, preview, bottom, errors = [], className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cx(shell_module_css_default.shell, className),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioRail, { children: params }),
					preview,
					bottom,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioShellErrorLine, { errors }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToastViewport, {})
				]
			});
		}
		function RailSection({ title, actions, children, className, titleClassName, ...props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				"data-slot": "rail-section",
				"aria-label": typeof title === "string" ? title : void 0,
				className: cx(shell_module_css_default.railSection, className),
				...props,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shell_module_css_default.railHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: cx(shell_module_css_default.railTitle, titleClassName),
						children: title
					}), actions]
				}), children]
			});
		}
		/** The construction door: one obvious way to build a declaration,
		*  typed at the call site. Runtime-frozen. */
		function defineShellDeclaration(declaration) {
			return Object.freeze(declaration);
		}
		//#endregion
		//#region \0dsh-css:packages/web/card-base/src/studio.module.css.mjs
		const css$1 = ".DKzjDW_runError{color:var(--dsw-alias-label-error,#e05656);overflow-wrap:anywhere;font-size:11px}.DKzjDW_zoomDetail{min-height:0;padding:14px;display:block;overflow-y:auto}.DKzjDW_groupNote{color:var(--dsw-alias-label-secondary);margin:0 0 10px;font-size:12px;line-height:20px}.DKzjDW_studioGroup{flex-direction:column;gap:6px;display:flex}.DKzjDW_studioGroupTitle{letter-spacing:.04em;text-transform:uppercase;opacity:.65;margin:0;font-size:11px;font-weight:600}.DKzjDW_studioRail{flex-direction:column;gap:10px;min-width:0;display:flex}";
		const tagId$1 = "@melite/card-base/studio.module.css@d92b1128";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/card-base";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var studio_module_css_default = {
			"groupNote": "DKzjDW_groupNote",
			"runError": "DKzjDW_runError",
			"studioGroup": "DKzjDW_studioGroup",
			"studioGroupTitle": "DKzjDW_studioGroupTitle",
			"studioRail": "DKzjDW_studioRail",
			"zoomDetail": "DKzjDW_zoomDetail"
		};
		//#endregion
		//#region src/studio.tsx
		/** studio.tsx — THE DECLARATIVE STUDIO (primitive ④, 2026-09-21):
		*  the stage view owns ORGANIZATION over the SAME form-spec SSOT —
		*  and organization is now DATA, not a client half. A card declares
		*  its group partition (expose/fold + titles) and its preview kind;
		*  the base renders everything else: spec fetch, value seeding +
		*  resolved layering, the square provider, the patch-first run law,
		*  the bindRun ref dispatch, run polling, the envelope lift,
		*  error/loading faces, StudioShell composition.
		*
		*  A studio client half survives ONLY as a declaration + seam
		*  registration (img-to-mesh is the first: ~30 lines, zero react
		*  machinery, zero three, zero css). A TRUE takeover — content no
		*  renderer can declare (motion's timeline, h3's call-card strip) —
		*  rides beside this renderer as an extra pane, never a fork. */
		/** The construction door: one obvious way to build a declaration,
		*  typed at the call site. Runtime-frozen. */
		function defineStudioDeclaration(declaration) {
			return Object.freeze({
				...declaration,
				expose: Object.freeze([...declaration.expose]),
				folds: Object.freeze({ ...declaration.folds })
			});
		}
		function rowsOfGroup(fields, group) {
			return fields.filter((f) => f.group === group);
		}
		/** THE ONE data-driven studio renderer. Props are the seam's own
		*  currency (StageViewOwnerProps) plus the card's declaration. */
		function DeclarativeStudio(props) {
			const { declaration, row, runStatus, onPatch, onRun, onStop } = props;
			const params = typeof row["params"] === "object" && row["params"] !== null ? row["params"] : {};
			const [spec, setSpec] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [user, setUser] = (0, react.useState)(params);
			const [open, setOpen] = (0, react.useState)({});
			const rowResult = typeof row["result"] === "object" && row["result"] !== null ? row["result"] : null;
			const ownRunId = typeof rowResult?.run_id === "string" && rowResult.run_id !== "" ? rowResult.run_id : null;
			const ownUrl = typeof rowResult?.url === "string" && rowResult.url !== "" ? rowResult.url : null;
			const [meshUrl, setMeshUrl] = (0, react.useState)(ownUrl);
			(0, react.useEffect)(() => {
				setMeshUrl(ownUrl);
				if (ownUrl !== null || ownRunId === null) return;
				const ctrl = new AbortController();
				pollRunStageUrl(ownRunId, props.stageId, { onUrl: setMeshUrl }, ctrl.signal);
				return () => {
					ctrl.abort();
				};
			}, [
				ownRunId,
				ownUrl,
				props.stageId
			]);
			const { spec: liveSpec, error: specError } = useFormSpec((typeof user["model"] === "string" && user["model"] !== "" ? user["model"] : void 0) ?? declaration.model);
			(0, react.useEffect)(() => {
				if (specError !== null) {
					setError(specError);
					return;
				}
				if (liveSpec === null) return;
				setSpec(liveSpec);
				setUser((prev) => {
					const held = typeof prev["model"] === "string" && prev["model"] !== "" ? prev["model"] : void 0;
					return held !== void 0 ? {
						...params,
						model: held
					} : { ...params };
				});
				props.onSurface(liveSpec.size === "huge" ? "huge" : "");
			}, [liveSpec, specError]);
			const fieldByName = new Map((spec !== null ? fieldsOf(spec) : []).map((f) => [f.name, f]));
			const onEdit = (name, v) => {
				setUser((prev) => ({
					...prev,
					[name]: coerceFieldEdit(fieldByName.get(name), v)
				}));
			};
			const servedBase = typeof row["resolved"] === "object" && row["resolved"] !== null && !Array.isArray(row["resolved"]) ? row["resolved"] : void 0;
			const value = resolveValue(spec ?? { form: "" }, user, servedBase);
			const specRows = spec !== null ? fieldsOf(spec) : [];
			const { square: squareFor, wireMenu } = useSquareProvider(onEdit, { candidates: props.upstream.map((u) => ({
				id: u.id,
				label: u.title,
				url: u.url
			})) });
			const run = () => {
				if (spec === null) return;
				const patch = {};
				const userKeys = new Set(Object.keys(user));
				for (const k of userKeys) patch[k] = user[k];
				for (const k of Object.keys(params)) if (!userKeys.has(k)) patch[k] = null;
				onPatch(patch);
				onRun();
			};
			const runRef = (0, react.useRef)(run);
			runRef.current = run;
			(0, react.useEffect)(() => {
				props.bindRun?.(() => {
					runRef.current();
				});
			}, [props.bindRun]);
			return (0, react.createElement)("div", { className: studio_module_css_default.zoomDetail }, wireMenu, error !== null ? (0, react.createElement)("p", { className: studio_module_css_default.runError }, error) : null, spec === null ? (0, react.createElement)("p", { className: studio_module_css_default.groupNote }, "loading the declared knob surface…") : (0, react.createElement)(StudioShell, {
				params: (0, react.createElement)("div", { className: studio_module_css_default.studioRail }, (0, react.createElement)(ModelAxes, {
					spec,
					value,
					onSet: onEdit,
					onPick: (patch) => {
						setUser((prev) => ({
							...prev,
							...patch
						}));
					}
				}), declaration.expose.map((g) => (0, react.createElement)("section", {
					key: g,
					className: studio_module_css_default.studioGroup
				}, (0, react.createElement)("h4", { className: studio_module_css_default.studioGroupTitle }, g), (0, react.createElement)(StudioFields, {
					fields: rowsOfGroup(specRows, g),
					value,
					onEdit,
					square: squareFor
				}))), Object.entries(declaration.folds).map(([g, title]) => {
					const fs = rowsOfGroup(specRows, g);
					if (fs.length === 0) return null;
					const isOpen = open[g] === true;
					return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
						key: g,
						icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutlineRegular),
						title,
						open: isOpen,
						expandable: true,
						expandOnRowClick: true,
						onToggle: () => {
							setOpen((prev) => ({
								...prev,
								[g]: !prev[g]
							}));
						}
					}, (0, react.createElement)(StudioFields, {
						fields: fs,
						value,
						onEdit,
						square: squareFor
					}));
				})),
				preview: (0, react.createElement)(GlbStagePreview, {
					assets: meshUrl === null ? [] : [{
						id: "mesh",
						url: meshUrl,
						name: "mesh"
					}],
					label: declaration.model,
					emptyHint: "Run the card to see the mesh"
				})
			}));
		}
		/** The generic card's OWN atoms (SpecFieldRow renders one group's
		*  rows — the studio owns its group partition; zero atom copies).
		*  `value` is the RESOLVED map (resolveValue at the caller) — the
		*  rows show exactly what a run composes. */
		function StudioFields({ fields, value, onEdit, square }) {
			if (fields.length === 0) return (0, react.createElement)("p", { className: studio_module_css_default.groupNote }, "no declared fields");
			return (0, react.createElement)("div", null, fields.map((f) => (0, react.createElement)(SpecFieldRow, {
				key: f.name,
				f,
				value: value[f.name],
				onEdit,
				square: square(f)
			})));
		}
		//#endregion
		//#region ../../web-kit/formats/src/poserSkin.ts
		init_lib();
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
			if (cached) return cached;
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
			_meshCache.set(cacheKey, data);
			return data;
		}
		//#endregion
		//#region src/poser-figure.tsx
		/**
		* poser-figure.tsx — THE NATIVE FIGURE STAGE (stroke 90 + the live
		* follow-up, 2026-09-17: "these knobs do LITERALLY NOTHING — they
		* are supposed to CHANGE THE BODY"). The figure is not a
		* static portrait: it is SHAPED BY THE CARD'S LIVE PARAMS — the 11
		* identity coeffs and the non-zero local_changes ride the SAME
		* shared bind-mesh module the body studios use
		* (@melite/formats/poserSkin — ONE fetch surface, ONE per-signature
		* cache across the estate; the module's own header records the
		* dedup law: "the positional form is how the two pre-dedup copies
		* drifted"). The 2026-09-06 law stands: NEVER the low-poly GLB
		* export, always the /poser shaped bind mesh (18,056 verts, smooth
		* normals).
		*
		* SUBSTRATE LAW (verbatim, glb-stage.tsx): RAW three.js — imperative
		* scene in a useEffect, NO @react-three. three is a pure leaf
		* library; mounts like any imperative canvas lib.
		*
		* DRAG LAW: slider drags emit streams; the fetch debounces 120ms
		* and the module's cache (coeffs rounded 0.1, local changes 0.02)
		* collapses identical shapes. The SCENE mounts once per card; shape
		* commits SWAP THE GEOMETRY in place — no canvas flicker per drag.
		*/
		/** Pure: the resolved params → the identity coeff vector (the
		* identity group's fields, order-sorted, values from the resolved
		* map). null when the spec has no identity group OR any dim is not
		* a finite number — a PARTIAL vector would mis-shape the body
		* (every dim must ride or none do; the neutral GET is the
		* fallback). */
		function figureCoeffsOf(spec, value) {
			if (spec === null) return null;
			const fields = fieldsOf(spec).filter((f) => f.group === "identity").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
			if (fields.length === 0) return null;
			const coeffs = [];
			for (const f of fields) {
				const v = value[f.name];
				if (typeof v !== "number" || !Number.isFinite(v)) return null;
				coeffs.push(v);
			}
			return coeffs;
		}
		/** Pure: the resolved params → the local-changes map (the morph
		* group's fields, NON-ZERO finite values only — the sparse law:
		* absent = the engine's own 0). null when empty or no morph group
		* (the caller omits the arm; the fetch rides the neutral GET). */
		function figureLocalChangesOf(spec, value) {
			if (spec === null) return null;
			const out = {};
			for (const f of fieldsOf(spec)) {
				if (f.group !== "morph") continue;
				const v = value[f.name];
				if (typeof v === "number" && Number.isFinite(v) && v !== 0) out[f.name] = v;
			}
			return Object.keys(out).length > 0 ? out : null;
		}
		/** Pure: the door's JSON → a three geometry (unit-testable without
		* WebGL). Float32 positions, uint32 indices, computed smooth
		* normals (the door ships unindexed soup; the weld-free normals are
		* the poser's own smooth-shading intent — the design doc's word). */
		function figureGeometry(doc) {
			const g = new _melite_three_client_client.BufferGeometry();
			g.setAttribute("position", new _melite_three_client_client.Float32BufferAttribute(doc.vertices.flat(), 3));
			g.setIndex(doc.faces.flat());
			g.computeVertexNormals();
			return g;
		}
		/** The shape signature — identity coeffs + local changes as one
		* stable string (the effect's dep; a new shape re-fetches, an
		* identical one does not). */
		function figureShapeSig(identityCoeffs, localChanges) {
			return `${identityCoeffs !== void 0 && identityCoeffs !== null && identityCoeffs.length > 0 ? identityCoeffs.map((v) => v.toFixed(2)).join(",") : ""}|${localChanges !== void 0 && localChanges !== null ? Object.entries(localChanges).sort(([a], [b]) => a < b ? -1 : 1).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",") : ""}`;
		}
		/** The resting camera radius (mount default [2.2, 1.6, 2.6]) —
		* framing scales AGAINST this base, so framing 1.2 ≈ the resting
		* view and 3.0 pulls the camera back to the factor's own word. */
		const BASE_CAMERA_RADIUS = Math.hypot(2.2, 1.6, 2.6);
		/** Pure: the resolved params → the figure camera arms. The poser's
		* camera verbs are NAME-KEYED ('framing' = distance factor,
		* 'focal_length' = lens mm): a card that declares them drives the
		* figure viewport's camera LIVE (the studio's camera rail); a card
		* that doesn't (or non-finite values) omits both — the stage's own
		* resting camera stands. */
		function figureCameraOf(spec, value) {
			if (spec === null) return {};
			const out = {};
			const framing = value["framing"];
			if (typeof framing === "number" && Number.isFinite(framing) && framing > 0) out.framing = framing;
			const focal = value["focal_length"];
			if (typeof focal === "number" && Number.isFinite(focal) && focal > 0) out.focalLength = focal;
			return out;
		}
		/** THE NATIVE FIGURE — the /poser shaped bind mesh on the shared
		* stage core (same light rig + floor grid as the GLB stage, the
		* preview-port interaction law: ONE look across ports). Fetch
		* failures voice themselves in the DOM (the loud-errors law);
		* WebGL absence refuses loud, never a blank silent canvas. */
		function PoserFigureStage({ identityModel, identityCoeffs, localChanges, framing, focalLength, label }) {
			const canvasRef = (0, react.useRef)(null);
			const meshRef = (0, react.useRef)(null);
			const stageRef = (0, react.useRef)(null);
			const [doc, setDoc] = (0, react.useState)(null);
			const [failed, setFailed] = (0, react.useState)(null);
			const sig = figureShapeSig(identityCoeffs, localChanges);
			(0, react.useEffect)(() => {
				setDoc(null);
				setFailed(null);
			}, [identityModel]);
			(0, react.useEffect)(() => {
				let alive = true;
				const timer = setTimeout(() => {
					setFailed(null);
					fetchBindMesh({
						identityModel,
						...identityCoeffs !== void 0 && identityCoeffs !== null && identityCoeffs.length > 0 ? { identityCoeffs } : {},
						...localChanges !== void 0 && localChanges !== null && Object.keys(localChanges).length > 0 ? { localChanges } : {}
					}).then((d) => {
						if (alive) setDoc(d);
					}).catch((e) => {
						if (alive) setFailed(rejectionVoice(e));
					});
				}, 120);
				return () => {
					alive = false;
					clearTimeout(timer);
				};
			}, [identityModel, sig]);
			const hasDoc = doc !== null;
			(0, react.useEffect)(() => {
				if (!hasDoc) return;
				const canvas = canvasRef.current;
				const stage = mountStage3D(canvas, {
					fov: 40,
					camera: [
						2.2,
						1.6,
						2.6
					],
					target: [
						0,
						.8,
						0
					],
					toneMapping: _melite_three_client_client.NoToneMapping,
					onContextFailure: (m) => setFailed(m)
				});
				if (stage === null) return;
				stageRef.current = stage;
				const scene = stage.scene;
				scene.add(new _melite_three_client_client.HemisphereLight(16777215, 9079434, 1.4));
				const key = new _melite_three_client_client.DirectionalLight(16777215, 2.2);
				key.position.set(3, 5, 2);
				scene.add(key);
				const fill = new _melite_three_client_client.DirectionalLight(16777215, .6);
				fill.position.set(-3, 2, -2);
				scene.add(fill);
				const grid = new _melite_three_client_client.GridHelper(6, 24, 12303291, 14540253);
				const gridMat = grid.material;
				gridMat.transparent = true;
				gridMat.opacity = .35;
				scene.add(grid);
				const mesh = new _melite_three_client_client.Mesh(new _melite_three_client_client.BufferGeometry(), new _melite_three_client_client.MeshStandardMaterial({
					color: 13220008,
					roughness: .72,
					metalness: .04
				}));
				meshRef.current = mesh;
				scene.add(mesh);
				return () => {
					stageRef.current = null;
					meshRef.current = null;
					mesh.geometry.dispose();
					mesh.material.dispose();
					grid.geometry.dispose();
					stage.dispose();
				};
			}, [hasDoc]);
			(0, react.useEffect)(() => {
				const mesh = meshRef.current;
				if (mesh === null || doc === null) return;
				const next = figureGeometry(doc);
				mesh.geometry.dispose();
				mesh.geometry = next;
				autoFitToHeight(mesh);
			}, [doc]);
			(0, react.useEffect)(() => {
				const stage = stageRef.current;
				const camera = stage?.camera;
				if (camera === void 0) return;
				if (typeof framing === "number" && Number.isFinite(framing) && framing > 0) {
					const radius = camera.position.length();
					if (radius > 0) {
						camera.position.multiplyScalar(BASE_CAMERA_RADIUS * framing / radius);
						stage?.controls?.update();
					}
				}
				if (typeof focalLength === "number" && Number.isFinite(focalLength) && focalLength > 0) {
					camera.fov = 2 * Math.atan(12 / focalLength) * 180 / Math.PI;
					camera.updateProjectionMatrix();
				}
			}, [
				framing,
				focalLength,
				hasDoc
			]);
			return (0, react.createElement)("div", {
				className: preview_module_css_default.stagePreview,
				"data-viewport": label ?? "poser-figure"
			}, failed !== null && doc === null ? (0, react.createElement)("div", {
				className: preview_module_css_default.empty,
				"data-testid": "figure-failed"
			}, "figure failed: " + failed) : doc === null ? (0, react.createElement)("div", {
				className: preview_module_css_default.empty,
				"data-testid": "figure-loading"
			}, "loading figure…") : (0, react.createElement)("canvas", {
				ref: canvasRef,
				className: preview_module_css_default.stageCanvas,
				"data-testid": "stage-preview-figure"
			}), failed !== null && doc !== null ? (0, react.createElement)("div", {
				className: preview_module_css_default.figureError,
				"data-testid": "figure-failed"
			}, "figure failed: " + failed) : null);
		}
		//#endregion
		//#region ../../web-kit/contracts/src/stageView.ts
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
		/** The terminal word set, exported so a seat that needs to SHOW it
		*  (a poll's stop condition, a doc) reads the same list. Reconciled
		*  with the backend's RUN_STATUSES (catalog/src/runStatusContract.ts)
		*  2026-10-01: `interrupted` joined, and the file-era done words
		*  (`succeeded`, `success`) became terminal — a poller handed either
		*  previously ran to its ceiling. The card-plane words (done, cached,
		*  reused, skipped, stale) stay out: runs are never stamped with
		*  them; they describe artifacts, not run lifecycle. */
		const TERMINAL_RUN_STATUSES = /* @__PURE__ */ new Set([
			"completed",
			"failed",
			"stopped",
			"error",
			"unknown",
			"interrupted",
			"succeeded",
			"success"
		]);
		/** THE LIVE JUDGEMENT — the third question seats spelled privately
		*  ({running,queued} in one file, {running,queued,pending} in another,
		*  both omitting the wire's `live` and the estate's `stopping`): is
		*  this word a run still in motion? LIVE words are the KNOWN live
		*  vocabulary only — an unrecognized word is NOT live (spinning on a
		*  word we cannot read is a fake state; every private set this
		*  replaces already excluded strangers). Pollers that must keep
		*  watching unknown words read !isTerminalStatus, not this. */
		const LIVE_RUN_STATUSES = /* @__PURE__ */ new Set([
			"running",
			"live",
			"stopping",
			"queued",
			"pending"
		]);
		function isLiveRunStatus(value) {
			return !isTerminalStatus(value) && LIVE_RUN_STATUSES.has(value.toLowerCase());
		}
		//#endregion
		//#region src/pick-store.ts
		const pickCells = /* @__PURE__ */ new Map();
		const PICK_CELL_CAP = 64;
		/** The cell for a view identity, created on first use and
		*  refreshed to the newest insertion on every later read (LRU, not
		*  FIFO-of-birth); the oldest insertion is pruned at the cap. */
		function pickCellOf(id) {
			let cell = pickCells.get(id);
			if (cell === void 0) {
				if (pickCells.size >= PICK_CELL_CAP) for (const oldest of pickCells.keys()) {
					pickCells.delete(oldest);
					break;
				}
				cell = {
					key: null,
					listeners: /* @__PURE__ */ new Set()
				};
				pickCells.set(id, cell);
			} else {
				pickCells.delete(id);
				pickCells.set(id, cell);
			}
			return cell;
		}
		/** The cell's current key, and the write that notifies every
		*  subscriber of the cell. */
		function readPick(cell) {
			return cell.key;
		}
		/** Write a cell's key and invalidate its subscribers. */
		function writePick(cell, next) {
			cell.key = next;
			for (const l of cell.listeners) l();
		}
		/** The test seam: cells are module-shared BY DESIGN (identity-stable
		*  across mounts); walls reset between cases so no pick bleeds. */
		function resetPickCellsForTests() {
			pickCells.clear();
		}
		//#endregion
		//#region src/report-view.tsx
		/** The report status vocabulary → the DSH dot's own states (the
		*  semantic set StateDot ships: done/warning/error — no invented
		*  colors, no hand-rolled dots). TOTAL over the contract's union —
		*  the harvest rejects any other status before it reaches the atom. */
		const DOT_OF = {
			pass: "done",
			warn: "warning",
			fail: "error"
		};
		/** Render one report. Pure: every arm derived from the contract's
		*  own optionals (title absent → the name; chips/rows absent → no
		*  section). The card claims this by kind in the result row — the
		*  base owns the DEFAULT, a studio may claim over it (the
		*  claim-over-default law every preview kind rides). */
		function ReportView(props) {
			const { name, report } = props;
			const dot = DOT_OF[report.status];
			const chips = report.chips ?? [];
			const rows = Object.entries(report.rows ?? {});
			return (0, react.createElement)("section", {
				className: preview_module_css_default.reportCard,
				"data-testid": "report-card",
				"aria-label": "run report " + name
			}, (0, react.createElement)("header", { className: preview_module_css_default.reportHead }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
				state: dot,
				size: 8
			}), (0, react.createElement)("span", {
				className: preview_module_css_default.reportStatus,
				"data-report-status": report.status
			}, report.status.toUpperCase()), (0, react.createElement)("span", { className: preview_module_css_default.reportTitle }, report.title ?? name)), chips.length > 0 ? (0, react.createElement)("div", {
				className: preview_module_css_default.reportChips,
				"aria-label": "report chips"
			}, chips.map((c) => (0, react.createElement)("span", {
				key: c,
				className: preview_module_css_default.reportChip
			}, c))) : null, rows.length > 0 ? (0, react.createElement)("dl", {
				className: preview_module_css_default.reportRows,
				"aria-label": "report rows"
			}, rows.map(([k, v]) => (0, react.createElement)("div", {
				key: k,
				className: preview_module_css_default.reportRow
			}, (0, react.createElement)("dt", { className: preview_module_css_default.reportKey }, k), (0, react.createElement)("dd", { className: preview_module_css_default.reportVal }, String(v))))) : null);
		}
		//#endregion
		//#region \0dsh-css:packages/web/card-base/src/viewportChrome.module.css.mjs
		const css = ".BbYg0q_frame{border:1px solid var(--dsw-alias-border,#e2e4e9);background:var(--melite-stage-bg);border-radius:8px;flex:1;min-height:340px;position:relative;overflow:hidden}.BbYg0q_dockTopRight{position:absolute;top:8px;right:8px}.BbYg0q_dockTopLeft{position:absolute;top:8px;left:8px}.BbYg0q_dockBottomRight{position:absolute;bottom:8px;right:8px}.BbYg0q_dockBottomLeft{position:absolute;bottom:8px;left:8px}.BbYg0q_dockBottomCenter{position:absolute;bottom:8px;left:50%;transform:translate(-50%)}.BbYg0q_dockBottom{position:absolute;bottom:10px;left:10px;right:10px}.BbYg0q_dockFill{position:absolute;inset:0}.BbYg0q_dockEdgeRight{position:absolute;top:0;bottom:0;right:0}.BbYg0q_dockEdgeLeft{position:absolute;top:0;bottom:0;left:0}.BbYg0q_badge{pointer-events:none;border:1px solid var(--dsw-alias-border,#e2e4e9);background:color-mix(in srgb, var(--melite-stage-bg) 90%, transparent);backdrop-filter:blur(4px);border-radius:6px;width:112px;margin:0;overflow:hidden;box-shadow:0 8px 24px #00000059}.BbYg0q_badgeImg{object-fit:contain;width:100%;height:112px}.BbYg0q_badgeCaption{text-align:center;text-transform:uppercase;letter-spacing:.12em;color:var(--dsw-alias-label-tertiary);padding:2px 6px;font-size:8px;font-weight:500}";
		const tagId = "@melite/card-base/viewportChrome.module.css@2661997";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite/card-base";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var viewportChrome_module_css_default = {
			"badge": "BbYg0q_badge",
			"badgeCaption": "BbYg0q_badgeCaption",
			"badgeImg": "BbYg0q_badgeImg",
			"dockBottom": "BbYg0q_dockBottom",
			"dockBottomCenter": "BbYg0q_dockBottomCenter",
			"dockBottomLeft": "BbYg0q_dockBottomLeft",
			"dockBottomRight": "BbYg0q_dockBottomRight",
			"dockEdgeLeft": "BbYg0q_dockEdgeLeft",
			"dockEdgeRight": "BbYg0q_dockEdgeRight",
			"dockFill": "BbYg0q_dockFill",
			"dockTopLeft": "BbYg0q_dockTopLeft",
			"dockTopRight": "BbYg0q_dockTopRight",
			"frame": "BbYg0q_frame"
		};
		//#endregion
		//#region src/viewportChrome.tsx
		function ViewportFrame({ children, label, empty, className, style, ...props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "viewport-frame",
				"aria-label": label,
				className: cx(viewportChrome_module_css_default.frame, className),
				style: {
					"--melite-stage-bg": STAGE_BACKGROUND_DARK,
					...style
				},
				...props,
				children: [children, empty]
			});
		}
		const DOCK_CLASS = {
			"top-right": viewportChrome_module_css_default.dockTopRight,
			"top-left": viewportChrome_module_css_default.dockTopLeft,
			"bottom-right": viewportChrome_module_css_default.dockBottomRight,
			"bottom-left": viewportChrome_module_css_default.dockBottomLeft,
			"bottom-center": viewportChrome_module_css_default.dockBottomCenter,
			bottom: viewportChrome_module_css_default.dockBottom,
			fill: viewportChrome_module_css_default.dockFill,
			"edge-right": viewportChrome_module_css_default.dockEdgeRight,
			"edge-left": viewportChrome_module_css_default.dockEdgeLeft
		};
		function ViewportAnchor({ dock = "top-right", className, ...props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "viewport-anchor",
				"data-dock": dock,
				className: cx(DOCK_CLASS[dock], className),
				...props
			});
		}
		function ReferenceImageBadge({ url, label, className, ...props }) {
			if (!url) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("figure", {
				"data-slot": "reference-image-badge",
				"data-reference-image": true,
				"aria-label": label,
				className: cx(viewportChrome_module_css_default.badge, className),
				...props,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src: url,
					alt: label,
					className: viewportChrome_module_css_default.badgeImg,
					draggable: false
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("figcaption", {
					className: viewportChrome_module_css_default.badgeCaption,
					children: label
				})]
			});
		}
		//#endregion
		//#region src/preview.tsx
		/**
		* preview.tsx — THE SHARED PREVIEW COMPONENTS (the preview seam's
		* built-in claims, hour-9 2026-09-13 — the operator's law: "Where
		* the VIDEO PREVIEW and the IMAGE PREVIEW of other cards go in a
		* SLOT with SHARED DSH PRIMITIVES"). One preview per media kind,
		* DSH-pure: native media elements on card-base chrome, DSW tokens
		* BARE (no fallbacks — the hour-8 name law), zero bespoke islands.
		*
		* These are the DEFAULTS the pattern prescribes (the ui-tool law:
		* "central default views"); a card claims its kind's preview only
		* to specialize — the h3 studio rides the shared VIDEO preview for
		* its hero, exactly as an image-gen card rides the IMAGE one.
		*/
		/** THE PICK CELLS (DSH's client state law): the view subscribes to
		*  the identity-keyed mirror the pick-store module owns; a
		*  presentation component never owns store-lifetime state. */
		function usePickCell(id) {
			const cell = pickCellOf(id);
			const key = (0, react.useSyncExternalStore)((onChange) => {
				cell.listeners.add(onChange);
				return () => {
					cell.listeners.delete(onChange);
				};
			}, () => readPick(cell));
			const set = (next) => {
				writePick(cell, next);
			};
			return [key, set];
		}
		/** THE HISTORY HERO (stroke 40 + the output-component stroke): one
		* hook, three faces — the hero artifact, the REST of whatever set
		* the hero belongs to (the current run's other outputs, or a picked
		* history entry's other outputs — a multi-output card shows its
		* full set either way, never the current row under an old hero),
		* and THE STALENESS FACT (an explicitly picked entry is NOT the
		* current generation — the badge law; the between-runs fallback
		* hero gets NO badge: with no current run, the newest archive is
		* the closest thing to current, not a stale one). */
		/** The view-identity cell id (stage + run, else urls) — ONE law,
		* exported so a preview's specialized pick cells (the video face's
		* current-set pick) derive from the SAME identity, never re-derive. */
		function previewCellIdOf(props) {
			return props.runId !== void 0 && props.runId !== "" ? `${props.stageId}\u0000run:${props.runId}` : `${props.stageId}\u0000${props.artifacts.map((a) => a.url).join("|")}`;
		}
		function useHistoryHero(props, opts) {
			const flat = props.artifacts.length > 0 ? props.artifacts : (props.history ?? []).flat();
			const history = props.history ?? [];
			const keyOf = (entry) => entry.map((a) => a.url).join("|");
			const [pickedKey, setPickedKey] = usePickCell(previewCellIdOf(props));
			const picked = pickedKey === null ? -1 : history.findIndex((e) => keyOf(e) === pickedKey);
			const promote = (i) => {
				const k = keyOf(history[i]);
				setPickedKey(k !== pickedKey ? k : null);
			};
			const returnToCurrent = () => {
				setPickedKey(null);
			};
			const entry = picked >= 0 && history[picked] !== void 0 && history[picked].length > 0 ? history[picked] : null;
			const source = entry ?? flat;
			const currentSet = props.artifacts.length > 0 ? props.artifacts : history[0];
			const viewingHistory = entry !== null && (currentSet === void 0 || keyOf(entry) !== keyOf(currentSet));
			const heroIdx = opts?.heroIndex !== void 0 && source.length > 0 ? Math.min(Math.max(0, opts.heroIndex(source)), source.length - 1) : 0;
			return {
				hero: source[heroIdx],
				rest: [...source.slice(0, heroIdx), ...source.slice(heroIdx + 1)].slice(0, 12),
				viewingHistory,
				note: !viewingHistory ? void 0 : (props.historyNotes ?? [])[picked] || void 0,
				picked: entry !== null ? picked : -1,
				promote,
				returnToCurrent
			};
		}
		/** THE NOT-CURRENT BADGE (the output-component stroke — the
		* operator's law: "a tag or indicator to show they are not
		* current"). Rendered while an explicit history pick owns the hero;
		* when the entry's params snapshot differs from the live params the
		* chip names the keys (shared by every presenter). */
		/** THE NOT-CURRENT BADGE (the output-component stroke — the
		* operator's law: "a tag or indicator to show they are not
		* current") — AND THE RETURN CONTROL (the toggle law, 2026-09-16):
		* the badge is the visible way back to the current generation;
		* clicking it restores the current hero. */
		function StaleBadge(props) {
			return (0, react.createElement)("button", {
				type: "button",
				className: preview_module_css_default.staleBadge,
				"data-testid": "history-stale-badge",
				onClick: (e) => {
					e.stopPropagation();
					props.onReturn();
				},
				title: "Return to the current generation"
			}, "Not current — earlier generation", props.note === void 0 ? null : ` · differs: ${props.note}`, " · Return to current");
		}
		/** ONE HISTORY THUMB with an HONEST DEAD FACE (the operator's
		*  catch, 2026-09-21: "There's no sideways error"): an archived
		*  artifact whose file left the disk rendered the browser's silent
		*  broken-image glyph — no error, no name, nothing. The strip is
		*  the sideways row; a dead entry shows its NAME and a missing
		*  marker, never a silent void.
		*  THE KIND FACE (the operator's catches, 2026-10-08): (1) audio
		*  history tiles read 'gone' — an <img> decodes ONLY images, so a
		*  non-image url seated in an <img> fires onError on mount and
		*  every audio/video/mesh tile wore the FALSE dead face ("it says
		*  gone instead historical view under the preview"). (2) the first
		*  cut put the artifact NAME in the chip — "a long rectangle with
		*  a file name" (music/SaveAudioAdvanced.0_music_00002.mp3)
		*  instead of something compact. THE FACE: the thumb rides the
		*  owner's DECLARED kind (the primary-output law — the same kind
		*  that picked this presenter): image decodes as itself (the dead
		*  face stays its honesty); every other kind renders a COMPACT
		*  48×48 glyph square — the image thumb row's own rhythm — with
		*  the full artifact name on the TILE BUTTON's tooltip, never in
		*  the face. No decode to fail, no false 'gone', no long box. */
		function HistoryThumb(props) {
			const [dead, setDead] = (0, react.useState)(false);
			if (props.kind !== "image") {
				const Glyph = props.kind === "audio" ? AudioLines : props.kind === "video" ? Film : Box;
				return (0, react.createElement)(Glyph, {
					className: preview_module_css_default.thumbFace,
					"data-testid": `history-thumb-${props.kind}`
				});
			}
			if (dead) return (0, react.createElement)("span", {
				className: cn(preview_module_css_default.thumb, preview_module_css_default.thumbDead),
				"data-testid": "history-thumb-missing",
				title: `${props.a.name} — the artifact file is gone`
			}, "gone");
			return (0, react.createElement)("img", {
				key: props.a.url,
				className: preview_module_css_default.thumb,
				src: props.a.url,
				alt: props.a.name,
				loading: "lazy",
				onError: () => {
					setDead(true);
				}
			});
		}
		function HistoryStrip(props, promote, testid, picked) {
			if (props.historyStrip === false) return null;
			const history = props.history ?? [];
			if (history.length === 0) return null;
			const notes = props.historyNotes ?? [];
			return (0, react.createElement)("div", {
				className: preview_module_css_default.historyBlock,
				"data-testid": testid
			}, (0, react.createElement)("span", { className: preview_module_css_default.historyTitle }, "History"), (0, react.createElement)("div", { className: preview_module_css_default.thumbRow }, history.map((entry, i) => (0, react.createElement)("button", {
				key: String(i) + "|" + String(entry[0]?.url ?? ""),
				type: "button",
				className: cn(preview_module_css_default.historyTile, i === picked ? preview_module_css_default.historyTileActive : void 0),
				"aria-pressed": i === picked,
				title: entry.map((a) => a.name).join(", ") + (notes[i] ? ` (differs: ${notes[i]})` : "") + (i === picked ? " (viewing — click to return to current)" : ""),
				onClick: (e) => {
					e.stopPropagation();
					promote(i);
				}
			}, entry.slice(0, 1).map((a, j) => (0, react.createElement)(HistoryThumb, {
				key: String(i) + "|" + String(j) + "|" + a.url,
				a,
				kind: props.kind
			}))))));
		}
		/** THE SEAT-SAFE NEW-TAB LINK (the seat-bubble law, ledger #45):
		*  rest links ride INSIDE the walk-opening drilldown seat — the
		*  link consumes its own click so opening the tab never also opens
		*  the walk (the thumb/badge fix's sibling; one wrapper, both
		*  presenters — the platform owns the link, we own the wrap). */
		function seatSafeLink(a, i = 0) {
			return (0, react.createElement)("a", {
				key: String(i) + "|" + a.url + a.name,
				className: preview_module_css_default.stripLink,
				href: a.url,
				target: "_blank",
				rel: "noreferrer",
				title: a.name,
				onClick: (e) => {
					e.stopPropagation();
				}
			}, a.name);
		}
		/** THE VIDEO PREVIEW — one hero film, one native player (the kit's
		*  FilmPlayer law: native <video controls>; no library, no kit). The
		*  hero is THE FILM (the composed artifact — a film run's artifacts
		*  arrive windows-first, the film last, so the named film wins the
		*  seat; any other video card keeps the first). The set's other
		*  clips render as PLAYABLE THUMBS in the strip (the operator's
		*  catch b, 2026-09-22: "the preview only shows one of the three
		*  clips" — a text link is not a preview): click a thumb to promote
		*  it into the hero, click it again to return (the toggle law);
		*  the name still opens the file raw in a new tab. The set is the
		*  CURRENT run's (or the picked history entry's — never mixed).
		*  Honest empty state while no artifact has landed. */
		function VideoStagePreview(props) {
			const { hero: defaultHero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props, { heroIndex: (src) => {
				const i = src.findIndex((a) => /(^|[^a-z])film([^a-z]|$)/i.test(a.name));
				return i >= 0 ? i : 0;
			} });
			const [faceUrl, setFaceUrl] = usePickCell(`${previewCellIdOf(props)}\u0000face`);
			const hero = (faceUrl !== null && defaultHero !== void 0 && (defaultHero.url === faceUrl || rest.some((a) => a.url === faceUrl)) ? defaultHero.url === faceUrl ? defaultHero : rest.find((a) => a.url === faceUrl) : void 0) ?? defaultHero;
			const others = defaultHero !== void 0 ? [defaultHero, ...rest] : [];
			return (0, react.createElement)("div", {
				className: preview_module_css_default.stagePreview,
				"data-testid": "stage-preview-video"
			}, viewingHistory ? (0, react.createElement)(StaleBadge, {
				note,
				onReturn: returnToCurrent
			}) : null, hero === void 0 ? (0, react.createElement)("div", { className: preview_module_css_default.empty }, isLiveRunStatus(props.runStatus) ? "rendering… the film lands here" : "No render yet — run lands the film here") : (0, react.createElement)("video", {
				className: preview_module_css_default.hero,
				controls: true,
				playsInline: true,
				key: hero.url,
				src: hero.url,
				"data-testid": "stage-preview-video-hero"
			}), others.length > 0 ? (0, react.createElement)("div", {
				className: preview_module_css_default.strip,
				"data-testid": "stage-preview-video-strip"
			}, others.map((a) => (0, react.createElement)("button", {
				key: a.url,
				type: "button",
				className: cn(preview_module_css_default.thumbVideoBtn, a.url === faceUrl ? preview_module_css_default.thumbVideoActive : void 0),
				"aria-pressed": a.url === faceUrl,
				title: a.name + (a.url === faceUrl ? " (viewing — click to return to the film)" : " — click to preview"),
				onClick: (e) => {
					e.stopPropagation();
					setFaceUrl(a.url !== faceUrl ? a.url : null);
				}
			}, (0, react.createElement)("video", {
				className: preview_module_css_default.thumbVideo,
				src: a.url,
				muted: true,
				playsInline: true,
				preload: "metadata"
			}), (0, react.createElement)("span", { className: preview_module_css_default.thumbVideoName }, a.name)))) : null, HistoryStrip(props, promote, "stage-output-history", picked));
		}
		/** THE IMAGE PREVIEW — the latest render hero (native <img>), the
		*  active set's thumbs beneath (the CURRENT run's gallery, or the
		*  picked history entry's full set — a multi-output card never shows
		*  the current row under an old hero), then THE OUTPUT HISTORY
		*  (stroke 40): the stage's previous unique outputs, newest first —
		*  click one to view it in the hero. Same chrome, same law. */
		function ImageStagePreview(props) {
			const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
			const [loadedUrl, setLoadedUrl] = (0, react.useState)(null);
			const heroUrl = hero === void 0 ? null : hero.url;
			const seatUrl = loadedUrl ?? heroUrl;
			const incoming = heroUrl !== null && seatUrl !== heroUrl ? heroUrl : null;
			return (0, react.createElement)("div", {
				className: cn(preview_module_css_default.stagePreview),
				"data-testid": "stage-preview-image"
			}, viewingHistory ? (0, react.createElement)(StaleBadge, {
				note,
				onReturn: returnToCurrent
			}) : null, seatUrl !== null ? (0, react.createElement)("img", {
				className: preview_module_css_default.heroImg,
				key: seatUrl,
				src: seatUrl,
				alt: hero === void 0 ? "" : hero.name,
				"data-testid": "stage-preview-image-hero",
				onLoad: () => {
					setLoadedUrl(seatUrl);
				}
			}) : (0, react.createElement)("div", { className: preview_module_css_default.empty }, isLiveRunStatus(props.runStatus) ? "rendering… the image lands here" : "No render yet — run lands the image here"), incoming !== null ? (0, react.createElement)("img", {
				key: "incoming-" + incoming,
				className: preview_module_css_default.heroIncoming,
				src: incoming,
				alt: "",
				"data-testid": "stage-preview-image-hero",
				onLoad: () => {
					setLoadedUrl(incoming);
				}
			}) : null, rest.length > 0 ? (0, react.createElement)("div", { className: preview_module_css_default.thumbRow }, rest.map((a, i) => (0, react.createElement)("img", {
				key: String(i) + "|" + a.url,
				className: preview_module_css_default.thumb,
				src: a.url,
				alt: a.name,
				loading: "lazy"
			}))) : null, HistoryStrip(props, promote, "stage-output-history", picked));
		}
		/** THE AUDIO PREVIEW — one hero track, one native player (the same
		*  law as the video preview: native <audio controls>; no library).
		*  The active set's named clips follow in the strip row. */
		function AudioStagePreview(props) {
			const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
			return (0, react.createElement)("div", {
				className: preview_module_css_default.stagePreview,
				"data-testid": "stage-preview-audio"
			}, viewingHistory ? (0, react.createElement)(StaleBadge, {
				note,
				onReturn: returnToCurrent
			}) : null, hero === void 0 ? (0, react.createElement)("div", { className: preview_module_css_default.empty }, isLiveRunStatus(props.runStatus) ? "rendering… the track lands here" : "No render yet — run lands the track here") : (0, react.createElement)("audio", {
				className: preview_module_css_default.heroAudio,
				controls: true,
				key: hero.url,
				src: hero.url,
				"data-testid": "stage-preview-audio-hero"
			}), rest.length > 0 ? (0, react.createElement)("div", { className: preview_module_css_default.strip }, rest.map(seatSafeLink)) : null, HistoryStrip(props, promote, "stage-output-history", picked));
		}
		/** THE MESH PREVIEW — the seam's adapter onto the raw-three
		*  multi-asset stage (GlbStagePreview, the substrate law: NO
		*  @react-three in any client bundle). The ACTIVE set becomes
		*  stage assets (the current run's, or a picked history entry's —
		*  mesh gains the full history law every other kind already had);
		*  the empty hint honors the live-run flag. THE LIVE FIGURE
		*  (stroke 90): a card-declared preview.figure replaces the empty
		*  tombstone with the native figure (the /poser bind mesh) — the
		*  studio-viewport capability on the form card; run outputs still
		*  take the stage the moment they exist. */
		function MeshStagePreview(props) {
			const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
			const active = hero === void 0 ? [] : [hero, ...rest];
			return (0, react.createElement)("div", {
				className: preview_module_css_default.stagePreview,
				"data-testid": "stage-preview-mesh"
			}, viewingHistory ? (0, react.createElement)(StaleBadge, {
				note,
				onReturn: returnToCurrent
			}) : null, active.length > 0 ? (0, react.createElement)(GlbStagePreview, {
				assets: active.map((a, i) => ({
					id: `${props.stageId}:${a.name || i}`,
					url: a.url,
					name: a.name
				})),
				emptyHint: isLiveRunStatus(props.runStatus) ? "rendering… the mesh lands here" : "No render yet — run lands the mesh here"
			}) : props.figure !== void 0 ? (0, react.createElement)(PoserFigureStage, {
				identityModel: props.figure.identityModel,
				identityCoeffs: props.figure.identityCoeffs,
				localChanges: props.figure.localChanges,
				framing: props.figure.framing,
				focalLength: props.figure.focalLength,
				label: `poser-figure:${props.stageId}`
			}) : (0, react.createElement)(GlbStagePreview, {
				assets: [],
				emptyHint: isLiveRunStatus(props.runStatus) ? "rendering… the mesh lands here" : "No render yet — run lands the mesh here"
			}), HistoryStrip(props, promote, "stage-output-history", picked));
		}
		//#endregion
		//#region src/cards-address.ts
		/** The run address: `dsh-resource://cards/run/<runId>` — the wand's
		* restore target. The runId rides encodeURIComponent: a run id with
		* spaces or slashes stays one path segment. */
		function cardsRunAddress(runId) {
			return "dsh-resource://cards/run/" + encodeURIComponent(runId);
		}
		//#endregion
		//#region src/media-library.ts
		/**
		* media-library.ts — the runs-tree library over the mounted media
		* namespace (stroke 81b: moved beside the bind it rides).
		*
		* The picker's injected source (SquareWire.loadMedia): kind-filtered
		* media/list rows, shaped to {url, name}. Every surface — the bench
		* drill, the mod leaf, the studio SourceRows — injects THIS function
		* (or a test fake); the base form carries no transport of its own.
		*/
		/** media/list — the runs-tree library (the picker's injected
		*  source; kind-filtered). */
		async function fetchMediaLibrary(kind, signal) {
			const v = await unwrapRemote(estateRemote().media.list(kind, signal), "media/list");
			return Array.isArray(v.items) ? v.items.filter((it) => typeof it?.url === "string" && typeof it?.name === "string") : [];
		}
		//#endregion
		//#region src/client/index.ts
		const name = "@melite/card-base";
		const inject = [];
		/** The row's one client-side effect: wire the contract-toast seam.
		*
		*  ORDERING (2026-10-18): every contractToast fire is event-time —
		*  catalog fetch resolution, violation reports, run-status channel
		*  pushes (catalogContractStore actions, runStatusContractStore
		*  channel callbacks) — never a module eval. The boot loop
		*  (loader.import → unwrapExports → registry.plugin → this apply)
		*  runs synchronously, so a sink wired here is in place before the
		*  event loop can run any fire: render-time reporters never observe
		*  an unwired seam. The row is the ONE host that outlives every
		*  reporting surface (the /client door law) — it never disposes in
		*  the browser, so the wire carries no unwinding. */
		function apply(ctx) {
			ctx.effect(() => {
				setContractToastSink$1((type, message, action) => {
					useToastStore.getState().addToast(type, message, action);
				});
				return () => {};
			});
		}
		//#endregion
		exports.ASSET_DRAG_MIME = ASSET_DRAG_MIME;
		exports.AlertTriangle = AlertTriangle;
		exports.AudioLines = AudioLines;
		exports.AudioStagePreview = AudioStagePreview;
		exports.Box = Box;
		exports.Brush = Brush;
		exports.CAPABILITY_DRAG_MIME = CAPABILITY_DRAG_MIME;
		exports.CARD_SLOTS = CARD_SLOTS;
		exports.CAS_CONFLICT_CODE = CAS_CONFLICT_CODE;
		exports.Camera = Camera;
		exports.CardForm = CardForm;
		exports.Check = Check;
		exports.ChevronDown = ChevronDown;
		exports.ChevronLeft = ChevronLeft;
		exports.ChevronRight = ChevronRight;
		exports.Clapperboard = Clapperboard;
		exports.ControlRow = ControlRow;
		exports.Copy = Copy;
		exports.Crop = Crop;
		exports.DEFAULT_SQUARE_ACCEPT = DEFAULT_SQUARE_ACCEPT;
		exports.DeclarativeStudio = DeclarativeStudio;
		exports.Dices = Dices;
		exports.Download = Download;
		exports.EmptyState = EmptyState;
		exports.EstateRefusedError = EstateRefusedError;
		exports.Expand = Expand;
		exports.Eye = Eye;
		exports.EyeAlt = EyeAlt;
		exports.EyeOff = EyeOff;
		exports.FileBox = FileBox;
		exports.Film = Film;
		exports.Focus = Focus;
		exports.Frame = Frame;
		exports.GlbStagePreview = GlbStagePreview;
		exports.Hand = Hand;
		exports.Image = Image;
		exports.ImagePlus = ImagePlus;
		exports.ImageStagePreview = ImageStagePreview;
		exports.Info = Info;
		exports.InputSquare = InputSquare;
		exports.Layers = Layers;
		exports.Link2 = Link2;
		exports.Loader2 = Loader2;
		exports.MESH_SQUARE_ACCEPT = MESH_SQUARE_ACCEPT;
		exports.Maximize = Maximize;
		exports.MeshStagePreview = MeshStagePreview;
		exports.Minimize2 = Minimize2;
		exports.ModelAxes = ModelAxes;
		exports.ModifiersSection = ModifiersSection;
		exports.Move = Move;
		exports.OverlayKnob = OverlayKnob;
		exports.PackPrompt = PackPrompt;
		exports.Palette = Palette;
		exports.PaneHeader = PaneHeader;
		exports.PaneShell = PaneShell;
		exports.Pause = Pause;
		exports.PersonStanding = PersonStanding;
		exports.Play = Play;
		exports.PlayAlt = PlayAlt;
		exports.Plus = Plus;
		exports.PoserFigureStage = PoserFigureStage;
		exports.RailSection = RailSection;
		exports.RecipePills = RecipePills;
		exports.ReferenceImageBadge = ReferenceImageBadge;
		exports.RefreshCw = RefreshCw;
		exports.ReportView = ReportView;
		exports.RotateCcw = RotateCcw;
		exports.RotateCw = RotateCw;
		exports.STAGE_BACKGROUND_DARK = STAGE_BACKGROUND_DARK;
		exports.STAGE_BACKGROUND_LIGHT = STAGE_BACKGROUND_LIGHT;
		exports.SectionLabel = SectionLabel;
		exports.SeedDice = SeedDice;
		exports.Skeleton = Skeleton;
		exports.SourceRow = SourceRow;
		exports.SpecAtom = SpecAtom;
		exports.SpecFieldRow = SpecFieldRow;
		exports.SpecPanel = SpecPanel;
		exports.SpecSliderAtom = SpecSliderAtom;
		exports.Square = Square;
		exports.StudioRail = StudioRail;
		exports.StudioShell = StudioShell;
		exports.StudioShellErrorLine = StudioShellErrorLine;
		exports.TURNTABLE_SPEED = TURNTABLE_SPEED;
		exports.Target = Target;
		exports.Tip = Tip;
		exports.ToastViewport = ToastViewport;
		exports.TriStateAtom = TriStateAtom;
		exports.TriangleAlert = TriangleAlert;
		exports.Type = Type;
		exports.Upload = Upload;
		exports.User = User;
		exports.VideoStagePreview = VideoStagePreview;
		exports.ViewportAnchor = ViewportAnchor;
		exports.ViewportFrame = ViewportFrame;
		exports.Volume2 = Volume2;
		exports.VolumeX = VolumeX;
		exports.WIRE_CARD_COMPOSE_INCOMPLETE = WIRE_CARD_COMPOSE_INCOMPLETE;
		exports.WirePickerModal = WirePickerModal;
		exports.X = X;
		exports.acquireViewport = acquireViewport;
		exports.activeRecipeId = activeRecipeId;
		exports.activeRowId = activeRowId;
		exports.activeVariantId = activeVariantId;
		exports.apply = apply;
		exports.applyWeightsHeat = applyWeightsHeat;
		exports.applyWireframe = applyWireframe;
		exports.armEstateRemoteLazyBind = armEstateRemoteLazyBind;
		exports.assertFormSpecDoc = assertFormSpecDoc;
		exports.autoFitToHeight = autoFitToHeight;
		exports.axisGroups = axisGroups;
		exports.axisKey = axisKey;
		exports.axisPickPatch = axisPickPatch;
		exports.axisStampOf = axisStampOf;
		exports.axisUnset = axisUnset;
		exports.bindEstateRemote = bindEstateRemote;
		exports.bindEstateRemoteFromRemote = bindEstateRemoteFromRemote;
		exports.cardsRunAddress = cardsRunAddress;
		exports.cn = cn;
		exports.coerceFieldEdit = coerceFieldEdit;
		exports.composeCandidateDoc = composeCandidateDoc;
		exports.composeUnset = composeUnset;
		exports.composeValidate = composeValidate;
		exports.composingRows = composingRows;
		exports.cx = cx;
		exports.defineShellDeclaration = defineShellDeclaration;
		exports.defineStageViewRegistration = defineStageViewRegistration;
		exports.defineStudioDeclaration = defineStudioDeclaration;
		exports.entryFieldsOfEnvelope = entryFieldsOfEnvelope;
		exports.estateRemote = estateRemote;
		exports.fetchCardCatalog = fetchCardCatalog;
		exports.fetchFormSpec = fetchFormSpec;
		exports.fetchFormsTable = fetchFormsTable;
		exports.fetchLatestRunForDraft = fetchLatestRunForDraft;
		exports.fetchListRow = fetchListRow;
		exports.fetchMediaLibrary = fetchMediaLibrary;
		exports.fetchRunStageUrl = fetchRunStageUrl;
		exports.fetchRunStatus = fetchRunStatus;
		exports.fetchRunTerminal = fetchRunTerminal;
		exports.fieldOnLane = fieldOnLane;
		exports.fieldVisible = fieldVisible;
		exports.fieldsOf = fieldsOf;
		exports.fieldsOfEnvelope = fieldsOfEnvelope;
		exports.figureCameraOf = figureCameraOf;
		exports.figureCoeffsOf = figureCoeffsOf;
		exports.figureGeometry = figureGeometry;
		exports.figureLocalChangesOf = figureLocalChangesOf;
		exports.figureShapeSig = figureShapeSig;
		exports.getSnapshot = getSnapshot;
		exports.groupFields = groupFields;
		exports.heatColor = heatColor;
		exports.inject = inject;
		exports.inputEdgeOf = inputEdgeOf;
		exports.isCasConflict = isCasConflict;
		exports.isEstateRefusal = isEstateRefusal;
		exports.isHybridKind = isHybridKind;
		exports.isImageUrl = isImageUrl;
		exports.isMalformedCapabilityDrop = isMalformedCapabilityDrop;
		exports.isMeshUrl = isMeshUrl;
		exports.isOptionKind = isOptionKind;
		exports.kindScalarFieldsOfEnvelope = kindScalarFieldsOfEnvelope;
		exports.laneBoundsFor = laneBoundsFor;
		exports.laneRelationsFor = laneRelationsFor;
		exports.laneSurfaceFor = laneSurfaceFor;
		exports.laneViolations = laneViolations;
		exports.makeLabelSprite = makeLabelSprite;
		exports.manageRemote = manageRemote;
		exports.mintViewportId = mintViewportId;
		exports.modOwnedFields = modOwnedFields;
		exports.modelChoices = modelChoices;
		exports.modelSwitchPatch = modelSwitchPatch;
		exports.mountStage3D = mountStage3D;
		exports.name = name;
		exports.offeredVariantOf = offeredVariantOf;
		exports.optionKeyOf = optionKeyOf;
		exports.parseAssetDrop = parseAssetDrop;
		exports.parseCapabilityDrop = parseCapabilityDrop;
		exports.parseNumericInput = parseNumericInput;
		exports.pollRunStageUrl = pollRunStageUrl;
		exports.postManageAction = postManageAction;
		exports.previewCellIdOf = previewCellIdOf;
		exports.probeRunGone = probeRunGone;
		exports.quantRowsFor = quantRowsFor;
		exports.readAsDataURL = readAsDataURL;
		exports.rejectionVoice = rejectionVoice;
		exports.releaseViewport = releaseViewport;
		exports.removeToast = removeToast;
		exports.resetPickCellsForTests = resetPickCellsForTests;
		exports.resolveFamilyKey = resolveFamilyKey;
		exports.resolveValue = resolveValue;
		exports.resolveValueLayered = resolveValueLayered;
		exports.rowsFor = rowsFor;
		exports.scalarKeyOf = scalarKeyOf;
		exports.schemaEnvelope = schemaEnvelope;
		exports.seedAxisValues = seedAxisValues;
		exports.seedUser = seedUser;
		exports.skeletonHelperFor = skeletonHelperFor;
		exports.slotLabelOf = slotLabelOf;
		exports.specDefaults = specDefaults;
		exports.startCardRun = startCardRun;
		exports.startFlowInlineRun = startFlowInlineRun;
		exports.stopRun = stopRun;
		exports.subscribe = subscribe;
		exports.titleCaseId = titleCaseId;
		exports.toastHoldMs = toastHoldMs;
		exports.turntableTick = turntableTick;
		exports.unbindEstateRemote = unbindEstateRemote;
		exports.unsetFaceLabel = unsetFaceLabel;
		exports.unsetFaceTip = unsetFaceTip;
		exports.unwrapRemote = unwrapRemote;
		exports.uploadInputFile = uploadInputFile;
		exports.useFormSpec = useFormSpec;
		exports.useResolvedForm = useResolvedForm;
		exports.useSquareProvider = useSquareProvider;
		exports.useToastStore = useToastStore;
		exports.useViewportIds = useViewportIds;
		exports.variantGroupsContract = variantGroupsContract;
		exports.variantRows = variantRows;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
