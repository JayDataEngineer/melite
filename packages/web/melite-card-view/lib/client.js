window.__ModuleLoader__.load({
	id: "@melite-plugin/dsh-card-view",
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
		let _melite_card_base_client = require("@melite/card-base/client");
		require("@deepseek-ai/cordis");
		let _deepseek_ai_dsh_api_gateway_client = require("@deepseek-ai/dsh-api-gateway/client");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _melite_three_client_client = require("@melite/three-client/client");
		_melite_three_client_client = __toESM(_melite_three_client_client, 1);
		//#region ../../../zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function joinValues(array, separator = "|") {
			return array.map((val) => stringifyPrimitive(val)).join(separator);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = 4 * Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) {
				const descriptors = Object.getOwnPropertyDescriptors(def);
				Object.assign(mergedDescriptors, descriptors);
			}
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify$2(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function stringifyPrimitive(value) {
			if (typeof value === "bigint") return value.toString() + "n";
			if (typeof value === "string") return `"${value}"`;
			return `${value}`;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = /*@__PURE__*/ (() => ({
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		}))();
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key of Reflect.ownKeys(mask)) {
						if (!Object.prototype.hasOwnProperty.call(currDef.shape, key)) throw new Error(`Unrecognized key: "${String(key)}"`);
						if (!mask[key]) continue;
						assignProp(newShape, key, currDef.shape[key]);
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key of Reflect.ownKeys(mask)) {
						if (!Object.prototype.hasOwnProperty.call(currDef.shape, key)) throw new Error(`Unrecognized key: "${String(key)}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key of Reflect.ownKeys(shape)) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (!b?._zod?.def) throw new Error("Invalid input to merge: expected an object schema. To merge a plain shape, use `.extend()`.");
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask, name = "partial") {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(`.${name}() cannot be used on object schemas containing refinements`);
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key of Reflect.ownKeys(mask)) {
						if (!Object.prototype.hasOwnProperty.call(oldShape, key)) throw new Error(`Unrecognized key: "${String(key)}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key of Reflect.ownKeys(oldShape)) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key of Reflect.ownKeys(mask)) {
					if (!Object.prototype.hasOwnProperty.call(shape, key)) throw new Error(`Unrecognized key: "${String(key)}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key of Reflect.ownKeys(oldShape)) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function attachSchema(issues, start, inst) {
			var _a;
			for (let i = start; i < issues.length; i++) (_a = issues[i]).schema ?? (_a.schema = inst);
		}
		function finalizeIssue(iss, ctx, config) {
			var _a;
			const traits = iss.inst?._zod?.traits;
			if (traits?.has("$ZodType")) {
				if (traits.has("$ZodCheck")) (_a = iss).schema ?? (_a.schema = iss.inst);
				else iss.schema = iss.inst;
			}
			const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, schema: _schema, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		const highSurrogate = /[\uD800-\uDBFF]/;
		function codePointLength(str) {
			const units = str.length;
			if (!highSurrogate.test(str)) return units;
			let count = units;
			for (let i = 0; i < units - 1; i++) if ((str.charCodeAt(i) & 64512) === 55296 && (str.charCodeAt(i + 1) & 64512) === 56320) {
				count--;
				i++;
			}
			return count;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function parsedType(data) {
			const t = typeof data;
			switch (t) {
				case "number": return Number.isNaN(data) ? "nan" : "number";
				case "object": {
					if (data === null) return "null";
					if (Array.isArray(data)) return "array";
					const obj = data;
					if (obj && Object.getPrototypeOf(obj) !== Object.prototype && "constructor" in obj && obj.constructor) return obj.constructor.name;
				}
			}
			return t;
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		/**
		* Installs a trait's members on its prototype. Each value builds that member for the instance on first read; the built value shadows the accessor as an own property, so a detached `const { parse } = schema` keeps working.
		*
		* Call this from a `proto` initializer, which runs once per prototype — never per instance.
		*/
		function members(proto, table) {
			for (const key in table) {
				const desc = Object.getOwnPropertyDescriptor(table, key);
				if (desc.get) Object.defineProperty(proto, key, {
					...desc,
					enumerable: false
				});
				else defineBound(proto, key, desc.value);
			}
		}
		/** Shadows a prototype member with an own value, so a getter that builds from the instance runs once. */
		function own(inst, key, value, enumerable = true) {
			Object.defineProperty(inst, key, {
				configurable: true,
				writable: true,
				enumerable,
				value
			});
			return value;
		}
		/** Like {@link own}, for a member that was never an own data property and has to stay out of `Object.keys`. */
		function hide(inst, key, value) {
			return own(inst, key, value, false);
		}
		function defineBound(proto, key, fn) {
			Object.defineProperty(proto, key, {
				configurable: true,
				get() {
					return this == null ? fn : own(this, key, fn.bind(this));
				},
				set(value) {
					own(this, key, value);
				}
			});
		}
		/** Returns the prototype to install on, or `undefined` if this group is already installed on it. */
		function claim(inst, sentinel) {
			const proto = Object.getPrototypeOf(inst);
			return sentinel in proto ? void 0 : proto;
		}
		let installing;
		let broke = false;
		const breaker = {
			configurable: true,
			get() {
				broke = true;
			}
		};
		/**
		* Installs a lazily-derived internal on the `_zod` prototype of `inst`'s
		* constructor, computed from the internals object itself and cached there on
		* first read. One accessor per constructor rather than one per instance.
		*/
		function defineLazyInternal(inst, key, compute) {
			const proto = Object.getPrototypeOf(inst._zod);
			if (key in proto && installing !== inst._zod) {
				installing = void 0;
				return;
			}
			installing = inst._zod;
			Object.defineProperty(proto, key, {
				configurable: true,
				get() {
					Object.defineProperty(this, key, breaker);
					const outer = broke;
					broke = false;
					try {
						const value = compute(this);
						if (broke) delete this[key];
						else Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							value
						});
						broke = broke || outer;
						return value;
					} catch (err) {
						delete this[key];
						broke = broke || outer;
						throw err;
					}
				},
				set(value) {
					Object.defineProperty(this, key, {
						configurable: true,
						writable: true,
						value
					});
				}
			});
		}
		/**
		* Installs `key` on `inst`'s prototype, computed by `make` on first read and cached there as an own
		* data property. One accessor per constructor rather than one per instance, because an own accessor
		* puts every instance after the first into v8 dictionary mode. The key doubles as the sentinel.
		*/
		function installLazyProp(inst, key, make, enumerable) {
			const proto = claim(inst, key);
			if (!proto) return;
			Object.defineProperty(proto, key, {
				configurable: true,
				get() {
					const desc = {
						configurable: true,
						writable: true,
						enumerable,
						value: void 0
					};
					Object.defineProperty(this, key, desc);
					desc.value = make(this);
					Object.defineProperty(this, key, desc);
					return desc.value;
				},
				set(value) {
					Object.defineProperty(this, key, {
						configurable: true,
						writable: true,
						enumerable,
						value
					});
				}
			});
		}
		/** Marks the thunk `_catch` synthesises for a constant catch value. `Function.length` cannot tell that thunk from a user callback — rest and defaulted parameters both report arity 0 — and a user callback reads `ctx.error`, whose issues only finalize correctly against the caller's per-parse error map. Provenance can say what arity cannot. A plain string key rather than `Symbol.for`, whose call at module scope no bundler can prove pure — the same shape that anchored `urlCanParse` into every build. */
		const CONSTANT_CATCH = "~constantCatch";
		/** Wraps a constant catch value in a thunk tagged with {@link CONSTANT_CATCH}. */
		function constantCatch(value) {
			const fn = () => value;
			fn[CONSTANT_CATCH] = true;
			return fn;
		}
		//#endregion
		//#region ../../../zod/v4/core/core.js
		var _a$1;
		const _zodDesc$1 = {
			value: void 0,
			enumerable: false
		};
		let _E = "captureStackTrace" in Error ? Error : null;
		function newError(Definition) {
			const E = _E;
			if (E) {
				const saved = E.stackTraceLimit;
				if (typeof saved === "number") {
					try {
						E.stackTraceLimit = 0;
					} catch {
						_E = null;
						return new Definition();
					}
					try {
						return new Definition();
					} finally {
						E.stackTraceLimit = saved;
					}
				}
			}
			return new Definition();
		}
		function $constructor(name, initializer, proto, params) {
			const zodProto = {};
			function Internals(def) {
				this.def = def;
				this.constr = _;
				this.traits = /* @__PURE__ */ new Set();
			}
			Internals.prototype = zodProto;
			const protoMembers = proto;
			const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
			function init(inst, def) {
				if (!inst._zod) {
					_zodDesc$1.value = new Internals(def);
					try {
						Object.defineProperty(inst, "_zod", _zodDesc$1);
					} finally {
						_zodDesc$1.value = void 0;
					}
				}
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				if (initialized) {
					const own = Object.getPrototypeOf(inst);
					const ctorProto = inst._zod.constr.prototype;
					let up = own;
					while (up && up !== ctorProto) up = Object.getPrototypeOf(up);
					const target = up ?? own;
					if (!initialized.has(target)) {
						initialized.add(target);
						members(target, protoMembers);
					}
				}
				const proto = _.prototype;
				for (const k in proto) {
					if (!Object.prototype.hasOwnProperty.call(proto, k)) continue;
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				const inst = params?.Parent ? newError(Definition) : this;
				init(inst, def);
				const deferred = inst._zod.deferred;
				if (deferred) {
					for (const fn of deferred) fn();
					inst._zod.deferred = void 0;
				}
				const pp = globalThis.__zod_globalConfig?.postProcessor;
				if (pp) pp(inst);
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region ../../../zod/v4/core/errors.js
		function _getMessage() {
			const internals = this._zod;
			internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
			return internals.message;
		}
		function _setMessage(value) {
			this._zod.message = value;
		}
		const _messageDesc = {
			get: _getMessage,
			set: _setMessage,
			enumerable: true,
			configurable: true
		};
		const _zodDesc = {
			value: void 0,
			enumerable: false
		};
		const _issuesDesc = {
			value: void 0,
			enumerable: false
		};
		const _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			_zodDesc.value = inst._zod;
			Object.defineProperty(inst, "_zod", _zodDesc);
			_issuesDesc.value = def;
			Object.defineProperty(inst, "issues", _issuesDesc);
			_zodDesc.value = void 0;
			_issuesDesc.value = void 0;
			Object.defineProperty(inst, "message", _messageDesc);
			const proto = Object.getPrototypeOf(inst);
			if (!_installedToString.has(proto)) {
				_installedToString.add(proto);
				Object.defineProperty(proto, "toString", {
					configurable: true,
					enumerable: false,
					get() {
						const value = () => this.message;
						Object.defineProperty(this, "toString", {
							value,
							configurable: true,
							writable: true
						});
						return value;
					},
					set(value) {
						Object.defineProperty(this, "toString", {
							value,
							configurable: true,
							writable: true
						});
					}
				});
			}
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, void 0, { Parent: Error });
		/** Get-or-create `obj[key]` as an own data property. A path segment naming an inherited member
		* ("toString", "constructor") would otherwise read through to the prototype, and assigning
		* "__proto__" would hit the setter instead of creating a key. */
		function node(obj, key, make) {
			if (!Object.prototype.hasOwnProperty.call(obj, key)) {
				if (key === "__proto__") Object.defineProperty(obj, key, {
					value: make(),
					writable: true,
					enumerable: true,
					configurable: true
				});
				else obj[key] = make();
			}
			return obj[key];
		}
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
			else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							const terminal = i === fullpath.length - 1;
							if (el === "_errors") {
								if (terminal) curr._errors.push(mapper(issue));
								i++;
								continue;
							}
							if (!Object.prototype.hasOwnProperty.call(curr, el)) Object.defineProperty(curr, el, {
								value: { _errors: [] },
								enumerable: true,
								writable: true,
								configurable: true
							});
							const node = curr[el];
							if (terminal) node._errors.push(mapper(issue));
							curr = node;
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region ../../../zod/v4/core/parse.js
		function finalizeParams(callee, params) {
			return {
				callee: params?.callee ?? callee,
				Err: params?.Err
			};
		}
		const _parse = (_Err) => {
			const fn = (schema, value, _ctx, _params) => {
				const ctx = _ctx ? {
					..._ctx,
					async: false
				} : { async: false };
				const result = schema._zod.run({
					value,
					issues: []
				}, ctx);
				if (result instanceof Promise) throw new $ZodAsyncError();
				if (result.issues.length) {
					const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
					captureStackTrace(e, _params?.callee ?? fn);
					throw e;
				}
				return result.value;
			};
			return fn;
		};
		const _parseAsync = (_Err) => {
			const fn = async (schema, value, _ctx, params) => {
				const ctx = _ctx ? {
					..._ctx,
					async: true
				} : { async: true };
				let result = schema._zod.run({
					value,
					issues: []
				}, ctx);
				if (result instanceof Promise) result = await result;
				if (result.issues.length) {
					const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
					captureStackTrace(e, params?.callee ?? fn);
					throw e;
				}
				return result.value;
			};
			return fn;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => {
			const parse = _parse(_Err);
			const fn = (schema, value, _ctx, _params) => {
				const ctx = _ctx ? {
					..._ctx,
					direction: "backward"
				} : { direction: "backward" };
				return parse(schema, value, ctx, finalizeParams(fn, _params));
			};
			return fn;
		};
		const _decode = (_Err) => {
			const parse = _parse(_Err);
			const fn = (schema, value, _ctx, _params) => {
				return parse(schema, value, _ctx, finalizeParams(fn, _params));
			};
			return fn;
		};
		const _encodeAsync = (_Err) => {
			const parseAsync = _parseAsync(_Err);
			const fn = async (schema, value, _ctx, _params) => {
				const ctx = _ctx ? {
					..._ctx,
					direction: "backward"
				} : { direction: "backward" };
				return await parseAsync(schema, value, ctx, finalizeParams(fn, _params));
			};
			return fn;
		};
		const _decodeAsync = (_Err) => {
			const parseAsync = _parseAsync(_Err);
			const fn = async (schema, value, _ctx, _params) => {
				return await parseAsync(schema, value, _ctx, finalizeParams(fn, _params));
			};
			return fn;
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region ../../../zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		function nanoidOfLength(length) {
			return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
		}
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		/** Anchors a pattern source. The interpolation lives here rather than at the call site because
		* esbuild will not drop a `@__PURE__` call whose own argument interpolates a variable, but it
		* will drop `anchor(dateSource)`. Keeping it inline pinned `date` into every bundle. */
		function anchor(source) {
			return new RegExp(`^${source}$`);
		}
		const date = /*@__PURE__*/ anchor(dateSource);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : args.seconds ? `${hhmm}:[0-5]\\d(?:\\.\\d+)?` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime(args) {
			const opts = ["Z"];
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const qualified = `${timeSource({
				precision: args.precision,
				seconds: true
			})}(?:${opts.join("|")})`;
			const timeRegex = args.local ? `${qualified}|${timeSource({ precision: args.precision })}` : qualified;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const _undefined$2 = /^undefined$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region ../../../zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		/** Default `when` for length-based checks: run only on non-nullish values with a `length`. */
		const _whenHasLength = (payload) => {
			const val = payload.value;
			return !nullish(val) && val.length !== void 0;
		};
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) {
					if (def.inclusive) bag.maximum = def.value;
					else bag.exclusiveMaximum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin: numericOriginMap[typeof payload.value] ?? origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) {
					if (def.inclusive) bag.minimum = def.value;
					else bag.exclusiveMinimum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin: numericOriginMap[typeof payload.value] ?? origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? def.value !== BigInt(0) && payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const units = input.length;
				if ((typeof input === "string" && units > def.maximum ? codePointLength(input) : units) <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const units = input.length;
				if ((typeof input === "string" && units >= def.minimum && units < def.minimum * 2 ? codePointLength(input) : units) >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = _whenHasLength);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const units = input.length;
				const length = typeof input === "string" && units >= def.length && units <= def.length * 2 ? codePointLength(input) : units;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position},}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region ../../../zod/v4/core/doc.js
		var Doc = class {
			constructor(args = [], closed = {}) {
				this.content = [];
				this.indent = 0;
				this.args = args;
				this.closed = closed;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const content = this?.content ?? [``];
				return new F(...Object.keys(this.closed), `return function (${this.args.join(", ")}) {\n${content.join("\n")}\n};`)(...Object.values(this.closed));
			}
		};
		//#endregion
		//#region ../../../zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 5,
			patch: 4
		};
		//#endregion
		//#region ../../../zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const defChecks = inst._zod.def.checks;
			const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					if (payload.memo) return payload;
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							attachSchema(payload.issues, currLen, inst);
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							attachSchema(payload.issues, currLen, inst);
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
		}, {
			get "~standard"() {
				return hide(this, "~standard", standardProps(this));
			},
			set "~standard"(value) {
				own(this, "~standard", value);
			}
		});
		/** The Standard Schema surface for `inst`. Shared so wrappers can extend it without forcing it. */
		const toStandardResult = (r) => r.success ? { value: r.data } : { issues: r.error?.issues };
		function standardProps(inst) {
			return {
				validate: (value) => {
					try {
						return toStandardResult(safeParse$1(inst, value));
					} catch (_) {
						return safeParseAsync$1(inst, value).then(toStandardResult);
					}
				},
				vendor: "zod",
				version: 1
			};
		}
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		/** Parses a URL for `$ZodURL`, applying the one guard the URL constructor cannot express. Returns the parsed URL, or a code naming the stage that rejected it — the runtime needs that distinction to pick an issue note, and compiled code only needs to know it is not a URL. */
		function parseURLObject(trimmed, def) {
			if (!def.normalize && def.protocol?.source === httpProtocol.source && !/^https?:\/\//i.test(trimmed)) return 1;
			try {
				return new URL(trimmed);
			} catch {
				return 2;
			}
		}
		const asciiTabOrNewline = /[\t\n\r]/g;
		/** The URL parser deletes every ASCII tab, LF and CR from its input before it parses, so `new URL("https://exa\nmple.com")` reports on `example.com`. Applying the same deletion to the returned value closes the half of that divergence which can move the host; the parser's other rewrite, stripping C0 controls at the edges, cannot. */
		function stripTabAndNewline(value) {
			return value.replace(asciiTabOrNewline, "");
		}
		function urlHostnameOk(url, hostname) {
			hostname.lastIndex = 0;
			return hostname.test(url.hostname);
		}
		function urlProtocolOk(url, protocol) {
			protocol.lastIndex = 0;
			return protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol);
		}
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					const url = parseURLObject(trimmed, def);
					if (url === 1) {
						payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid URL format",
							input: payload.value,
							inst,
							continue: !def.abort
						});
						return;
					}
					if (url === 2) {
						payload.issues.push({
							code: "invalid_format",
							format: "url",
							input: payload.value,
							inst,
							continue: !def.abort
						});
						return;
					}
					if (def.hostname && !urlHostnameOk(url, def.hostname)) payload.issues.push({
						code: "invalid_format",
						format: "url",
						note: "Invalid hostname",
						pattern: def.hostname.source,
						input: payload.value,
						inst,
						continue: !def.abort
					});
					if (def.protocol && !urlProtocolOk(url, def.protocol)) payload.issues.push({
						code: "invalid_format",
						format: "url",
						note: "Invalid protocol",
						pattern: def.protocol.source,
						input: payload.value,
						inst,
						continue: !def.abort
					});
					payload.value = def.normalize ? url.href : stripTabAndNewline(trimmed);
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			if (def.length !== void 0 && (!Number.isInteger(def.length) || def.length < 1)) throw new Error(`Invalid nanoid length: ${def.length}`);
			def.pattern ?? (def.pattern = def.length === void 0 ? nanoid : nanoidOfLength(def.length));
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime(def));
			$ZodStringFormat.init(inst, def);
			if (def.local || def.precision === -1) {
				inst._zod.bag.laxFormat = true;
				inst._zod.onattach.push((s) => {
					s._zod.bag.laxFormat = true;
				});
			}
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		/** An IPv6 address is written with hex digits, colons and dots, and nothing else. The guard is what makes the check below an IPv6 check: `new URL("http://[...]")` parses an authority, not an address, so `@` and `\` re-delimit it and `"::@1\\"` validates against the host `0.0.0.1`. The URL parser also deletes ASCII tab, LF and CR rather than failing, which is how `"::1\n"` validated as `::1`. */
		const ipv6Alphabet = /^[0-9a-fA-F:.]+$/;
		function isValidIPv6(value) {
			if (!ipv6Alphabet.test(value)) return false;
			try {
				new URL(`http://[${value}]`);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				if (!isValidIPv6(payload.value)) payload.issues.push({
					code: "invalid_format",
					format: "ipv6",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		function isValidCIDRv6(value) {
			const parts = value.split("/");
			if (parts.length !== 2) return false;
			const [address, prefix] = parts;
			if (!prefix) return false;
			const prefixNum = Number(prefix);
			if (`${prefixNum}` !== prefix) return false;
			if (prefixNum < 0 || prefixNum > 128) return false;
			return isValidIPv6(address);
		}
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (!isValidCIDRv6(payload.value)) payload.issues.push({
					code: "invalid_format",
					format: "cidrv6",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUndefined = /*@__PURE__*/ $constructor("$ZodUndefined", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = _undefined$2;
			inst._zod.values = /* @__PURE__ */ new Set([void 0]);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (typeof input === "undefined") return payload;
				payload.issues.push({
					expected: "undefined",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			const memo = globalConfig.memoizer;
			memo?.attach(inst);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, optin, optout) {
			const isPresent = key in input;
			const isOptionalOut = optout === "optional";
			if (!isPresent && isOptionalOut && optin === "optional") return;
			if (result.issues.length) {
				if (optin !== void 0 && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && optin === void 0) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		const NO_SYMBOL_KEYS = [];
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			const ownSymbols = Object.getOwnPropertySymbols(def.shape);
			const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
			const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
			for (const k of allKeys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				allKeys,
				symbolKeys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const optin = _catchall.optin;
			const optout = _catchall.optout;
			for (const key in input) {
				if (keySet.has(key)) continue;
				if (key === "__proto__") {
					if (t === "never") unrecognized.push(key);
					continue;
				}
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
				else handlePropertyResult(r, payload, key, input, optin, optout);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst,
				continue: true
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const propShapes = /* @__PURE__ */ new WeakMap();
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				propShapes.set(def, sh);
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					propShapes.set(def, newSh);
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazyInternal(inst, "propValues", (zod) => {
				const shape = zod.def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						if (!Object.prototype.hasOwnProperty.call(propValues, key)) assignProp(propValues, key, /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
						if (field.optin !== void 0) propValues[key].add(void 0);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			const memo = globalConfig.memoizer;
			memo?.attach(inst);
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.allKeys) {
					if (key === "__proto__") continue;
					const el = shape[key];
					const optin = el._zod.optin;
					const optout = el._zod.optout;
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, optin, optout)));
					else handlePropertyResult(r, payload, key, input, optin, optout);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const memo = globalConfig.memoizer;
			const generateFastpass = (shape) => {
				const normalized = _normalized.value;
				const syms = normalized.symbolKeys;
				const doc = new Doc(["payload", "ctx"], {
					shape,
					inst,
					memo,
					syms
				});
				const parseStr = (k) => `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				const prefixStr = (id, k) => `
          for (let i = 0; i < ${id}.issues.length; i++) {
            const iss = ${id}.issues[i];
            iss.path = iss.path ? [${k}, ...iss.path] : [${k}];
            payload.issues.push(iss);
          }`;
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.allKeys) ids[key] = `key_${counter++}`;
				doc.write(memo ? `const newResult = memo.alloc(inst, payload, {}, ctx);` : `const newResult = {};`);
				for (const key of normalized.allKeys) {
					if (key === "__proto__") continue;
					const id = ids[key];
					const k = typeof key === "symbol" ? `syms[${syms.indexOf(key)}]` : esc(key);
					const isPresent = `${k} in input`;
					const schema = shape[key];
					const optin = schema?._zod?.optin;
					const isOptionalIn = optin !== void 0;
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(k)};`);
					if (isOptionalIn && isOptionalOut) {
						const assign = optin === "optional" ? `${id}_present` : `${id}.value !== undefined || ${id}_present`;
						doc.write(`
        const ${id}_present = ${isPresent};
        if (!${id}.issues.length || ${id}_present) {
          if (${id}.issues.length) {${prefixStr(id, k)}
          }

          if (${assign}) {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					} else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${isPresent};
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          newResult[${k}] = ${id}.value;
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {${prefixStr(id, k)}
        }
        
        if (${id}.value === undefined) {
          if (${isPresent}) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }

      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				return doc.compile();
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
			defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazyInternal(inst, "values", (zod) => {
				if (zod.def.options.every((o) => o._zod.values)) return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazyInternal(inst, "pattern", (zod) => {
				if (zod.def.options.every((o) => o._zod.pattern)) {
					const patterns = zod.def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				if (Object.prototype.hasOwnProperty.call(newObj, "__proto__")) delete newObj.__proto__;
				for (const key of sharedKeys) {
					if (key === "__proto__") continue;
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			const keyIssues = /* @__PURE__ */ new Map();
			const collect = (iss, side) => {
				let keys;
				if (iss.code === "unrecognized_keys" && !iss.path?.length) {
					unrecIssue ?? (unrecIssue = iss);
					keys = iss.keys;
				} else if (iss.code === "invalid_key" && iss.origin === "record" && iss.path?.length === 1) {
					const k = String(iss.path[0]);
					if (!keyIssues.has(k)) keyIssues.set(k, iss);
					keys = [k];
				} else return false;
				for (const k of keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k)[side] = true;
				}
				return true;
			};
			for (const iss of left.issues) if (!collect(iss, "l")) result.issues.push(iss);
			for (const iss of right.issues) if (!collect(iss, "r")) result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length) {
				const aggregated = unrecIssue ? bothKeys.filter((k) => unrecIssue.keys.includes(k)) : [];
				if (aggregated.length) result.issues.push({
					...unrecIssue,
					keys: aggregated
				});
				for (const k of bothKeys) if (!aggregated.includes(k) && keyIssues.has(k)) result.issues.push(keyIssues.get(k));
			}
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) {
				if (aborted(result)) return result;
				throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			}
			result.value = merged.data;
			return result;
		}
		const $ZodRecord = /*@__PURE__*/ $constructor("$ZodRecord", (inst, def) => {
			$ZodType.init(inst, def);
			const memo = globalConfig.memoizer;
			memo?.attach(inst);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!isPlainObject(input)) {
					payload.issues.push({
						expected: "record",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				const proms = [];
				const values = def.keyType._zod.values;
				if (values && !def.partial) {
					payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
					const recordKeys = /* @__PURE__ */ new Set();
					for (const key of values) if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
						recordKeys.add(typeof key === "number" ? key.toString() : key);
						if (key === "__proto__") continue;
						const keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (keyResult.issues.length) {
							payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const outKey = keyResult.value;
						if (outKey === "__proto__") continue;
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}
					}
					let unrecognized;
					for (const key in input) if (!recordKeys.has(key)) {
						if (def.mode === "loose") {
							if (key === "__proto__") continue;
							payload.value[key] = input[key];
						} else {
							unrecognized = unrecognized ?? [];
							unrecognized.push(key);
						}
					}
					if (unrecognized && unrecognized.length > 0) payload.issues.push({
						code: "unrecognized_keys",
						input,
						inst,
						keys: unrecognized,
						continue: true
					});
				} else {
					payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
					let unrecognized;
					for (const key of Reflect.ownKeys(input)) {
						if (key === "__proto__") continue;
						if (!Object.prototype.propertyIsEnumerable.call(input, key)) continue;
						let keyResult = def.keyType._zod.run({
							value: key,
							issues: []
						}, ctx);
						if (keyResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
						if (typeof key === "string" && number$1.test(key) && keyResult.issues.length) {
							const retryResult = def.keyType._zod.run({
								value: Number(key),
								issues: []
							}, ctx);
							if (retryResult instanceof Promise) throw new Error("Async schemas not supported in object keys currently");
							if (retryResult.issues.length === 0) keyResult = retryResult;
						}
						if (keyResult.issues.length) {
							if (def.mode === "loose") payload.value[key] = input[key];
							else if (values) {
								unrecognized = unrecognized ?? [];
								unrecognized.push(key);
							} else payload.issues.push({
								code: "invalid_key",
								origin: "record",
								issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
								input: key,
								path: [key],
								inst
							});
							continue;
						}
						const outKey = keyResult.value;
						if (outKey === "__proto__") continue;
						const result = def.valueType._zod.run({
							value: input[key],
							issues: []
						}, ctx);
						if (result instanceof Promise) proms.push(result.then((result) => {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}));
						else {
							if (result.issues.length) payload.issues.push(...prefixIssues(key, result.issues));
							payload.value[outKey] = result.value;
						}
					}
					if (unrecognized && unrecognized.length > 0) payload.issues.push({
						code: "unrecognized_keys",
						input,
						inst,
						keys: unrecognized,
						continue: true
					});
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			const patternValues = values.filter((k) => propertyKeyTypes.has(typeof k));
			inst._zod.pattern = new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(def.values.length ? `^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			globalConfig.memoizer?.guard(inst);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				return payload;
			};
		});
		function handleOptionalResult(payload, result) {
			payload.value = result.issues.length ? void 0 : result.value;
			return payload;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
			inst._zod.optout = "optional";
			defineLazyInternal(inst, "values", (zod) => {
				const values = zod.def.innerType._zod.values;
				return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
			});
			defineLazyInternal(inst, "pattern", (zod) => {
				const pattern = zod.def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === void 0) {
					if (def.innerType._zod.optin !== "defaulted") return payload;
					const result = def.innerType._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) return result.then((result) => handleOptionalResult(payload, result));
					return handleOptionalResult(payload, result);
				}
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
			defineLazyInternal(inst, "pattern", (zod) => zod.def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin);
			defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
			defineLazyInternal(inst, "pattern", (zod) => {
				const pattern = zod.def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazyInternal(inst, "values", (zod) => {
				return zod.def.innerType._zod.values ? /* @__PURE__ */ new Set([...zod.def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "defaulted";
			defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "defaulted";
			defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazyInternal(inst, "values", (zod) => {
				const v = zod.def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		function handleCatchResult(payload, result, def, ctx) {
			if (!result.issues.length) {
				payload.value = result.value;
				if (result.memo) payload.memo = true;
				return payload;
			}
			payload.value = def.catchValue({
				...result,
				value: payload.value,
				error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
				input: payload.value
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
			defineLazyInternal(inst, "optout", (zod) => zod.def.innerType._zod.optout);
			defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run({
					value: payload.value,
					issues: []
				}, ctx);
				if (result instanceof Promise) return result.then((result) => handleCatchResult(payload, result, def, ctx));
				return handleCatchResult(payload, result, def, ctx);
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazyInternal(inst, "values", (zod) => zod.def.in._zod.values);
			defineLazyInternal(inst, "optin", (zod) => zod.def.in._zod.optin);
			defineLazyInternal(inst, "optout", (zod) => zod.def.out._zod.optout);
			defineLazyInternal(inst, "propValues", (zod) => zod.def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.some((iss) => iss.code !== "unrecognized_keys")) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
			defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
			defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
			defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			if (!payload.memo) payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodLazy = /*@__PURE__*/ $constructor("$ZodLazy", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "innerType", () => {
				const d = def;
				if (!d._cachedInner) d._cachedInner = def.getter();
				return d._cachedInner;
			});
			defineLazyInternal(inst, "pattern", (zod) => zod.innerType?._zod?.pattern);
			defineLazyInternal(inst, "propValues", (zod) => zod.innerType?._zod?.propValues);
			defineLazyInternal(inst, "optin", (zod) => zod.innerType?._zod?.optin ?? void 0);
			defineLazyInternal(inst, "optout", (zod) => zod.innerType?._zod?.optout ?? void 0);
			inst._zod.parse = (payload, ctx) => {
				return inst._zod.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region ../../../zod/v4/core/memoizer.js
		var $ZodCyclicError = class extends Error {
			constructor() {
				super(`Cannot parse a reference cycle that closes through a transform`);
				this.name = "ZodCyclicError";
			}
		};
		/** Keyed off the context object every schema in one parse call already shares. */
		const STATE = "~memo";
		const NO_ISSUES = [];
		function cloneIssues(issues) {
			return issues.map((iss) => iss.path ? {
				...iss,
				path: iss.path.slice()
			} : { ...iss });
		}
		const recursive = /*@__PURE__*/ new WeakMap();
		/** Whether this schema's subtree contains a cycle, so one parse can re-enter it. */
		function isRecursive(inst, stack) {
			const cached = recursive.get(inst);
			if (cached !== void 0) return cached;
			if (stack.has(inst)) return true;
			stack.add(inst);
			let result = false;
			const check = (child) => {
				if (!result && child?._zod && isRecursive(child, stack)) result = true;
			};
			const def = inst._zod.def;
			switch (def.type) {
				case "object":
					for (const key of Reflect.ownKeys(def.shape)) check(def.shape[key]);
					check(def.catchall);
					break;
				case "array":
					check(def.element);
					break;
				case "tuple":
					for (const el of def.items) check(el);
					check(def.rest);
					break;
				case "record":
				case "map":
					check(def.keyType);
					check(def.valueType);
					break;
				case "set":
					check(def.valueType);
					break;
				case "union":
					for (const el of def.options) check(el);
					break;
				case "intersection":
					check(def.left);
					check(def.right);
					break;
				case "optional":
				case "nullable":
				case "default":
				case "prefault":
				case "catch":
				case "readonly":
				case "nonoptional":
				case "promise":
				case "success":
					check(def.innerType);
					break;
				case "pipe":
					check(def.in);
					check(def.out);
					break;
				case "function":
					check(def.input);
					check(def.output);
					break;
				case "lazy":
					check(inst._zod.innerType);
					break;
				case "template_literal":
				case "string":
				case "number":
				case "int":
				case "boolean":
				case "bigint":
				case "symbol":
				case "undefined":
				case "null":
				case "void":
				case "never":
				case "any":
				case "unknown":
				case "date":
				case "nan":
				case "enum":
				case "literal":
				case "file":
				case "transform":
				case "custom": break;
				default: for (const key in def) {
					const desc = Object.getOwnPropertyDescriptor(def, key);
					if (!desc || desc.get) continue;
					const value = desc.value;
					if (!value || typeof value !== "object") continue;
					if (value._zod) check(value);
					else if (Array.isArray(value)) for (const el of value) check(el);
				}
			}
			stack.delete(inst);
			recursive.set(inst, result);
			return result;
		}
		function bucketFor(state, inst) {
			let bucket = state.buckets.get(inst);
			if (!bucket) {
				bucket = /* @__PURE__ */ new Map();
				state.buckets.set(inst, bucket);
			}
			return bucket;
		}
		let handoff;
		const open = [];
		const memo = {
			alloc(_inst, payload, empty) {
				const bucket = handoff;
				if (!bucket) return empty;
				handoff = void 0;
				const entry = {
					value: empty,
					issues: null
				};
				bucket.set(payload.value, entry);
				open.push(entry);
				return empty;
			},
			guard(inst) {
				var _a;
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred.push(() => {
					const base = inst._zod.parse;
					const wrapped = (payload, ctx) => {
						if (ctx.direction !== "backward" && isBackEdge(ctx, payload.value)) throw new $ZodCyclicError();
						return base(payload, ctx);
					};
					inst._zod.parse = wrapped;
					if (inst._zod.run === base) inst._zod.run = wrapped;
				});
			},
			attach(inst) {
				var _a;
				let isRecursiveInst;
				let lastCtx;
				let lastBucket;
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred.push(() => {
					const base = inst._zod.parse;
					const wrapped = (payload, ctx) => {
						if (isRecursiveInst === void 0) {
							isRecursiveInst = isRecursive(inst, /* @__PURE__ */ new Set());
							if (!isRecursiveInst) {
								inst._zod.parse = base;
								if (inst._zod.run === wrapped) inst._zod.run = base;
								return base(payload, ctx);
							}
						}
						const input = payload.value;
						if (input === null || typeof input !== "object") return base(payload, ctx);
						let state = ctx[STATE];
						if (!state) {
							state = {
								buckets: /* @__PURE__ */ new Map(),
								backEdges: void 0
							};
							ctx[STATE] = state;
						}
						let bucket;
						if (lastCtx === ctx) bucket = lastBucket;
						else {
							bucket = bucketFor(state, inst);
							lastCtx = ctx;
							lastBucket = bucket;
						}
						const hit = bucket.get(input);
						if (hit) {
							payload.value = hit.value;
							if (hit.issues) {
								if (hit.issues.length) payload.issues.push(...cloneIssues(hit.issues));
							} else {
								payload.memo = true;
								state.backEdges ?? (state.backEdges = /* @__PURE__ */ new Set());
								state.backEdges.add(hit.value);
							}
							return payload;
						}
						handoff = bucket;
						const depth = open.length;
						const result = base(payload, ctx);
						handoff = void 0;
						const entry = open.length > depth ? open.pop() : void 0;
						if (result instanceof Promise) return result.then((r) => {
							if (entry) entry.issues = r.issues.length ? cloneIssues(r.issues) : NO_ISSUES;
							return r;
						});
						if (entry) entry.issues = result.issues.length ? cloneIssues(result.issues) : NO_ISSUES;
						return result;
					};
					inst._zod.parse = wrapped;
					if (inst._zod.run === base) inst._zod.run = wrapped;
				});
			}
		};
		/** The memoizer that gives containers cycle support. `zod` installs it by default; `zod/mini` opts in with `config({ memoizer: memoizer() })`. */
		function memoizer() {
			return memo;
		}
		/** Whether this value is a node a back-edge resolved to before it finished. */
		function isBackEdge(ctx, value) {
			const backEdges = ctx[STATE]?.backEdges;
			return backEdges !== void 0 && value !== null && typeof value === "object" && backEdges.has(value);
		}
		//#endregion
		//#region ../../../zod/v4/locales/en.js
		const error = () => {
			const Sizable = {
				string: {
					unit: "characters",
					verb: "to have"
				},
				file: {
					unit: "bytes",
					verb: "to have"
				},
				array: {
					unit: "items",
					verb: "to have"
				},
				set: {
					unit: "items",
					verb: "to have"
				},
				map: {
					unit: "entries",
					verb: "to have"
				}
			};
			function getSizing(origin) {
				return Sizable[origin] ?? null;
			}
			const FormatDictionary = {
				regex: "input",
				email: "email address",
				url: "URL",
				emoji: "emoji",
				uuid: "UUID",
				uuidv4: "UUIDv4",
				uuidv6: "UUIDv6",
				nanoid: "nanoid",
				guid: "GUID",
				cuid: "cuid",
				cuid2: "cuid2",
				ulid: "ULID",
				xid: "XID",
				ksuid: "KSUID",
				datetime: "ISO datetime",
				date: "ISO date",
				time: "ISO time",
				duration: "ISO duration",
				ipv4: "IPv4 address",
				ipv6: "IPv6 address",
				mac: "MAC address",
				cidrv4: "IPv4 range",
				cidrv6: "IPv6 range",
				base64: "base64-encoded string",
				base64url: "base64url-encoded string",
				json_string: "JSON string",
				e164: "E.164 number",
				credit_card: "credit card number",
				jwt: "JWT",
				template_literal: "input"
			};
			const TypeDictionary = { nan: "NaN" };
			function getTypeName(type, input) {
				if (type === "number" && typeof input === "number" && !Number.isFinite(input)) return String(input);
				return TypeDictionary[type] ?? type;
			}
			return (issue) => {
				switch (issue.code) {
					case "invalid_type": return `Invalid input: expected ${getTypeName(issue.expected)}, received ${getTypeName(parsedType(issue.input), issue.input)}`;
					case "invalid_value":
						if (issue.values.length === 1) return `Invalid input: expected ${stringifyPrimitive(issue.values[0])}`;
						return `Invalid option: expected one of ${joinValues(issue.values, "|")}`;
					case "too_big": {
						const adj = issue.exact ? "exactly " : issue.inclusive ? "<=" : "<";
						const sizing = getSizing(issue.origin);
						if (sizing) return `Too big: expected ${issue.origin ?? "value"} to have ${adj}${issue.maximum.toString()} ${sizing.unit ?? "elements"}`;
						return `Too big: expected ${issue.origin ?? "value"} to be ${adj}${issue.maximum.toString()}`;
					}
					case "too_small": {
						const adj = issue.exact ? "exactly " : issue.inclusive ? ">=" : ">";
						const sizing = getSizing(issue.origin);
						if (sizing) return `Too small: expected ${issue.origin} to have ${adj}${issue.minimum.toString()} ${sizing.unit}`;
						return `Too small: expected ${issue.origin} to be ${adj}${issue.minimum.toString()}`;
					}
					case "invalid_format": {
						const _issue = issue;
						if (_issue.format === "starts_with") return `Invalid string: must start with "${_issue.prefix}"`;
						if (_issue.format === "ends_with") return `Invalid string: must end with "${_issue.suffix}"`;
						if (_issue.format === "includes") return `Invalid string: must include "${_issue.includes}"`;
						if (_issue.format === "regex") return `Invalid string: must match pattern ${_issue.pattern}`;
						return `Invalid ${FormatDictionary[_issue.format] ?? issue.format}`;
					}
					case "not_multiple_of": return `Invalid number: must be a multiple of ${issue.divisor}`;
					case "unrecognized_keys": return `Unrecognized key${issue.keys.length > 1 ? "s" : ""}: ${joinValues(issue.keys, ", ")}`;
					case "invalid_key": return `Invalid key in ${issue.origin}`;
					case "invalid_union":
						if (issue.options && Array.isArray(issue.options) && issue.options.length > 0) return `Invalid discriminator value. Expected ${issue.options.map((o) => `'${o}'`).join(" | ")}`;
						if (issue.inclusive === false) return "Invalid input: more than one option matched";
						return "Invalid input";
					case "invalid_element": return `Invalid value in ${issue.origin}`;
					default: return `Invalid input`;
				}
			};
		};
		function en_default() {
			return { localeError: error() };
		}
		//#endregion
		//#region ../../../zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region ../../../zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _undefined$1(Class, params) {
			return new Class({
				type: "undefined",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify$2(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						if (!("input" in _issue)) _issue.input = payload.value;
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region ../../../zod/v4/core/to-json-schema.js
		function assignProps(target, ...sources) {
			for (const source of sources) for (const key of Reflect.ownKeys(source)) if (Object.prototype.propertyIsEnumerable.call(source, key)) assignProp(target, key, source[key]);
			return target;
		}
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				sharedDefsExtractedFor: void 0,
				sharedEmitDoneFor: void 0,
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				intersections: [],
				deferred: [],
				external: params?.external ?? void 0
			};
		}
		/**
		* Applies the `unrepresentable` setting at a site that has no JSON Schema equivalent. Throws
		* `message` unless the setting (or the handler's return value) says otherwise. Returns `true` if a
		* custom JSON Schema was written into `json`, in which case the caller must not write its own.
		*/
		function handleUnrepresentable(schema, ctx, json, params, message) {
			const result = typeof ctx.unrepresentable === "function" ? ctx.unrepresentable({
				zodSchema: schema,
				path: params.path,
				message
			}) : ctx.unrepresentable;
			if (result === "any") return false;
			if (result === void 0 || result === "throw") throw new Error(message);
			Object.assign(json, result);
			return true;
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			ctx.sharedDefsExtractedFor = void 0;
			ctx.sharedEmitDoneFor = void 0;
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) assignProps(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function encodeJSONPointerSegment(segment) {
			return segment.replace(/~/g, "~0").replace(/\//g, "~1");
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			if (ctx.external && ctx.sharedDefsExtractedFor === ctx.external) return;
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${encodeJSONPointerSegment(id)}`
					};
				}
				const uriPrefix = `#`;
				const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
				if (entry[1] === root && !entry[1].schema.id) return { ref: uriPrefix };
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + encodeJSONPointerSegment(defId)
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
			if (ctx.external) ctx.sharedDefsExtractedFor = ctx.external;
		}
		/** Rewrites `anyOf: [{type: "a"}, {type: "b"}]` to `type: ["a", "b"]`, which every JSON Schema draft treats as equivalent and most consumers render far better for the nullable case. Only branches that are a bare type assertion qualify — anything carrying a constraint, `$ref`, `const` or metadata is left alone. Runs after `flattenRef`, so a branch an override decorated or `$defs` extraction turned into a `$ref` is no longer bare and correctly stays in `anyOf`. `oneOf` is excluded: `integer` and `number` overlap, so "exactly one" and "at least one" are not the same there. OpenAPI 3.0 is excluded: its `type` must be a single string. */
		function compactTypeUnion(schema) {
			const options = schema.anyOf;
			if (!Array.isArray(options) || options.length === 0 || schema.type !== void 0) return;
			const types = [];
			for (const option of options) {
				if (!option || typeof option !== "object") return;
				compactTypeUnion(option);
				const keys = Object.keys(option);
				if (keys.length !== 1 || keys[0] !== "type") return;
				const type = option.type;
				for (const member of Array.isArray(type) ? type : [type]) {
					if (typeof member !== "string") return;
					if (!types.includes(member)) types.push(member);
				}
			}
			delete schema.anyOf;
			schema.type = types.length === 1 ? types[0] : types;
		}
		/** Keywords `foldIntersection` knows how to combine. Anything else — `$ref`, `patternProperties`,
		* an annotation like `description` — makes a member unfoldable, so a constraint this does not
		* understand leaves the `allOf` alone instead of being silently dropped or misattributed. */
		const FOLDABLE_KEYS = /* @__PURE__ */ new Set([
			"type",
			"properties",
			"required",
			"additionalProperties"
		]);
		const UNION_KEYS = ["oneOf", "anyOf"];
		/** A member's constraint on a key it does not declare itself. A `catchall` states one; `false`, an absent `additionalProperties`, and the empty schema a loose object emits state nothing. */
		function undeclaredConstraint(member) {
			const extra = member.additionalProperties;
			if (extra === void 0 || extra === false || typeof extra !== "object" || extra === null) return null;
			return Object.keys(extra).length ? extra : null;
		}
		/** Combines object members into the single object they describe together, or returns `null` if any of them carries a keyword outside {@link FOLDABLE_KEYS}. */
		function foldObjects(members) {
			const objects = [];
			for (const member of members) {
				if (typeof member !== "object" || member.type !== "object") return null;
				for (const key in member) if (!FOLDABLE_KEYS.has(key)) return null;
				objects.push(member);
			}
			const properties = {};
			const required = /* @__PURE__ */ new Set();
			for (const object of objects) {
				for (const key in object.properties) {
					if (Object.prototype.hasOwnProperty.call(properties, key)) continue;
					const parts = [];
					for (const other of objects) {
						const part = other.properties?.[key] ?? undeclaredConstraint(other);
						if (part === null || part === void 0) continue;
						if (!parts.some((seen) => JSON.stringify(seen) === JSON.stringify(part))) parts.push(part);
					}
					assignProp(properties, key, parts.length === 1 ? parts[0] : foldObjects(parts) ?? { allOf: parts });
				}
				for (const key of object.required ?? []) required.add(key);
			}
			const folded = {
				type: "object",
				properties
			};
			if (required.size) folded.required = [...required];
			if (objects.every((object) => object.additionalProperties === false)) folded.additionalProperties = false;
			else {
				const constraints = [];
				for (const object of objects) {
					const constraint = undeclaredConstraint(object);
					if (constraint && !constraints.some((seen) => JSON.stringify(seen) === JSON.stringify(constraint))) constraints.push(constraint);
				}
				if (constraints.length === 1) folded.additionalProperties = constraints[0];
				else if (constraints.length > 1) folded.additionalProperties = { allOf: constraints };
			}
			return folded;
		}
		/** `additionalProperties` in an `allOf` member sees only that member's own `properties`, so two
		* closed object members reject each other's keys and the schema validates nothing. Zod's parser
		* pools the key sets instead — `handleIntersectionResults` reports a key as unrecognized only when
		* *every* side rejects it — so the emitted schema has to pool them too, and folding the members
		* into one object is the encoding that says so on every target.
		*
		* This runs from `finalize`, after `extractDefs`, which is what keeps it clear of the `$ref`
		* machinery: a member extracted into `$defs` is already a `$ref` by now and declines to fold, so it
		* keeps its reference and its own closedness rather than being inlined as a stale copy. */
		function foldIntersection(json) {
			const allOf = json.allOf;
			if (!Array.isArray(allOf) || allOf.length < 2) return;
			for (const key of FOLDABLE_KEYS) if (key in json) return;
			const unions = allOf.filter((m) => UNION_KEYS.some((k) => Array.isArray(m[k])));
			let folded = null;
			if (!unions.length) folded = foldObjects(allOf);
			else {
				const union = unions[0];
				const keyword = UNION_KEYS.find((k) => Array.isArray(union[k]));
				if (Object.keys(union).length !== 1) return;
				const rest = allOf.filter((m) => m !== union);
				const branches = union[keyword].map((branch) => foldObjects([...rest, branch]));
				if (branches.some((b) => !b)) return;
				folded = { [keyword]: branches };
			}
			if (!folded) return;
			delete json.allOf;
			assignProps(json, folded);
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else assignProps(schema, refSchema);
					assignProps(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) {
				for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
				if (ctx.target !== "openapi-3.0") for (const entry of ctx.seen.entries()) compactTypeUnion(entry[1].def ?? entry[1].schema);
				for (const rewrite of ctx.deferred) rewrite();
				if (ctx.intersections.length) {
					const carriers = /* @__PURE__ */ new Map();
					for (const seen of ctx.seen.values()) for (const json of [seen.schema, seen.def]) {
						const allOf = json?.allOf;
						if (!Array.isArray(allOf)) continue;
						const existing = carriers.get(allOf);
						if (existing) existing.push(json);
						else carriers.set(allOf, [json]);
					}
					for (const allOf of ctx.intersections) for (const json of carriers.get(allOf) ?? []) foldIntersection(json);
				}
			}
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			assignProps(result, root.defId ? root.schema : root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			if (!ctx.external || ctx.sharedEmitDoneFor !== ctx.external) for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					assignProp(defs, seen.defId, seen.def);
				}
			}
			if (ctx.external) ctx.sharedEmitDoneFor = ctx.external;
			if (ctx.external) {} else if (Object.keys(defs).length > 0) {
				if (ctx.target === "draft-2020-12") result.$defs = defs;
				else result.definitions = defs;
			}
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault" || def.type === "catch") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region ../../../zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding, laxFormat } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time" || laxFormat) delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const patternList = [...patterns];
				if (patternList.length === 1) json.pattern = patternList[0].source;
				else if (patternList.length > 1) json.allOf = [...patternList.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) {
				if (legacy) {
					json.minimum = exclusiveMinimum;
					json.exclusiveMinimum = true;
				} else json.exclusiveMinimum = exclusiveMinimum;
			} else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) {
				if (legacy) {
					json.maximum = exclusiveMaximum;
					json.exclusiveMaximum = true;
				} else json.exclusiveMaximum = exclusiveMaximum;
			} else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") {
				if (Number.isFinite(multipleOf) && multipleOf !== 0) json.multipleOf = Math.abs(multipleOf);
				else handleUnrepresentable(schema, ctx, json, params, `A multipleOf divisor of ${multipleOf} cannot be represented in JSON Schema`);
			}
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const undefinedProcessor = (schema, ctx, json, params) => {
			handleUnrepresentable(schema, ctx, json, params, "Undefined cannot be represented in JSON Schema");
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.length === 0) {
				json.not = {};
				return;
			}
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			if (def.values.length === 0) {
				json.not = {};
				return;
			}
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (handleUnrepresentable(schema, ctx, json, params, "Literal `undefined` cannot be represented in JSON Schema")) return;
			} else if (typeof val === "bigint") {
				if (handleUnrepresentable(schema, ctx, json, params, "BigInt literals cannot be represented in JSON Schema")) return;
				vals.push(Number(val));
			} else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (schema, ctx, json, params) => {
			handleUnrepresentable(schema, ctx, json, params, "Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (schema, ctx, json, params) => {
			handleUnrepresentable(schema, ctx, json, params, "Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		function inputOptin(schema) {
			const def = schema._zod.def;
			if (def.type === "pipe" && def.in._zod.traits.has("$ZodTransform")) return inputOptin(def.out);
			if (def.type === "catch") return inputOptin(def.innerType);
			return schema._zod.optin;
		}
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const shape = def.shape;
			if (Object.getOwnPropertySymbols(shape).length && handleUnrepresentable(schema, ctx, json, params, "Symbol keys cannot be represented in JSON Schema")) return;
			json.type = "object";
			json.properties = {};
			for (const key in shape) assignProp(json.properties, key, process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			}));
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const field = def.shape[key];
				if (ctx.io === "input") return inputOptin(field) === void 0;
				else return field._zod.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			const allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
			json.allOf = allOf;
			ctx.intersections.push(allOf);
		};
		/** JSON object keys are always strings, so a numeric record key schema is re-expressed over the
		* numeric-string form the record parser matches. Deferred to `finalize`, after the flatten: a key
		* behind a wrapper only carries its own `type` before then, and a union key only has its branches.
		*
		* A numeric bound cannot apply to a property name, so `minimum` and its siblings are dropped rather
		* than carried over: keeping them beside `type: "string"` reproduces the match-nothing schema this
		* exists to fix. A key that carries one therefore emits wider than the record parses — `z.record(z.number().min(5), V)`
		* accepts `"3"` — which is the deliberate trade, since throwing on it would reject an ordinary schema
		* outright. */
		function stringifyKeyNames(bySchema, json, visited) {
			if (json.$ref) {
				if (visited.has(json)) return json;
				visited.add(json);
				const def = bySchema.get(json)?.def;
				if (!def) return json;
				const inlined = stringifyKeyNames(bySchema, def, visited);
				return inlined === def ? json : inlined;
			}
			for (const keyword of ["anyOf", "oneOf"]) {
				const branches = json[keyword];
				if (!Array.isArray(branches)) continue;
				const mapped = branches.map((branch) => stringifyKeyNames(bySchema, branch, visited));
				if (mapped.some((branch, i) => branch !== branches[i])) json = {
					...json,
					[keyword]: mapped
				};
			}
			const types = Array.isArray(json.type) ? json.type : [json.type];
			const numericType = !types.includes("string") && types.some((t) => t === "number" || t === "integer");
			const values = json.enum ?? (json.const !== void 0 ? [json.const] : void 0);
			if (!numericType && !values?.some((v) => typeof v === "number")) return json;
			const { minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, format, id, ...rest } = json;
			if (rest.enum) rest.enum = rest.enum.map((v) => typeof v === "number" ? String(v) : v);
			else if (typeof rest.const === "number") rest.const = String(rest.const);
			if (!numericType) return rest;
			rest.type = "string";
			if (!values) rest.pattern = (types.includes("number") ? number$1 : integer).source;
			return rest;
		}
		/** Every record of one conversion, so the carriers are found in a single pass rather than once per record. */
		const pendingRecords = /* @__PURE__ */ new WeakMap();
		function rewriteKeyNames(ctx) {
			const bySchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.values()) if (entry.def && !bySchema.has(entry.schema)) bySchema.set(entry.schema, entry);
			const rewrites = /* @__PURE__ */ new Map();
			for (const record of pendingRecords.get(ctx) ?? []) {
				const seen = ctx.seen.get(record);
				const names = (seen?.def ?? seen?.schema)?.propertyNames;
				if (!names || names === true || rewrites.has(names)) continue;
				const rewritten = stringifyKeyNames(bySchema, names, /* @__PURE__ */ new Set());
				if (rewritten !== names) rewrites.set(names, rewritten);
			}
			if (!rewrites.size) return;
			for (const entry of ctx.seen.values()) for (const carrier of [entry.schema, entry.def]) {
				const rewritten = carrier && rewrites.get(carrier.propertyNames);
				if (rewritten) carrier.propertyNames = rewritten;
			}
		}
		const recordProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			const keyType = def.keyType;
			const patterns = keyType._zod.bag?.patterns;
			if (def.mode === "loose" && patterns && patterns.size > 0) {
				const valueSchema = process(def.valueType, ctx, {
					...params,
					path: [
						...params.path,
						"patternProperties",
						"*"
					]
				});
				json.patternProperties = {};
				for (const pattern of patterns) assignProp(json.patternProperties, pattern.source, valueSchema);
			} else {
				if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
					json.propertyNames = process(def.keyType, ctx, {
						...params,
						path: [...params.path, "propertyNames"]
					});
					let pending = pendingRecords.get(ctx);
					if (!pending) {
						pending = [];
						pendingRecords.set(ctx, pending);
						ctx.deferred.push(() => rewriteKeyNames(ctx));
					}
					pending.push(schema);
				}
				json.additionalProperties = process(def.valueType, ctx, {
					...params,
					path: [...params.path, "additionalProperties"]
				});
			}
			const keyValues = keyType._zod.values;
			const omittableOnInput = ctx.io === "input" && inputOptin(def.valueType) !== void 0;
			if (keyValues && !def.partial && !omittableOnInput) {
				const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
				if (validKeyValues.length > 0) json.required = validKeyValues.map(String);
			}
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		/** Round-trips a default value through JSON so the emitted schema is guaranteed to be valid JSON.
		* A BigInt has no reliable encoding, so it goes through `unrepresentable` like any other
		* unrepresentable value. Returns a sentinel when the caller must not write a default of its own. */
		const UNREPRESENTABLE_DEFAULT = Symbol();
		function serializeDefaultValue(value, schema, ctx, json, params) {
			let unrepresentable = false;
			const serialized = JSON.stringify(value, (_, val) => {
				if (typeof val !== "bigint") return val;
				unrepresentable = true;
				return null;
			});
			if (!unrepresentable) return JSON.parse(serialized);
			handleUnrepresentable(schema, ctx, json, params, "BigInt defaults cannot be represented in JSON Schema");
			return UNREPRESENTABLE_DEFAULT;
		}
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
			if (value !== UNREPRESENTABLE_DEFAULT) json.default = value;
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io !== "input") return;
			const value = serializeDefaultValue(def.defaultValue, schema, ctx, json, params);
			if (value !== UNREPRESENTABLE_DEFAULT) json._prefault = value;
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				handleUnrepresentable(schema, ctx, json, params, "Dynamic catch values are not supported in JSON Schema");
				return;
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const lazyProcessor = (schema, ctx, _json, params) => {
			const innerType = schema._zod.innerType;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		//#endregion
		//#region ../../../zod/v4/classic/errors.js
		const _installedErrorProtos = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
		function _lazyMethod(proto, key, make) {
			Object.defineProperty(proto, key, {
				configurable: true,
				enumerable: false,
				get() {
					const value = make(this);
					Object.defineProperty(this, key, {
						value,
						configurable: true,
						writable: true
					});
					return value;
				},
				set(value) {
					Object.defineProperty(this, key, {
						value,
						configurable: true,
						writable: true
					});
				}
			});
		}
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			const proto = Object.getPrototypeOf(inst);
			if (_installedErrorProtos.has(proto)) return;
			_installedErrorProtos.add(proto);
			_lazyMethod(proto, "format", (self) => (mapper) => formatError(self, mapper));
			_lazyMethod(proto, "flatten", (self) => (mapper) => flattenError(self, mapper));
			_lazyMethod(proto, "addIssue", (self) => (issue) => {
				self.issues.push(issue);
				self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
			});
			_lazyMethod(proto, "addIssues", (self) => (issues) => {
				self.issues.push(...issues);
				self.message = JSON.stringify(self.issues, jsonStringifyReplacer, 2);
			});
			Object.defineProperty(proto, "isEmpty", {
				configurable: true,
				enumerable: false,
				get() {
					return this.issues.length === 0;
				}
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, void 0, { Parent: Error });
		//#endregion
		//#region ../../../zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region ../../../zod/v4/classic/schemas.js
		function _ensureDefaultLocale() {
			if (!globalConfig.localeError) config(en_default());
		}
		function _ensureDefaultMemoizer() {
			if (!globalConfig.memoizer) config({ memoizer: memoizer() });
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			_ensureDefaultLocale();
			$ZodType.init(inst, def);
			inst.def = def;
			inst.type = def.type;
			return inst;
		}, {
			check(...chks) {
				const def = this.def;
				return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
					check: ch,
					def: { check: "custom" },
					onattach: []
				} } : ch)] }), { parent: true });
			},
			with(...chks) {
				return this.check(...chks);
			},
			clone(def, params) {
				return clone(this, def, params);
			},
			brand() {
				return this;
			},
			register(reg, meta) {
				reg.add(this, meta);
				return this;
			},
			refine(check, params) {
				return this.check(refine(check, params));
			},
			superRefine(refinement, params) {
				return this.check(superRefine(refinement, params));
			},
			overwrite(fn) {
				return this.check(/* @__PURE__ */ _overwrite(fn));
			},
			optional() {
				return optional(this);
			},
			exactOptional() {
				return exactOptional(this);
			},
			nullable() {
				return nullable(this);
			},
			nullish() {
				return optional(nullable(this));
			},
			nonoptional(params) {
				return nonoptional(this, params);
			},
			array() {
				return array(this);
			},
			or(arg) {
				return union([this, arg]);
			},
			and(arg) {
				return intersection(this, arg);
			},
			transform(tx) {
				return pipe(this, transform(tx));
			},
			default(d) {
				return _default(this, d);
			},
			prefault(d) {
				return prefault(this, d);
			},
			catch(params) {
				return _catch(this, params);
			},
			pipe(target) {
				return pipe(this, target);
			},
			readonly() {
				return readonly(this);
			},
			describe(description) {
				const cl = this.clone();
				globalRegistry.add(cl, { description });
				return cl;
			},
			meta(...args) {
				if (args.length === 0) return globalRegistry.get(this);
				const cl = this.clone();
				globalRegistry.add(cl, args[0]);
				return cl;
			},
			isOptional() {
				return this.safeParse(void 0).success;
			},
			isNullable() {
				return this.safeParse(null).success;
			},
			apply(fn, ...args) {
				return args.length === 0 ? fn(this) : fn(this, ...args);
			},
			get "~standard"() {
				return hide(this, "~standard", {
					...standardProps(this),
					jsonSchema: {
						input: createStandardJSONSchemaMethod(this, "input"),
						output: createStandardJSONSchemaMethod(this, "output")
					}
				});
			},
			set "~standard"(value) {
				own(this, "~standard", value);
			},
			parse: function _parse(data, params) {
				return parse(this, data, params, { callee: _parse });
			},
			parseAsync: async function _parseAsync(data, params) {
				return await parseAsync(this, data, params, { callee: _parseAsync });
			},
			safeParse(data, params) {
				return safeParse(this, data, params);
			},
			async safeParseAsync(data, params) {
				return safeParseAsync(this, data, params);
			},
			get spa() {
				return this?.safeParseAsync;
			},
			set spa(value) {
				own(this, "spa", value);
			},
			encode: function _encode(data, params) {
				return encode(this, data, params, { callee: _encode });
			},
			decode: function _decode(data, params) {
				return decode(this, data, params, { callee: _decode });
			},
			encodeAsync: async function _encodeAsync(data, params) {
				return await encodeAsync(this, data, params, { callee: _encodeAsync });
			},
			decodeAsync: async function _decodeAsync(data, params) {
				return await decodeAsync(this, data, params, { callee: _decodeAsync });
			},
			safeEncode(data, params) {
				return safeEncode(this, data, params);
			},
			safeDecode(data, params) {
				return safeDecode(this, data, params);
			},
			async safeEncodeAsync(data, params) {
				return safeEncodeAsync(this, data, params);
			},
			async safeDecodeAsync(data, params) {
				return safeDecodeAsync(this, data, params);
			},
			toJSONSchema(params) {
				return createToJSONSchemaMethod(this, {})(params);
			},
			get description() {
				return globalRegistry.get(this)?.description;
			},
			get _def() {
				return this._zod.def;
			}
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
		}, {
			regex(...args) {
				return this.check(/* @__PURE__ */ _regex(...args));
			},
			includes(...args) {
				return this.check(/* @__PURE__ */ _includes(...args));
			},
			startsWith(...args) {
				return this.check(/* @__PURE__ */ _startsWith(...args));
			},
			endsWith(...args) {
				return this.check(/* @__PURE__ */ _endsWith(...args));
			},
			min(...args) {
				return this.check(/* @__PURE__ */ _minLength(...args));
			},
			max(...args) {
				return this.check(/* @__PURE__ */ _maxLength(...args));
			},
			length(...args) {
				return this.check(/* @__PURE__ */ _length(...args));
			},
			nonempty(...args) {
				return this.check(/* @__PURE__ */ _minLength(1, ...args));
			},
			lowercase(params) {
				return this.check(/* @__PURE__ */ _lowercase(params));
			},
			uppercase(params) {
				return this.check(/* @__PURE__ */ _uppercase(params));
			},
			trim() {
				return this.check(/* @__PURE__ */ _trim());
			},
			normalize(...args) {
				return this.check(/* @__PURE__ */ _normalize(...args));
			},
			toLowerCase() {
				return this.check(/* @__PURE__ */ _toLowerCase());
			},
			toUpperCase() {
				return this.check(/* @__PURE__ */ _toUpperCase());
			},
			slugify() {
				return this.check(/* @__PURE__ */ _slugify());
			}
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
		}, {
			email(params) {
				return this.check(/* @__PURE__ */ _email(ZodEmail, params));
			},
			url(params) {
				return this.check(/* @__PURE__ */ _url(ZodURL, params));
			},
			jwt(params) {
				return this.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			},
			emoji(params) {
				return this.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			},
			guid(params) {
				return this.check(/* @__PURE__ */ _guid(ZodGUID, params));
			},
			uuid(params) {
				return this.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			},
			uuidv4(params) {
				return this.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			},
			uuidv6(params) {
				return this.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			},
			uuidv7(params) {
				return this.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			},
			nanoid(params) {
				return this.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			},
			cuid(params) {
				return this.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			},
			cuid2(params) {
				return this.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			},
			ulid(params) {
				return this.check(/* @__PURE__ */ _ulid(ZodULID, params));
			},
			base64(params) {
				return this.check(/* @__PURE__ */ _base64(ZodBase64, params));
			},
			base64url(params) {
				return this.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			},
			xid(params) {
				return this.check(/* @__PURE__ */ _xid(ZodXID, params));
			},
			ksuid(params) {
				return this.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			},
			ipv4(params) {
				return this.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			},
			ipv6(params) {
				return this.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			},
			cidrv4(params) {
				return this.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			},
			cidrv6(params) {
				return this.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			},
			e164(params) {
				return this.check(/* @__PURE__ */ _e164(ZodE164, params));
			},
			datetime(params) {
				return this.check(/* @__PURE__ */ _isoDateTime(ZodISODateTime, params));
			},
			date(params) {
				return this.check(/* @__PURE__ */ _isoDate(ZodISODate, params));
			},
			time(params) {
				return this.check(/* @__PURE__ */ _isoTime(ZodISOTime, params));
			},
			duration(params) {
				return this.check(/* @__PURE__ */ _isoDuration(ZodISODuration, params));
			}
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		}, {
			gt(value, params) {
				return this.check(/* @__PURE__ */ _gt(value, params));
			},
			gte(value, params) {
				return this.check(/* @__PURE__ */ _gte(value, params));
			},
			min(value, params) {
				return this.check(/* @__PURE__ */ _gte(value, params));
			},
			lt(value, params) {
				return this.check(/* @__PURE__ */ _lt(value, params));
			},
			lte(value, params) {
				return this.check(/* @__PURE__ */ _lte(value, params));
			},
			max(value, params) {
				return this.check(/* @__PURE__ */ _lte(value, params));
			},
			int(params) {
				return this.check(int(params));
			},
			safe(params) {
				return this.check(int(params));
			},
			positive(params) {
				return this.check(/* @__PURE__ */ _gt(0, params));
			},
			nonnegative(params) {
				return this.check(/* @__PURE__ */ _gte(0, params));
			},
			negative(params) {
				return this.check(/* @__PURE__ */ _lt(0, params));
			},
			nonpositive(params) {
				return this.check(/* @__PURE__ */ _lte(0, params));
			},
			multipleOf(value, params) {
				return this.check(/* @__PURE__ */ _multipleOf(value, params));
			},
			step(value, params) {
				return this.check(/* @__PURE__ */ _multipleOf(value, params));
			},
			finite() {
				return this;
			}
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodUndefined = /*@__PURE__*/ $constructor("ZodUndefined", (inst, def) => {
			$ZodUndefined.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => undefinedProcessor(inst, ctx, json, params);
		});
		function _undefined(params) {
			return /* @__PURE__ */ _undefined$1(ZodUndefined, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			_ensureDefaultMemoizer();
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
		}, {
			min(n, params) {
				return this.check(/* @__PURE__ */ _minLength(n, params));
			},
			nonempty(params) {
				return this.check(/* @__PURE__ */ _minLength(1, params));
			},
			max(n, params) {
				return this.check(/* @__PURE__ */ _maxLength(n, params));
			},
			length(n, params) {
				return this.check(/* @__PURE__ */ _length(n, params));
			},
			unwrap() {
				return this.element;
			}
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			_ensureDefaultMemoizer();
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
		}, {
			keyof() {
				return _enum(Object.keys(this._zod.def.shape));
			},
			catchall(catchall) {
				return this.clone({
					...this._zod.def,
					catchall
				});
			},
			passthrough() {
				return this.clone({
					...this._zod.def,
					catchall: unknown()
				});
			},
			loose() {
				return this.clone({
					...this._zod.def,
					catchall: unknown()
				});
			},
			strict() {
				return this.clone({
					...this._zod.def,
					catchall: never()
				});
			},
			strip() {
				return this.clone({
					...this._zod.def,
					catchall: void 0
				});
			},
			extend(incoming) {
				return extend(this, incoming);
			},
			safeExtend(incoming) {
				return safeExtend(this, incoming);
			},
			merge(other) {
				return merge(this, other);
			},
			pick(mask) {
				return pick(this, mask);
			},
			omit(mask) {
				return omit(this, mask);
			},
			partial(...args) {
				return partial(ZodOptional, this, args[0]);
			},
			exactPartial(...args) {
				return partial(ZodExactOptional, this, args[0], "exactPartial");
			},
			required(...args) {
				return required(ZodNonOptional, this, args[0]);
			}
		});
		function object(shape, params) {
			const def = {
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			};
			return new ZodObject(def);
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodRecord = /*@__PURE__*/ $constructor("ZodRecord", (inst, def) => {
			_ensureDefaultMemoizer();
			$ZodRecord.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => recordProcessor(inst, ctx, json, params);
			inst.keyType = def.keyType;
			inst.valueType = def.valueType;
		});
		function record(keyType, valueType, params) {
			if (!valueType || !valueType._zod) return new ZodRecord({
				type: "record",
				keyType: string(),
				valueType: keyType,
				...normalizeParams(valueType)
			});
			return new ZodRecord({
				type: "record",
				keyType,
				valueType,
				...normalizeParams(params)
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
			return new ZodEnum({
				type: "enum",
				entries,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			_ensureDefaultMemoizer();
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						if (!("input" in _issue)) _issue.input = payload.value;
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					return payload;
				});
				payload.value = output;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : constantCatch(catchValue)
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodLazy = /*@__PURE__*/ $constructor("ZodLazy", (inst, def) => {
			$ZodLazy.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => lazyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.getter();
		});
		function lazy(getter) {
			return new ZodLazy({
				type: "lazy",
				getter
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		//#endregion
		//#region ../../estate/drafts/lib/typert.remote-client.js
		let JsonValueRemoteCodec$schema$value$1;
		const JsonValueRemoteCodec$schema$1 = () => JsonValueRemoteCodec$schema$value$1 ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema$1())).readonly()
		]);
		let JsonValueRemoteCodec$schema2$value$1;
		const JsonValueRemoteCodec$schema2$1 = () => JsonValueRemoteCodec$schema2$value$1 ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema2$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema2$1())).readonly()
		]);
		let JsonValueRemoteCodec$schema3$value$1;
		const JsonValueRemoteCodec$schema3$1 = () => JsonValueRemoteCodec$schema3$value$1 ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema3$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema3$1())).readonly()
		]);
		let JsonValueRemoteCodec$schema4$value$1;
		const JsonValueRemoteCodec$schema4$1 = () => JsonValueRemoteCodec$schema4$value$1 ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema4$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema4$1())).readonly()
		]);
		let JsonValueRemoteCodec$schema5$value$1;
		const JsonValueRemoteCodec$schema5$1 = () => JsonValueRemoteCodec$schema5$value$1 ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema5$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema5$1())).readonly()
		]);
		let JsonValueRemoteCodec$schema6$value$1;
		const JsonValueRemoteCodec$schema6$1 = () => JsonValueRemoteCodec$schema6$value$1 ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema6$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema6$1())).readonly()
		]);
		let JsonValueRemoteCodec$schema7$value$1;
		const JsonValueRemoteCodec$schema7$1 = () => JsonValueRemoteCodec$schema7$value$1 ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema7$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema7$1())).readonly()
		]);
		let JsonValueRemoteCodec$schema8$value;
		const JsonValueRemoteCodec$schema8 = () => JsonValueRemoteCodec$schema8$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema8())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema8())).readonly()
		]);
		let JsonValueRemoteCodec$schema9$value;
		const JsonValueRemoteCodec$schema9 = () => JsonValueRemoteCodec$schema9$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema9())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema9())).readonly()
		]);
		let JsonValueRemoteCodec$schema10$value;
		const JsonValueRemoteCodec$schema10 = () => JsonValueRemoteCodec$schema10$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema10())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema10())).readonly()
		]);
		let JsonValueRemoteCodec$schema11$value;
		const JsonValueRemoteCodec$schema11 = () => JsonValueRemoteCodec$schema11$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema11())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema11())).readonly()
		]);
		let JsonValueRemoteCodec$schema12$value;
		const JsonValueRemoteCodec$schema12 = () => JsonValueRemoteCodec$schema12$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema12())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema12())).readonly()
		]);
		let JsonValueRemoteCodec$schema13$value;
		const JsonValueRemoteCodec$schema13 = () => JsonValueRemoteCodec$schema13$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema13())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema13())).readonly()
		]);
		let JsonValueRemoteCodec$schema14$value;
		const JsonValueRemoteCodec$schema14 = () => JsonValueRemoteCodec$schema14$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema14())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema14())).readonly()
		]);
		let JsonValueRemoteCodec$schema15$value;
		const JsonValueRemoteCodec$schema15 = () => JsonValueRemoteCodec$schema15$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema15())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema15())).readonly()
		]);
		let JsonValueRemoteCodec$schema16$value;
		const JsonValueRemoteCodec$schema16 = () => JsonValueRemoteCodec$schema16$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema16())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
		]);
		let _melite_estate_drafts_bench_add_stage_parameter_0$schema$value;
		const _melite_estate_drafts_bench_add_stage_parameter_0$schema = () => _melite_estate_drafts_bench_add_stage_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_add_stage_parameter_1$schema$value;
		const _melite_estate_drafts_bench_add_stage_parameter_1$schema = () => _melite_estate_drafts_bench_add_stage_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema6$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema6$1())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_add_stage_result$schema$value;
		const _melite_estate_drafts_bench_add_stage_result$schema = () => _melite_estate_drafts_bench_add_stage_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"stage": string().readonly()
		});
		let _melite_estate_drafts_bench_clear_parameter_0$schema$value;
		const _melite_estate_drafts_bench_clear_parameter_0$schema = () => _melite_estate_drafts_bench_clear_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_clear_parameter_1$schema$value;
		const _melite_estate_drafts_bench_clear_parameter_1$schema = () => _melite_estate_drafts_bench_clear_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema8())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema8())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_clear_result$schema$value;
		const _melite_estate_drafts_bench_clear_result$schema = () => _melite_estate_drafts_bench_clear_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"cleared": number().readonly()
		});
		let _melite_estate_drafts_bench_ensure_parameter_0$schema$value;
		const _melite_estate_drafts_bench_ensure_parameter_0$schema = () => _melite_estate_drafts_bench_ensure_parameter_0$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema3$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema3$1())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_ensure_result$schema$value;
		const _melite_estate_drafts_bench_ensure_result$schema = () => _melite_estate_drafts_bench_ensure_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"intent": union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema4$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema4$1())).readonly()
			]).readonly(),
			"stages": union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema4$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema4$1())).readonly()
			]).readonly(),
			"created": boolean().readonly()
		});
		let _melite_estate_drafts_bench_get_parameter_0$schema$value;
		const _melite_estate_drafts_bench_get_parameter_0$schema = () => _melite_estate_drafts_bench_get_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_get_result$schema$value;
		const _melite_estate_drafts_bench_get_result$schema = () => _melite_estate_drafts_bench_get_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"intent": union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema$1())).readonly()
			]).readonly(),
			"stages": union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema$1())).readonly()
			]).readonly(),
			"log": array(record(string(), union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema$1())).readonly()
			])).readonly()).readonly()
		});
		let _melite_estate_drafts_bench_group_parameter_0$schema$value;
		const _melite_estate_drafts_bench_group_parameter_0$schema = () => _melite_estate_drafts_bench_group_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_group_parameter_1$schema$value;
		const _melite_estate_drafts_bench_group_parameter_1$schema = () => _melite_estate_drafts_bench_group_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema11())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema11())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_group_result$schema$value;
		const _melite_estate_drafts_bench_group_result$schema = () => _melite_estate_drafts_bench_group_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"stage": string().readonly()
		});
		let _melite_estate_drafts_bench_patch_parameter_0$schema$value;
		const _melite_estate_drafts_bench_patch_parameter_0$schema = () => _melite_estate_drafts_bench_patch_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_patch_parameter_1$schema$value;
		const _melite_estate_drafts_bench_patch_parameter_1$schema = () => _melite_estate_drafts_bench_patch_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema5$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema5$1())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_patch_result$schema$value;
		const _melite_estate_drafts_bench_patch_result$schema = () => _melite_estate_drafts_bench_patch_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"stage": string().readonly(),
			"patched": array(string()).readonly(),
			"dropped": union([_undefined(), array(string())]).readonly().optional()
		});
		let _melite_estate_drafts_bench_remove_stage_parameter_0$schema$value;
		const _melite_estate_drafts_bench_remove_stage_parameter_0$schema = () => _melite_estate_drafts_bench_remove_stage_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_remove_stage_parameter_1$schema$value;
		const _melite_estate_drafts_bench_remove_stage_parameter_1$schema = () => _melite_estate_drafts_bench_remove_stage_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema7$1())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema7$1())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_remove_stage_result$schema$value;
		const _melite_estate_drafts_bench_remove_stage_result$schema = () => _melite_estate_drafts_bench_remove_stage_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"stage": string().readonly()
		});
		let _melite_estate_drafts_bench_reorder_parameter_0$schema$value;
		const _melite_estate_drafts_bench_reorder_parameter_0$schema = () => _melite_estate_drafts_bench_reorder_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_reorder_parameter_1$schema$value;
		const _melite_estate_drafts_bench_reorder_parameter_1$schema = () => _melite_estate_drafts_bench_reorder_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema10())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema10())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_reorder_result$schema$value;
		const _melite_estate_drafts_bench_reorder_result$schema = () => _melite_estate_drafts_bench_reorder_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"stage": string().readonly(),
			"from": number().readonly(),
			"to": number().readonly()
		});
		let _melite_estate_drafts_bench_rewire_parameter_0$schema$value;
		const _melite_estate_drafts_bench_rewire_parameter_0$schema = () => _melite_estate_drafts_bench_rewire_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_rewire_parameter_1$schema$value;
		const _melite_estate_drafts_bench_rewire_parameter_1$schema = () => _melite_estate_drafts_bench_rewire_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema9())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema9())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_rewire_result$schema$value;
		const _melite_estate_drafts_bench_rewire_result$schema = () => _melite_estate_drafts_bench_rewire_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"stage": string().readonly(),
			"input": string().readonly()
		});
		let _melite_estate_drafts_bench_subscribe_parameter_0$schema$value;
		const _melite_estate_drafts_bench_subscribe_parameter_0$schema = () => _melite_estate_drafts_bench_subscribe_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_subscribe_result$schema$value;
		const _melite_estate_drafts_bench_subscribe_result$schema = () => _melite_estate_drafts_bench_subscribe_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"intent": union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema2$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema2$1())).readonly()
			]).readonly(),
			"stages": union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema2$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema2$1())).readonly()
			]).readonly(),
			"log": array(record(string(), union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema2$1())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema2$1())).readonly()
			])).readonly()).readonly()
		});
		let _melite_estate_drafts_bench_undo_parameter_0$schema$value;
		const _melite_estate_drafts_bench_undo_parameter_0$schema = () => _melite_estate_drafts_bench_undo_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_undo_parameter_1$schema$value;
		const _melite_estate_drafts_bench_undo_parameter_1$schema = () => _melite_estate_drafts_bench_undo_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema13())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema13())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_undo_result$schema$value;
		const _melite_estate_drafts_bench_undo_result$schema = () => _melite_estate_drafts_bench_undo_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"undone": array(number()).readonly(),
			"stages": union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema14())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema14())).readonly()
			]).readonly()
		});
		let _melite_estate_drafts_bench_ungroup_parameter_0$schema$value;
		const _melite_estate_drafts_bench_ungroup_parameter_0$schema = () => _melite_estate_drafts_bench_ungroup_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_bench_ungroup_parameter_1$schema$value;
		const _melite_estate_drafts_bench_ungroup_parameter_1$schema = () => _melite_estate_drafts_bench_ungroup_parameter_1$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema12())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema12())).readonly()
		])).readonly();
		let _melite_estate_drafts_bench_ungroup_result$schema$value;
		const _melite_estate_drafts_bench_ungroup_result$schema = () => _melite_estate_drafts_bench_ungroup_result$schema$value ??= object({
			"draft_id": string().readonly(),
			"session": string().readonly(),
			"rev": number().readonly(),
			"stage": string().readonly()
		});
		let _melite_estate_drafts_drafts_get_parameter_0$schema$value;
		const _melite_estate_drafts_drafts_get_parameter_0$schema = () => _melite_estate_drafts_drafts_get_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_drafts_get_result$schema$value;
		const _melite_estate_drafts_drafts_get_result$schema = () => _melite_estate_drafts_drafts_get_result$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema15())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema15())).readonly()
		])).readonly();
		let _melite_estate_drafts_drafts_list_result$schema$value;
		const _melite_estate_drafts_drafts_list_result$schema = () => _melite_estate_drafts_drafts_list_result$schema$value ??= object({
			"count": number().readonly(),
			"drafts": array(object({
				"draft_id": string().readonly(),
				"model": string().readonly(),
				"name": string().readonly()
			})).readonly()
		});
		let _melite_estate_drafts_drafts_patch_parameter_0$schema$value;
		const _melite_estate_drafts_drafts_patch_parameter_0$schema = () => _melite_estate_drafts_drafts_patch_parameter_0$schema$value ??= string();
		let _melite_estate_drafts_drafts_patch_parameter_1$schema$value;
		const _melite_estate_drafts_drafts_patch_parameter_1$schema = () => _melite_estate_drafts_drafts_patch_parameter_1$schema$value ??= string();
		let _melite_estate_drafts_drafts_patch_parameter_2$schema$value;
		const _melite_estate_drafts_drafts_patch_parameter_2$schema = () => _melite_estate_drafts_drafts_patch_parameter_2$schema$value ??= object({
			"params": union([
				_undefined(),
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(union([
					literal(null),
					string(),
					number(),
					literal(false),
					literal(true),
					array(lazy(() => JsonValueRemoteCodec$schema16())),
					record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
				])),
				record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
			]).optional(),
			"result": union([
				_undefined(),
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(union([
					literal(null),
					string(),
					number(),
					literal(false),
					literal(true),
					array(lazy(() => JsonValueRemoteCodec$schema16())),
					record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
				])),
				record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
			]).optional(),
			"runStatus": union([
				_undefined(),
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(union([
					literal(null),
					string(),
					number(),
					literal(false),
					literal(true),
					array(lazy(() => JsonValueRemoteCodec$schema16())),
					record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
				])),
				record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
			]).optional(),
			"health": union([
				_undefined(),
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(union([
					literal(null),
					string(),
					number(),
					literal(false),
					literal(true),
					array(lazy(() => JsonValueRemoteCodec$schema16())),
					record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
				])),
				record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
			]).optional(),
			"inputs": union([
				_undefined(),
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(union([
					literal(null),
					string(),
					number(),
					literal(false),
					literal(true),
					array(lazy(() => JsonValueRemoteCodec$schema16())),
					record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
				])),
				record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
			]).optional(),
			"inputOutputs": union([
				_undefined(),
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(union([
					literal(null),
					string(),
					number(),
					literal(false),
					literal(true),
					array(lazy(() => JsonValueRemoteCodec$schema16())),
					record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
				])),
				record(string(), lazy(() => JsonValueRemoteCodec$schema16())).readonly()
			]).optional()
		});
		let _melite_estate_drafts_drafts_patch_parameter_3$schema$value;
		const _melite_estate_drafts_drafts_patch_parameter_3$schema = () => _melite_estate_drafts_drafts_patch_parameter_3$schema$value ??= union([literal(null), number()]);
		let _melite_estate_drafts_drafts_patch_result$schema$value;
		const _melite_estate_drafts_drafts_patch_result$schema = () => _melite_estate_drafts_drafts_patch_result$schema$value ??= object({
			"draftId": string(),
			"stageId": string(),
			"delivered": boolean(),
			"reason": union([_undefined(), string()]).optional(),
			"patched": union([_undefined(), array(string())]).optional(),
			"rev": union([_undefined(), number()]).optional()
		});
		const TYPERT_REMOTE$3 = {
			package: "@melite/estate-drafts",
			descriptors: [
				{
					id: "@melite/estate-drafts#bench/add-stage",
					service: "benchRemote",
					namespace: "bench",
					method: "add-stage",
					implementation: "remoteExportAddStage",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/add-stage:sessionKey",
							create: _melite_estate_drafts_bench_add_stage_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_add_stage_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchStageRow",
						create: _melite_estate_drafts_bench_add_stage_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1524,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/clear",
					service: "benchRemote",
					namespace: "bench",
					method: "clear",
					implementation: "remoteExportClear",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/clear:sessionKey",
							create: _melite_estate_drafts_bench_clear_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_clear_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchClearRow",
						create: _melite_estate_drafts_bench_clear_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1547,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/ensure",
					service: "benchRemote",
					namespace: "bench",
					method: "ensure",
					implementation: "remoteExportEnsure",
					invocation: { kind: "direct" },
					parameters: [{
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_ensure_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchEnsureRow",
						create: _melite_estate_drafts_bench_ensure_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1455,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/get",
					service: "benchRemote",
					namespace: "bench",
					method: "get",
					implementation: "remoteExportGet",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/get:sessionKey",
							create: _melite_estate_drafts_bench_get_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchGetRow",
						create: _melite_estate_drafts_bench_get_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1350,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/group",
					service: "benchRemote",
					namespace: "bench",
					method: "group",
					implementation: "remoteExportGroup",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/group:sessionKey",
							create: _melite_estate_drafts_bench_group_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_group_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchStageRow",
						create: _melite_estate_drafts_bench_group_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1585,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/patch",
					service: "benchRemote",
					namespace: "bench",
					method: "patch",
					implementation: "remoteExportPatch",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/patch:sessionKey",
							create: _melite_estate_drafts_bench_patch_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_patch_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchPatchRow",
						create: _melite_estate_drafts_bench_patch_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1514,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/remove-stage",
					service: "benchRemote",
					namespace: "bench",
					method: "remove-stage",
					implementation: "remoteExportRemoveStage",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/remove-stage:sessionKey",
							create: _melite_estate_drafts_bench_remove_stage_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_remove_stage_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchStageRow",
						create: _melite_estate_drafts_bench_remove_stage_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1534,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/reorder",
					service: "benchRemote",
					namespace: "bench",
					method: "reorder",
					implementation: "remoteExportReorder",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/reorder:sessionKey",
							create: _melite_estate_drafts_bench_reorder_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_reorder_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchReorderRow",
						create: _melite_estate_drafts_bench_reorder_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1568,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/rewire",
					service: "benchRemote",
					namespace: "bench",
					method: "rewire",
					implementation: "remoteExportRewire",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/rewire:sessionKey",
							create: _melite_estate_drafts_bench_rewire_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_rewire_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchRewireRow",
						create: _melite_estate_drafts_bench_rewire_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1557,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/subscribe",
					service: "benchRemote",
					namespace: "bench",
					method: "subscribe",
					mode: "stream",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/subscribe:sessionKey",
							create: _melite_estate_drafts_bench_subscribe_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchGetRow",
						create: _melite_estate_drafts_bench_subscribe_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1368,
						"column": 10
					}
				},
				{
					id: "@melite/estate-drafts#bench/undo",
					service: "benchRemote",
					namespace: "bench",
					method: "undo",
					implementation: "remoteExportUndo",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/undo:sessionKey",
							create: _melite_estate_drafts_bench_undo_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_undo_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchUndoRow",
						create: _melite_estate_drafts_bench_undo_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1617,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#bench/ungroup",
					service: "benchRemote",
					namespace: "bench",
					method: "ungroup",
					implementation: "remoteExportUngroup",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionKey",
						wire: "sessionKey",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#bench/ungroup:sessionKey",
							create: _melite_estate_drafts_bench_ungroup_parameter_0$schema
						}
					}, {
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts/types#BenchDoc",
							create: _melite_estate_drafts_bench_ungroup_parameter_1$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#BenchStageRow",
						create: _melite_estate_drafts_bench_ungroup_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 1601,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#drafts/get",
					service: "draftsRemote",
					namespace: "drafts",
					method: "get",
					implementation: "remoteExportGet",
					invocation: { kind: "direct" },
					parameters: [{
						name: "draftId",
						wire: "draftId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-drafts#drafts/get:draftId",
							create: _melite_estate_drafts_drafts_get_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#DraftGetRow",
						create: _melite_estate_drafts_drafts_get_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 674,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#drafts/list",
					service: "draftsRemote",
					namespace: "drafts",
					method: "list",
					implementation: "remoteExportList",
					invocation: { kind: "direct" },
					parameters: [],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#DraftListResult",
						create: _melite_estate_drafts_drafts_list_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 668,
						"column": 9
					}
				},
				{
					id: "@melite/estate-drafts#drafts/patch",
					service: "draftsRemote",
					namespace: "drafts",
					method: "patch",
					implementation: "remoteExportPatch",
					invocation: { kind: "direct" },
					parameters: [
						{
							name: "draftId",
							wire: "draftId",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@melite/estate-drafts#drafts/patch:draftId",
								create: _melite_estate_drafts_drafts_patch_parameter_0$schema
							}
						},
						{
							name: "stageId",
							wire: "stageId",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@melite/estate-drafts#drafts/patch:stageId",
								create: _melite_estate_drafts_drafts_patch_parameter_1$schema
							}
						},
						{
							name: "patch",
							wire: "patch",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@melite/estate-drafts/types#DraftStagePatch",
								create: _melite_estate_drafts_drafts_patch_parameter_2$schema
							}
						},
						{
							name: "expectRev",
							wire: "expectRev",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@melite/estate-drafts#drafts/patch:expectRev",
								create: _melite_estate_drafts_drafts_patch_parameter_3$schema
							}
						}
					],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-drafts/types#DraftPatchRow",
						create: _melite_estate_drafts_drafts_patch_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/drafts/src/remote.ts",
						"line": 761,
						"column": 9
					}
				}
			]
		};
		//#endregion
		//#region ../../estate/runs/lib/typert.remote-client.js
		let JsonValueRemoteCodec$schema$value;
		const JsonValueRemoteCodec$schema = () => JsonValueRemoteCodec$schema$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema())).readonly()
		]);
		let JsonValueRemoteCodec$schema2$value;
		const JsonValueRemoteCodec$schema2 = () => JsonValueRemoteCodec$schema2$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema2())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema2())).readonly()
		]);
		let JsonValueRemoteCodec$schema3$value;
		const JsonValueRemoteCodec$schema3 = () => JsonValueRemoteCodec$schema3$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema3())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema3())).readonly()
		]);
		let JsonValueRemoteCodec$schema4$value;
		const JsonValueRemoteCodec$schema4 = () => JsonValueRemoteCodec$schema4$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema4())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema4())).readonly()
		]);
		let JsonValueRemoteCodec$schema5$value;
		const JsonValueRemoteCodec$schema5 = () => JsonValueRemoteCodec$schema5$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema5())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema5())).readonly()
		]);
		let JsonValueRemoteCodec$schema6$value;
		const JsonValueRemoteCodec$schema6 = () => JsonValueRemoteCodec$schema6$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema6())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema6())).readonly()
		]);
		let JsonValueRemoteCodec$schema7$value;
		const JsonValueRemoteCodec$schema7 = () => JsonValueRemoteCodec$schema7$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema7())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema7())).readonly()
		]);
		let _melite_estate_runs_runs_list_parameter_0$schema$value;
		const _melite_estate_runs_runs_list_parameter_0$schema = () => _melite_estate_runs_runs_list_parameter_0$schema$value ??= string();
		let _melite_estate_runs_runs_list_result$schema$value;
		const _melite_estate_runs_runs_list_result$schema = () => _melite_estate_runs_runs_list_result$schema$value ??= object({
			"count": number(),
			"runs": array(record(string(), union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => JsonValueRemoteCodec$schema2())),
				record(string(), lazy(() => JsonValueRemoteCodec$schema2())).readonly()
			])).readonly())
		});
		let _melite_estate_runs_runs_start_parameter_0$schema$value;
		const _melite_estate_runs_runs_start_parameter_0$schema = () => _melite_estate_runs_runs_start_parameter_0$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema6())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema6())).readonly()
		])).readonly();
		let _melite_estate_runs_runs_start_result$schema$value;
		const _melite_estate_runs_runs_start_result$schema = () => _melite_estate_runs_runs_start_result$schema$value ??= object({
			"run_id": string(),
			"status": string(),
			"queue_position": number()
		});
		let _melite_estate_runs_runs_status_parameter_0$schema$value;
		const _melite_estate_runs_runs_status_parameter_0$schema = () => _melite_estate_runs_runs_status_parameter_0$schema$value ??= string();
		let _melite_estate_runs_runs_status_result$schema$value;
		const _melite_estate_runs_runs_status_result$schema = () => _melite_estate_runs_runs_status_result$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema7())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema7())).readonly()
		])).readonly();
		let _melite_estate_runs_runs_stop_parameter_0$schema$value;
		const _melite_estate_runs_runs_stop_parameter_0$schema = () => _melite_estate_runs_runs_stop_parameter_0$schema$value ??= string();
		let _melite_estate_runs_runs_stop_result$schema$value;
		const _melite_estate_runs_runs_stop_result$schema = () => _melite_estate_runs_runs_stop_result$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema())).readonly()
		])).readonly();
		let _melite_estate_runs_runs_subscribe_parameter_0$schema$value;
		const _melite_estate_runs_runs_subscribe_parameter_0$schema = () => _melite_estate_runs_runs_subscribe_parameter_0$schema$value ??= string();
		let _melite_estate_runs_runs_subscribe_result$schema$value;
		const _melite_estate_runs_runs_subscribe_result$schema = () => _melite_estate_runs_runs_subscribe_result$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema5())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema5())).readonly()
		])).readonly();
		let _melite_estate_runs_runs_validate_parameter_0$schema$value;
		const _melite_estate_runs_runs_validate_parameter_0$schema = () => _melite_estate_runs_runs_validate_parameter_0$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema3())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema3())).readonly()
		])).readonly();
		let _melite_estate_runs_runs_validate_result$schema$value;
		const _melite_estate_runs_runs_validate_result$schema = () => _melite_estate_runs_runs_validate_result$schema$value ??= record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => JsonValueRemoteCodec$schema4())),
			record(string(), lazy(() => JsonValueRemoteCodec$schema4())).readonly()
		])).readonly();
		const TYPERT_REMOTE$2 = {
			package: "@melite/estate-runs",
			descriptors: [
				{
					id: "@melite/estate-runs#runs/list",
					service: "runsRemote",
					namespace: "runs",
					method: "list",
					implementation: "remoteExportList",
					invocation: { kind: "direct" },
					parameters: [{
						name: "rawLimit",
						wire: "rawLimit",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-runs#runs/list:rawLimit",
							create: _melite_estate_runs_runs_list_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-runs#runs/list:result",
						create: _melite_estate_runs_runs_list_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/runs/src/index.ts",
						"line": 110,
						"column": 9
					}
				},
				{
					id: "@melite/estate-runs#runs/start",
					service: "runsRemote",
					namespace: "runs",
					method: "start",
					implementation: "remoteExportStart",
					invocation: { kind: "direct" },
					parameters: [{
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-runs/types#RunStartDoc",
							create: _melite_estate_runs_runs_start_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-runs#runs/start:result",
						create: _melite_estate_runs_runs_start_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/runs/src/index.ts",
						"line": 82,
						"column": 9
					}
				},
				{
					id: "@melite/estate-runs#runs/status",
					service: "runsRemote",
					namespace: "runs",
					method: "status",
					implementation: "remoteExportStatus",
					invocation: { kind: "direct" },
					parameters: [{
						name: "runId",
						wire: "runId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-runs#runs/status:runId",
							create: _melite_estate_runs_runs_status_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-runs/types#RunRow",
						create: _melite_estate_runs_runs_status_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/runs/src/index.ts",
						"line": 91,
						"column": 9
					}
				},
				{
					id: "@melite/estate-runs#runs/stop",
					service: "runsRemote",
					namespace: "runs",
					method: "stop",
					implementation: "remoteExportStop",
					invocation: { kind: "direct" },
					parameters: [{
						name: "runId",
						wire: "runId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-runs#runs/stop:runId",
							create: _melite_estate_runs_runs_stop_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-runs/types#RunRow",
						create: _melite_estate_runs_runs_stop_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/runs/src/index.ts",
						"line": 100,
						"column": 9
					}
				},
				{
					id: "@melite/estate-runs#runs/subscribe",
					service: "runsRemote",
					namespace: "runs",
					method: "subscribe",
					mode: "stream",
					invocation: { kind: "direct" },
					parameters: [{
						name: "runId",
						wire: "runId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-runs#runs/subscribe:runId",
							create: _melite_estate_runs_runs_subscribe_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-runs/types#RunRow",
						create: _melite_estate_runs_runs_subscribe_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/runs/src/index.ts",
						"line": 135,
						"column": 10
					}
				},
				{
					id: "@melite/estate-runs#runs/validate",
					service: "runsRemote",
					namespace: "runs",
					method: "validate",
					implementation: "remoteExportValidate",
					invocation: { kind: "direct" },
					parameters: [{
						name: "doc",
						wire: "doc",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@melite/estate-runs/types#RunStartDoc",
							create: _melite_estate_runs_runs_validate_parameter_0$schema
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@melite/estate-runs/types#RunRow",
						create: _melite_estate_runs_runs_validate_result$schema
					},
					sourceLocation: {
						"file": "packages/estate/runs/src/index.ts",
						"line": 119,
						"column": 9
					}
				}
			]
		};
		//#endregion
		//#region ../../estate/media/lib/typert.remote-client.js
		let _melite_estate_media_media_list_parameter_0$schema$value;
		const _melite_estate_media_media_list_parameter_0$schema = () => _melite_estate_media_media_list_parameter_0$schema$value ??= string();
		let _melite_estate_media_media_list_result$schema$value;
		const _melite_estate_media_media_list_result$schema = () => _melite_estate_media_media_list_result$schema$value ??= object({
			"count": number(),
			"items": array(object({
				"url": string().readonly(),
				"name": string().readonly(),
				"kind": string().readonly(),
				"runId": string().readonly(),
				"served_from": string().readonly()
			}))
		});
		const TYPERT_REMOTE$1 = {
			package: "@melite/estate-media",
			descriptors: [{
				id: "@melite/estate-media#media/list",
				service: "mediaRemote",
				namespace: "media",
				method: "list",
				implementation: "remoteExportList",
				invocation: { kind: "direct" },
				parameters: [{
					name: "kind",
					wire: "kind",
					source: "json",
					codec: {
						mode: "strict",
						typeSymbol: "@melite/estate-media#media/list:kind",
						create: _melite_estate_media_media_list_parameter_0$schema
					}
				}],
				cancellation: { parameter: "signal" },
				result: {
					mode: "strict",
					typeSymbol: "@melite/estate-media#media/list:result",
					create: _melite_estate_media_media_list_result$schema
				},
				sourceLocation: {
					"file": "packages/estate/media/src/index.ts",
					"line": 543,
					"column": 9
				}
			}]
		};
		//#endregion
		//#region ../../estate/manage/lib/typert.remote-client.js
		let ManageJsonValueRemoteCodec$schema$value;
		const ManageJsonValueRemoteCodec$schema = () => ManageJsonValueRemoteCodec$schema$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => ManageJsonValueRemoteCodec$schema())),
			record(string(), lazy(() => ManageJsonValueRemoteCodec$schema())).readonly()
		]);
		let ManageJsonValueRemoteCodec$schema2$value;
		const ManageJsonValueRemoteCodec$schema2 = () => ManageJsonValueRemoteCodec$schema2$value ??= union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => ManageJsonValueRemoteCodec$schema2())),
			record(string(), lazy(() => ManageJsonValueRemoteCodec$schema2())).readonly()
		]);
		let _melite_estate_manage_manage_act_parameter_0$schema$value;
		const _melite_estate_manage_manage_act_parameter_0$schema = () => _melite_estate_manage_manage_act_parameter_0$schema$value ??= intersection(object({ "action": string().readonly() }), record(string(), union([
			literal(null),
			string(),
			number(),
			literal(false),
			literal(true),
			array(lazy(() => ManageJsonValueRemoteCodec$schema())),
			record(string(), lazy(() => ManageJsonValueRemoteCodec$schema())).readonly()
		])).readonly());
		let _melite_estate_manage_manage_act_result$schema$value;
		const _melite_estate_manage_manage_act_result$schema = () => _melite_estate_manage_manage_act_result$schema$value ??= object({
			"action": string().readonly(),
			"ok": boolean().readonly(),
			"detail": string().readonly(),
			"data": union([
				_undefined(),
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(union([
					literal(null),
					string(),
					number(),
					literal(false),
					literal(true),
					array(lazy(() => ManageJsonValueRemoteCodec$schema2())),
					record(string(), lazy(() => ManageJsonValueRemoteCodec$schema2())).readonly()
				])),
				record(string(), lazy(() => ManageJsonValueRemoteCodec$schema2())).readonly()
			]).readonly().optional(),
			"status": union([_undefined(), number()]).readonly().optional(),
			"code": union([_undefined(), string()]).readonly().optional(),
			"state": union([_undefined(), string()]).readonly().optional(),
			"next_action": union([_undefined(), string()]).readonly().optional(),
			"operation_id": union([_undefined(), string()]).readonly().optional(),
			"operations": union([_undefined(), array(union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => ManageJsonValueRemoteCodec$schema2())),
				record(string(), lazy(() => ManageJsonValueRemoteCodec$schema2())).readonly()
			]))]).readonly().optional(),
			"items": union([_undefined(), array(union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => ManageJsonValueRemoteCodec$schema2())),
				record(string(), lazy(() => ManageJsonValueRemoteCodec$schema2())).readonly()
			]))]).readonly().optional(),
			"rows": union([_undefined(), array(union([
				literal(null),
				string(),
				number(),
				literal(false),
				literal(true),
				array(lazy(() => ManageJsonValueRemoteCodec$schema2())),
				record(string(), lazy(() => ManageJsonValueRemoteCodec$schema2())).readonly()
			]))]).readonly().optional(),
			"requested": union([_undefined(), array(string())]).readonly().optional(),
			"succeeded": union([_undefined(), array(string())]).readonly().optional(),
			"missed": union([_undefined(), array(string())]).readonly().optional(),
			"misses": union([_undefined(), array(string())]).readonly().optional(),
			"partial": union([
				_undefined(),
				literal(false),
				literal(true)
			]).readonly().optional(),
			"restart_required": union([
				_undefined(),
				literal(false),
				literal(true)
			]).readonly().optional()
		});
		const TYPERT_REMOTE = {
			package: "@melite/estate-manage",
			descriptors: [{
				id: "@melite/estate-manage#manage/act",
				service: "manageRemote",
				namespace: "manage",
				method: "act",
				implementation: "remoteExportAct",
				invocation: { kind: "direct" },
				parameters: [{
					name: "doc",
					wire: "doc",
					source: "json",
					codec: {
						mode: "strict",
						typeSymbol: "@melite/estate-manage/types#ManageActDoc",
						create: _melite_estate_manage_manage_act_parameter_0$schema
					}
				}],
				cancellation: { parameter: "signal" },
				result: {
					mode: "strict",
					typeSymbol: "@melite/estate-manage/types#ManageEnvelopeRow",
					create: _melite_estate_manage_manage_act_result$schema
				},
				sourceLocation: {
					"file": "packages/estate/manage/src/index.ts",
					"line": 57,
					"column": 9
				}
			}]
		};
		//#endregion
		//#region \0dsh-css:packages/web/melite-card-view/src/client/card.module.css.mjs
		const css$3 = ".qMfk9G_card{flex-direction:column;min-width:0;margin:4px 0;font-size:12px;line-height:1.45;display:flex}.qMfk9G_load{color:var(--dsw-alias-label-secondary);padding:2px 0}.qMfk9G_head{align-items:center;gap:8px;min-width:0;display:flex}.qMfk9G_model{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:600;overflow:hidden}.qMfk9G_state{corner-shape:round;border-radius:999px;flex:none;margin-left:auto;padding:1px 8px}.qMfk9G_state[data-state=completed]{color:var(--dsw-alias-state-success-primary)}.qMfk9G_state[data-state=running],.qMfk9G_state[data-state=queued],.qMfk9G_state[data-state=pending],.qMfk9G_state[data-state=starting],.qMfk9G_state[data-state=draft]{color:var(--dsw-alias-state-warn-primary)}.qMfk9G_state[data-state=failed],.qMfk9G_state[data-state=error],.qMfk9G_state[data-state=stopped],.qMfk9G_state[data-state=interrupted]{color:var(--dsw-alias-state-error-primary)}.qMfk9G_media{corner-shape:round;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;background:0 0;border:0;border-radius:999px;flex:none;margin:-2px 0 -2px auto;padding:1px 6px}.qMfk9G_media:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.qMfk9G_media:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:-1px}.qMfk9G_prompt{color:var(--dsw-alias-label-secondary);-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.qMfk9G_row{color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;width:100%;min-width:0;padding:4px 6px;display:flex}.qMfk9G_row:hover{background:var(--dsw-alias-interactive-bg-hover)}.qMfk9G_row:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:-1px}.qMfk9G_thumb{object-fit:cover;border-radius:4px;flex:none;width:34px;height:34px}.qMfk9G_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%;font-weight:600;overflow:hidden}.qMfk9G_drill{width:92vw;max-width:min(860px,92vw)}.qMfk9G_paramsCol,.qMfk9G_params{flex-direction:column;gap:8px;min-width:0;display:flex}.qMfk9G_field{flex-direction:column;gap:3px;min-width:0;display:flex}.qMfk9G_fieldKey{color:var(--dsw-alias-label-secondary);font-size:11px}.qMfk9G_outputs{flex-direction:column;align-items:center;gap:10px;min-width:0;display:flex}.qMfk9G_reportList{flex-direction:column;gap:8px;width:100%;min-width:0;display:flex}.qMfk9G_outputImg{object-fit:contain;border-radius:8px;max-width:100%;max-height:46vh}.qMfk9G_runRow{justify-content:flex-end;align-items:center;gap:10px;width:100%;display:flex}.qMfk9G_runError{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0;font-size:11px}.qMfk9G_rowWrap{flex-direction:column;display:flex;position:relative}.qMfk9G_errorDismiss{color:var(--dsw-alias-state-error-primary);position:absolute;top:2px;right:2px}.qMfk9G_flowLink{flex:none;margin-left:auto;text-decoration:underline}.qMfk9G_failed,.qMfk9G_missing{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0;font-size:11px}.qMfk9G_loading{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;padding:2px 0;font-size:11px}.qMfk9G_rowError{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;flex-basis:100%;font-size:11px;display:block}.qMfk9G_drillRunRow{background:var(--dsw-alias-bg-base);border-top:1px solid var(--dsw-alias-border-l2);z-index:1;justify-content:flex-end;align-items:center;gap:8px;margin-top:8px;padding:10px 0 4px;display:flex;position:sticky;bottom:0}.qMfk9G_drillProgress{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;align-items:center;gap:6px;font-size:11px;display:inline-flex}.qMfk9G_drillProgress>svg{animation:1s linear infinite qMfk9G_tileSpinTurn}.qMfk9G_state[data-state=legacy]{color:var(--dsw-alias-label-secondary)}.qMfk9G_cardsBench{overflow-anchor:none;flex-direction:column;flex:1;gap:8px;min-width:0;min-height:0;padding:0 14px 18px;display:flex;overflow-y:auto}.qMfk9G_benchHead{z-index:1;background:var(--dsw-alias-bg-base);justify-content:space-between;align-items:center;gap:8px;padding-top:12px;display:flex;position:sticky;top:0}.qMfk9G_revTag{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}.qMfk9G_runView{overflow-anchor:none;flex-direction:column;flex:1;gap:8px;min-width:0;min-height:0;display:flex;overflow-y:auto}.qMfk9G_runHead{z-index:1;background:var(--dsw-alias-bg-base);align-items:baseline;gap:8px;padding-top:12px;display:flex;position:sticky;top:0}.qMfk9G_runId{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:600}.qMfk9G_runStatus{border:.5px solid var(--dsw-alias-border-l2);corner-shape:round;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:0 8px;font-size:11px}.qMfk9G_runActions{gap:8px;display:flex}.qMfk9G_graphReceiptOk{border:.5px solid var(--dsw-alias-state-success-primary);corner-shape:round;color:var(--dsw-alias-state-success-primary);border-radius:999px;padding:0 8px;font-size:11px}.qMfk9G_graphReceiptPartial{border:.5px solid var(--dsw-alias-state-warn-primary);corner-shape:round;color:var(--dsw-alias-state-warn-primary);border-radius:999px;padding:0 8px;font-size:11px}.qMfk9G_restoreNote{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0;font-size:11px}.qMfk9G_mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;overflow-x:auto}.qMfk9G_tileGrid{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:0;padding:0;list-style:none;display:grid}.qMfk9G_tile{margin:0;padding:0;display:block}.qMfk9G_tileInner{border:.5px solid var(--dsw-alias-border-l2);cursor:pointer;transition:border-color var(--ds-transition-duration) var(--ds-ease-in-out), background-color var(--ds-transition-duration) var(--ds-ease-in-out);font:inherit;text-align:left;background:0 0;border-radius:10px;flex-direction:column;align-items:stretch;width:100%;padding:0;display:flex;overflow:hidden}.qMfk9G_tileInner:hover{border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}.qMfk9G_tilePreview{aspect-ratio:1;flex:1;width:100%;min-height:0;margin:0;display:block;position:relative}.qMfk9G_tileImg,.qMfk9G_tileImgLink{width:100%;height:100%;display:block}.qMfk9G_tileImg{object-fit:cover}.qMfk9G_tileVideoImg{object-fit:contain;width:100%;height:100%;display:block}.qMfk9G_audioBars{box-sizing:border-box;justify-content:center;align-items:flex-end;gap:2px;width:100%;height:100%;padding:18% 12%;display:flex}.qMfk9G_audioBar{background:var(--dsw-alias-state-business-primary);opacity:.85;border-radius:1px;flex:1;max-width:6px}.qMfk9G_kindFace{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);flex-direction:column;justify-content:center;align-items:center;gap:4px;width:100%;height:100%;display:flex}.qMfk9G_kindInitial{font-size:28px;font-weight:700;line-height:1}.qMfk9G_kindName{text-overflow:ellipsis;white-space:nowrap;padding:0 6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;overflow:hidden}.qMfk9G_tileDot{position:absolute;bottom:6px;right:6px}.qMfk9G_tileIconBtn{background:color-mix(in srgb, var(--dsw-alias-bg-base) 72%, transparent);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:0;height:24px;transition:opacity var(--ds-transition-duration) var(--ds-ease-in-out), color var(--ds-transition-duration) var(--ds-ease-in-out);z-index:2;border-radius:999px;justify-content:center;align-items:center;width:24px;padding:0;display:inline-flex;position:absolute}.qMfk9G_tileIconBtn:hover{border-color:var(--dsw-alias-border-l4);color:var(--dsw-alias-label-primary)}.qMfk9G_tileInner:hover .qMfk9G_tileIconBtn,.qMfk9G_tileIconBtn:focus-visible{opacity:1}.qMfk9G_tileIconBtn:disabled{cursor:default}.qMfk9G_tileTrash{color:var(--dsw-alias-label-tertiary);top:6px;right:6px}.qMfk9G_tileTrash:hover{color:var(--dsw-alias-state-error-primary)}.qMfk9G_tileRunBtn{color:var(--dsw-alias-label-secondary);bottom:6px;right:6px}.qMfk9G_tileRunBtn:hover{color:var(--dsw-alias-brand-primary)}.qMfk9G_tileSpin{color:var(--dsw-alias-brand-primary);z-index:2;align-items:center;display:inline-flex;position:absolute;bottom:6px;left:6px}.qMfk9G_tileSpin>svg{animation:1s linear infinite qMfk9G_tileSpinTurn}.qMfk9G_tilePct{font-variant-numeric:tabular-nums;margin-left:4px;font-size:11px}@keyframes qMfk9G_tileSpinTurn{to{transform:rotate(360deg)}}.qMfk9G_tileCaption{border-top:.5px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;gap:2px;padding:6px 8px;display:flex}.qMfk9G_tileTitle{text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;line-height:20px;overflow:hidden}.qMfk9G_tileMeta{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:17px;display:flex;overflow:hidden}.qMfk9G_tilePrompt{text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.qMfk9G_tileAdd .qMfk9G_tileInner{border-style:dashed}.qMfk9G_addFace{color:var(--dsw-alias-label-secondary);justify-content:center;align-items:center;font-size:34px;font-weight:300;display:flex}.qMfk9G_picker{flex-direction:column;gap:10px;max-height:60vh;margin-top:-6px;display:flex;overflow-y:auto}.qMfk9G_pickerGenre{flex-direction:column;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;display:grid}.qMfk9G_pickerGenreTitle{letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-primary);grid-column:1/-1;margin:12px 0 10px;font-size:15px;font-weight:700}.qMfk9G_drill [class*=_title_]{font-size:18px;font-weight:800}.qMfk9G_pickerCardLabel{font-size:12px;font-weight:500}.qMfk9G_pickerCard{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);width:100%;min-height:44px;color:inherit;cursor:pointer;font:inherit;text-align:left;background:0 0;border-radius:8px;justify-content:flex-start;align-items:baseline;gap:8px;width:100%;padding:8px 10px;display:flex}.qMfk9G_pickerCard:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-state-business-primary)}.qMfk9G_pickerCardLabel{white-space:nowrap;font-size:13px;font-weight:600}.qMfk9G_tileShared{display:block;position:relative}.qMfk9G_zoomOverlay{background:var(--dsw-alias-bg-overlay);z-index:80;flex-direction:column;display:flex;position:fixed;inset:0}.qMfk9G_zoomScroll{flex:1;min-height:0;overflow-y:auto}.qMfk9G_zoomInner{box-sizing:border-box;justify-content:center;align-items:center;width:100%;max-width:100%;min-height:100%;margin:0 auto;padding:24px;display:flex}.qMfk9G_tileDragOver{outline:2px dashed var(--dsw-alias-brand-primary);outline-offset:-2px}.qMfk9G_zoomCard{background:var(--dsw-alias-bg-layer-1);box-shadow:0 0 0 .5px color-mix(in srgb, var(--dsw-alias-label-primary) 16%, transparent), 0 3px 8px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent), 0 0 16px 0 color-mix(in srgb, var(--dsw-alias-label-primary) 2%, transparent);color:var(--dsw-alias-label-primary);border:0;border-radius:14px;flex-direction:column;min-height:320px;max-height:86vh;animation:.18s cubic-bezier(.2,.9,.3,1) qMfk9G_zoom-in;display:flex;overflow:hidden}@keyframes qMfk9G_zoom-in{0%{opacity:0;transform:scale(.92)}}.qMfk9G_zoomBar{border-bottom:.5px solid var(--dsw-alias-border-l2);flex:none;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;display:flex}.qMfk9G_zoomWebhook{color:var(--dsw-alias-label-secondary);align-items:center;gap:8px;width:100%;min-height:0;padding:2px 0;font-size:12px;display:flex}.qMfk9G_zoomMeter{background:var(--dsw-alias-border-l2);border-radius:999px;flex:auto;height:3px;overflow:hidden}.qMfk9G_zoomMeterFill{background:var(--dsw-alias-fill-brand-primary);height:100%;transition:width .24s;display:block}.qMfk9G_zoomTitle{flex:auto;font-size:13px;font-weight:600;line-height:20px}.qMfk9G_zoomDetail{overflow-anchor:none;min-height:0;padding:14px;display:block;overflow-y:auto}.qMfk9G_zoomBody{flex-direction:column;flex:1;min-height:0;display:flex;overflow:hidden}.qMfk9G_tabScroll{overflow-anchor:none;flex-direction:column;flex:1;min-width:0;height:100%;min-height:0;display:flex;overflow-y:auto}.qMfk9G_zoomSkeleton{flex-direction:column;flex:1;gap:10px;min-height:0;padding:16px;display:flex}.qMfk9G_skLine{will-change:background-position;background:linear-gradient(90deg, transparent 40%, var(--dsw-alias-interactive-bg-hover) 50%, transparent 60%);background-color:var(--dsw-alias-interactive-bg-hover);background-size:200% 100%;border-radius:6px;height:12px;animation:1s linear infinite both qMfk9G_zoomShimmer}.qMfk9G_skWide{width:60%}.qMfk9G_skShort{flex:1;height:28px}.qMfk9G_skBlock{border-radius:10px;height:120px}.qMfk9G_skRow{gap:10px;display:flex}@keyframes qMfk9G_zoomShimmer{0%{background-position:150% 0}to{background-position:-100% 0}}@keyframes qMfk9G_tilePop{0%{opacity:0;transform:scale(.96)translateY(6px)}60%{opacity:1;transform:scale(1.015)translateY(0)}to{opacity:1;transform:scale(1)translateY(0)}}.qMfk9G_tileEnter{animation:.26s cubic-bezier(.2,.8,.3,1) both qMfk9G_tilePop}.qMfk9G_tileDragging{opacity:.55;z-index:2}.qMfk9G_wiredMark{color:var(--dsw-alias-state-business-primary);font-size:10px}.qMfk9G_capOver{background:var(--dsw-alias-interactive-bg-hover);outline:1px dashed var(--dsw-alias-state-business-primary);outline-offset:4px}.qMfk9G_dangerVerb{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}.qMfk9G_groupBar{align-items:center;gap:8px;display:flex}.qMfk9G_checkCircle{border:1.5px solid var(--dsw-alias-label-secondary);corner-shape:round;color:var(--dsw-alias-bg-module);z-index:3;border-radius:999px;justify-content:center;align-items:center;width:20px;height:20px;font-size:11px;display:flex;position:absolute;top:8px;left:8px}.qMfk9G_checkOn{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary)}[data-selected=on]{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.qMfk9G_groupNote{color:var(--dsw-alias-label-secondary);margin:0 0 10px;font-size:12px;line-height:20px}.qMfk9G_memberList{margin:0 0 12px;padding:0;list-style:none}.qMfk9G_memberRow{border-bottom:1px solid var(--dsw-alias-interactive-bg-hover);align-items:baseline;gap:8px;padding:6px 2px;display:flex}.qMfk9G_memberIdx{color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}.qMfk9G_memberName{font-size:13px}@media (prefers-reduced-motion:reduce){.qMfk9G_tileEnter,.qMfk9G_skLine,.qMfk9G_skBlock{animation-duration:.01ms;animation-iteration-count:1}}@media (width<=900px){.qMfk9G_studioSplit{grid-template-columns:1fr}}.qMfk9G_outputsPreview{flex-direction:column;flex:1;min-width:280px;min-height:220px;display:flex;overflow:hidden}.qMfk9G_outputsHint{color:var(--dsw-alias-label-dimmed);border:1px dashed var(--dsw-alias-border-l2);border-radius:6px;flex:1;justify-content:center;align-items:center;font-size:11px;display:flex}.qMfk9G_previewClickable{cursor:pointer}.qMfk9G_previewClickable:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}.qMfk9G_enhanceRow{flex:none;align-items:center;gap:8px;padding:2px 0;display:flex}.qMfk9G_enhanceNote{color:var(--dsw-alias-text-tertiary);font-size:12px}.qMfk9G_rescue{border:1px solid var(--dsw-alias-border-secondary);border-radius:6px;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 8px;display:flex}.qMfk9G_rescueNote{color:var(--dsh-alias-text-secondary,var(--dsw-alias-text-secondary));overflow-wrap:anywhere;margin:0;font-size:12px}.qMfk9G_rescueErr{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0;font-size:11px}";
		const tagId$3 = "@melite-plugin/dsh-card-view/card.module.css@fb4fde6a";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var card_module_css_default = {
			"addFace": "qMfk9G_addFace",
			"audioBar": "qMfk9G_audioBar",
			"audioBars": "qMfk9G_audioBars",
			"benchHead": "qMfk9G_benchHead",
			"capOver": "qMfk9G_capOver",
			"card": "qMfk9G_card",
			"cardsBench": "qMfk9G_cardsBench",
			"checkCircle": "qMfk9G_checkCircle",
			"checkOn": "qMfk9G_checkOn",
			"dangerVerb": "qMfk9G_dangerVerb",
			"drill": "qMfk9G_drill",
			"drillProgress": "qMfk9G_drillProgress",
			"drillRunRow": "qMfk9G_drillRunRow",
			"enhanceNote": "qMfk9G_enhanceNote",
			"enhanceRow": "qMfk9G_enhanceRow",
			"errorDismiss": "qMfk9G_errorDismiss",
			"failed": "qMfk9G_failed",
			"field": "qMfk9G_field",
			"fieldKey": "qMfk9G_fieldKey",
			"flowLink": "qMfk9G_flowLink",
			"graphReceiptOk": "qMfk9G_graphReceiptOk",
			"graphReceiptPartial": "qMfk9G_graphReceiptPartial",
			"groupBar": "qMfk9G_groupBar",
			"groupNote": "qMfk9G_groupNote",
			"head": "qMfk9G_head",
			"kindFace": "qMfk9G_kindFace",
			"kindInitial": "qMfk9G_kindInitial",
			"kindName": "qMfk9G_kindName",
			"load": "qMfk9G_load",
			"loading": "qMfk9G_loading",
			"media": "qMfk9G_media",
			"memberIdx": "qMfk9G_memberIdx",
			"memberList": "qMfk9G_memberList",
			"memberName": "qMfk9G_memberName",
			"memberRow": "qMfk9G_memberRow",
			"missing": "qMfk9G_missing",
			"model": "qMfk9G_model",
			"mono": "qMfk9G_mono",
			"outputImg": "qMfk9G_outputImg",
			"outputs": "qMfk9G_outputs",
			"outputsHint": "qMfk9G_outputsHint",
			"outputsPreview": "qMfk9G_outputsPreview",
			"params": "qMfk9G_params",
			"paramsCol": "qMfk9G_paramsCol",
			"picker": "qMfk9G_picker",
			"pickerCard": "qMfk9G_pickerCard",
			"pickerCardLabel": "qMfk9G_pickerCardLabel",
			"pickerGenre": "qMfk9G_pickerGenre",
			"pickerGenreTitle": "qMfk9G_pickerGenreTitle",
			"previewClickable": "qMfk9G_previewClickable",
			"prompt": "qMfk9G_prompt",
			"reportList": "qMfk9G_reportList",
			"rescue": "qMfk9G_rescue",
			"rescueErr": "qMfk9G_rescueErr",
			"rescueNote": "qMfk9G_rescueNote",
			"restoreNote": "qMfk9G_restoreNote",
			"revTag": "qMfk9G_revTag",
			"row": "qMfk9G_row",
			"rowError": "qMfk9G_rowError",
			"rowTitle": "qMfk9G_rowTitle",
			"rowWrap": "qMfk9G_rowWrap",
			"runActions": "qMfk9G_runActions",
			"runError": "qMfk9G_runError",
			"runHead": "qMfk9G_runHead",
			"runId": "qMfk9G_runId",
			"runRow": "qMfk9G_runRow",
			"runStatus": "qMfk9G_runStatus",
			"runView": "qMfk9G_runView",
			"skBlock": "qMfk9G_skBlock",
			"skLine": "qMfk9G_skLine",
			"skRow": "qMfk9G_skRow",
			"skShort": "qMfk9G_skShort",
			"skWide": "qMfk9G_skWide",
			"state": "qMfk9G_state",
			"studioSplit": "qMfk9G_studioSplit",
			"tabScroll": "qMfk9G_tabScroll",
			"thumb": "qMfk9G_thumb",
			"tile": "qMfk9G_tile",
			"tileAdd": "qMfk9G_tileAdd",
			"tileCaption": "qMfk9G_tileCaption",
			"tileDot": "qMfk9G_tileDot",
			"tileDragOver": "qMfk9G_tileDragOver",
			"tileDragging": "qMfk9G_tileDragging",
			"tileEnter": "qMfk9G_tileEnter",
			"tileGrid": "qMfk9G_tileGrid",
			"tileIconBtn": "qMfk9G_tileIconBtn",
			"tileImg": "qMfk9G_tileImg",
			"tileImgLink": "qMfk9G_tileImgLink",
			"tileInner": "qMfk9G_tileInner",
			"tileMeta": "qMfk9G_tileMeta",
			"tilePct": "qMfk9G_tilePct",
			"tilePop": "qMfk9G_tilePop",
			"tilePreview": "qMfk9G_tilePreview",
			"tilePrompt": "qMfk9G_tilePrompt",
			"tileRunBtn": "qMfk9G_tileRunBtn",
			"tileShared": "qMfk9G_tileShared",
			"tileSpin": "qMfk9G_tileSpin",
			"tileSpinTurn": "qMfk9G_tileSpinTurn",
			"tileTitle": "qMfk9G_tileTitle",
			"tileTrash": "qMfk9G_tileTrash",
			"tileVideoImg": "qMfk9G_tileVideoImg",
			"wiredMark": "qMfk9G_wiredMark",
			"zoom-in": "qMfk9G_zoom-in",
			"zoomBar": "qMfk9G_zoomBar",
			"zoomBody": "qMfk9G_zoomBody",
			"zoomCard": "qMfk9G_zoomCard",
			"zoomDetail": "qMfk9G_zoomDetail",
			"zoomInner": "qMfk9G_zoomInner",
			"zoomMeter": "qMfk9G_zoomMeter",
			"zoomMeterFill": "qMfk9G_zoomMeterFill",
			"zoomOverlay": "qMfk9G_zoomOverlay",
			"zoomScroll": "qMfk9G_zoomScroll",
			"zoomShimmer": "qMfk9G_zoomShimmer",
			"zoomSkeleton": "qMfk9G_zoomSkeleton",
			"zoomTitle": "qMfk9G_zoomTitle",
			"zoomWebhook": "qMfk9G_zoomWebhook"
		};
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
		function benchSessionOf$1(id) {
			return typeof id === "string" && SESSION_RE$1.test(id) ? id : "main";
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
		var CARD_PLANE_ENGINE, RUN_MEDIA_PREFIX, LEGACY_RUN_MEDIA_PREFIX, BIRTH_STRIP_KEYS$1, RESTORE_STRIP_KEYS, LOAD_CARRY_KEYS, STAGE_PATCH_KEYS, WIRE_STAGE_KEYS, RESTORED_PROVENANCE_SPELLING, SESSION_RE$1, BENCH_DRAFT_RE, RUN_ID_RE, BENCH_DRAFT_PREFIX_RE, SELF_NAMED_FAMILIES;
		var init_benchStage = __esmMin((() => {
			CARD_PLANE_ENGINE = "comfyui";
			RUN_MEDIA_PREFIX = "/melite-media/runs";
			LEGACY_RUN_MEDIA_PREFIX = "/v1/assets/runs";
			BIRTH_STRIP_KEYS$1 = [
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
			SESSION_RE$1 = /^[A-Za-z0-9_-]{1,64}$/;
			BENCH_DRAFT_RE = /^bench-([A-Za-z0-9_-]{1,64})$/;
			RUN_ID_RE = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;
			BENCH_DRAFT_PREFIX_RE = /^bench-/;
			SELF_NAMED_FAMILIES = /* @__PURE__ */ new Set(["anny", "h3-timeline"]);
		}));
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
		function statusOrPendingOf$1(value) {
			return RUN_STATUS_WORDS$1.has(value.toLowerCase()) ? statusOf$1(value) : "pending";
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
				status: statusOrPendingOf$1(owner.runStatus),
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
		var TERMINAL_RUN_STATUSES$1, LIVE_RUN_STATUSES$1, RUN_STATUS_WORDS$1;
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
		/** Fold the served `graph_receipt` face (the silent UI-drop
		*  purge's P1): the queue-time doc→graph evidence rides the live
		*  row beside the sidecar, same spelling. DEFENSIVE: a malformed
		*  receipt is ABSENT (never a throw — the status word keeps the
		*  row's only refusal; the receipt is evidence, and a broken
		*  receipt is no receipt). Every list must be all strings, every
		*  stage row well-formed, the verdict inside the vocabulary —
		*  anything else folds to undefined. */
		function readGraphReceipt(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
			const doc = value;
			const verdict = doc["verdict"];
			if (verdict !== "complete" && verdict !== "partial") return void 0;
			if (typeof doc["nodes"] !== "number") return void 0;
			const lists = {};
			for (const key of [
				"populated",
				"carried",
				"dropped"
			]) {
				const raw = doc[key];
				if (!Array.isArray(raw) || !raw.every((entry) => typeof entry === "string")) return void 0;
				lists[key] = [...raw];
			}
			const rawStages = doc["stages"];
			if (!Array.isArray(rawStages)) return void 0;
			const stages = [];
			for (const raw of rawStages) {
				if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return void 0;
				const row = raw;
				if (typeof row["stage"] !== "string" || typeof row["nodes"] !== "number") return void 0;
				if (row["verdict"] !== "complete" && row["verdict"] !== "partial") return void 0;
				const rowLists = {};
				for (const key of [
					"populated",
					"carried",
					"dropped"
				]) {
					const rawList = row[key];
					if (!Array.isArray(rawList) || !rawList.every((entry) => typeof entry === "string")) return void 0;
					rowLists[key] = [...rawList];
				}
				stages.push({
					stage: row["stage"],
					nodes: row["nodes"],
					populated: rowLists["populated"],
					carried: rowLists["carried"],
					dropped: rowLists["dropped"],
					verdict: row["verdict"]
				});
			}
			const stamped = doc["prompt_id"];
			if (stamped !== void 0 && typeof stamped !== "string") return void 0;
			return {
				nodes: doc["nodes"],
				populated: lists["populated"],
				carried: lists["carried"],
				dropped: lists["dropped"],
				verdict,
				stages,
				...typeof stamped === "string" && stamped !== "" ? { prompt_id: stamped } : {}
			};
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
			if (typeof status !== "string" || !RUN_STATUS_WORDS$1.has(status.toLowerCase())) throw new Error(`runs/status ${runId}: run-level status ${JSON.stringify(status)} is outside the vocabulary`);
			const receipt = readGraphReceipt(doc["graph_receipt"]);
			return {
				runId,
				status,
				draftId: typeof doc["draft_id"] === "string" && doc["draft_id"] !== "" ? doc["draft_id"] : null,
				stages,
				...typeof doc["error"] === "string" && doc["error"] !== "" ? { error: doc["error"] } : {},
				...receipt !== void 0 ? { graph_receipt: receipt } : {}
			};
		}
		/** The wire dial (audit X-E1, the card-base wire's law): every fetch
		*  rides a socket with a bound — a caller signal ANDed with the dial,
		*  never a bare socket. Reads are small same-origin JSON. */
		const READ_DIAL_MS = 2e4;
		/** The caller's signal ANDed with the dial — either side lifting the
		*  fetch aborts it (the provisioning seam's own shape). */
		function dialed(signal, dialMs) {
			const dial = AbortSignal.timeout(dialMs);
			return signal === void 0 ? dial : AbortSignal.any([signal, dial]);
		}
		/** Read the same-origin /v1/model-catalog door. Non-200 → named throw
		*  (the door's own error text when present); a 200 whose body does
		*  not parse to an object is a served-plane misconfiguration and
		*  refuses loud too (never a silent empty table). */
		async function catalogGet(signal) {
			const res = await fetch("/v1/model-catalog", { signal: dialed(signal, READ_DIAL_MS) });
			const body = await res.json().catch(() => null);
			if (!res.ok) {
				const err = typeof body === "object" && body !== null ? Reflect.get(body, "error") : void 0;
				throw new Error(typeof err === "string" ? err : "/v1/model-catalog: HTTP " + String(res.status));
			}
			if (typeof body !== "object" || body === null) throw new Error("/v1/model-catalog: unreadable body");
			return body;
		}
		let cardCatalogRowsCache = null;
		let cardCatalogRowsInflight = null;
		let cardCatalogRowsGen = 0;
		/** The catalog's cards section, read ONCE per session (the ONE door +
		*  cache law, nativity audit 2026-11-05 D6 — card-base's
		*  fetchCardCatalog projection rides THIS reader; there is no second
		*  GET of the door anywhere). Each row is the served JSON verbatim;
		*  projections narrow their own fields. Cached per session (the
		*  catalog is static per boot; one door round trip, every consumer
		*  shares it; concurrent cold starts share the one in-flight read).
		*  A reset (re-scan) INVALIDATES in-flight reads too: a stale
		*  resolve never refills the dropped cache (the generation guard —
		*  the late answer lands nowhere, the next read fetches fresh).
		* @param signal - caller cancellation, ANDed with the read dial.
		* @returns the cards section: card id → its served row. */
		async function fetchCardCatalogRows(signal) {
			if (cardCatalogRowsCache !== null) return cardCatalogRowsCache;
			cardCatalogRowsInflight ??= {
				gen: cardCatalogRowsGen,
				read: (async () => {
					const raw = (await catalogGet(signal))["cards"];
					const out = {};
					if (typeof raw === "object" && raw !== null) for (const [id, row] of Object.entries(raw)) {
						if (typeof row !== "object" || row === null) continue;
						out[id] = row;
					}
					return out;
				})()
			};
			const seat = cardCatalogRowsInflight;
			try {
				const rows = await seat.read;
				if (seat.gen === cardCatalogRowsGen) cardCatalogRowsCache = rows;
				return rows;
			} finally {
				if (cardCatalogRowsInflight === seat) cardCatalogRowsInflight = null;
			}
		}
		/** The family currency (the {model:} door's model ids — the cards
		*  section's projection): card id → its boarded families, first = the
		*  DEFAULT family (form-spec's card-id alias law: boarded[0]). The
		*  runs door resolves NEITHER card ids nor aliases — callers hand the
		*  start verb the family from HERE. Rides the one reader + cache
		*  above. */
		async function fetchCardFamilies(signal) {
			const rows = await fetchCardCatalogRows(signal);
			const out = {};
			for (const [id, row] of Object.entries(rows)) {
				const fams = row["families"];
				out[id] = Array.isArray(fams) ? fams.filter((x) => typeof x === "string") : [id];
			}
			return out;
		}
		/** Resolve a card's DEFAULT family (boarded[0]); the card id itself
		*  when the catalog names none (mask-studio-style self-services). */
		async function defaultFamilyForCard(cardId, signal) {
			return (await fetchCardFamilies(signal))[cardId]?.[0] ?? cardId;
		}
		//#endregion
		//#region ../../web-kit/contracts/src/stageView.ts
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
		//#endregion
		//#region src/client/rejection-voice.ts
		/** The voice for a refused HTTP response, the same lossless law: a
		* JSON body's error field speaks itself; any other body names the
		* status and carries the raw text verbatim — never "undefined" for
		* a body the door never wrote as JSON.
		* @param res the refused response (already known !res.ok)
		* @returns the refusal's own words, for the operator's error line */
		async function refusalVoice(res) {
			const raw = await res.text().catch(() => "");
			try {
				const parsed = JSON.parse(raw);
				if (typeof parsed.error === "string" && parsed.error !== "") return parsed.error;
			} catch {}
			return `HTTP ${res.status}${raw === "" ? "" : `: ${raw}`}`;
		}
		//#endregion
		//#region src/client/draft.ts
		/** The draft doc; throws the door's own named refusal on failure. */
		async function fetchDraft(draftId) {
			const doc = await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().drafts.get(draftId), "drafts/get");
			if (typeof doc["draft_id"] !== "string" || !Array.isArray(doc["stages"])) throw new Error("drafts/get: not a draft doc");
			return doc;
		}
		/** The draft's CURRENT bench rev — the CAS handle for a write the
		*  caller composed without one (the outcome observer holds no rev;
		*  a drill held its open-time rev while the agent moved the bench).
		*  Reads the served doc's own bench block; null when the door won't
		*  say (the caller then throws loud, never writes blind). */
		async function fetchDraftRev(draftId) {
			try {
				const doc = await fetchDraft(draftId);
				return typeof doc.bench?.rev === "number" ? doc.bench.rev : null;
			} catch {
				return null;
			}
		}
		/** One drafts/patch round trip; throws the door's named refusal. The
		*  generated signature is (draftId, stageId, patch, expectRev:
		*  number | null) — the open local patch shape rides as the wire's
		*  own open JSON record (honestly JSON all the way down). Returns
		*  the door's answer rev (THE CONFIRMED-WRITE LAW: the server's own
		*  word that the write landed — the ledger records it, a caller may
		*  use it as its next CAS handle). */
		async function patchOnce(draftId, stageId, patch, expectRev) {
			const ns = (0, _melite_card_base_client.estateRemote)().drafts;
			const row = await (0, _melite_card_base_client.unwrapRemote)(ns.patch(draftId, stageId, patch, expectRev ?? null), "drafts/patch");
			if (row["delivered"] !== true) {
				const reason = typeof row["reason"] === "string" ? row["reason"] : "undelivered";
				throw new Error("drafts/patch: " + reason + " (draft " + draftId + ", stage " + stageId + ")");
			}
			return { rev: typeof row["rev"] === "number" ? row["rev"] : null };
		}
		const stageWrites = /* @__PURE__ */ new Map();
		/** THE LEDGER CAP (audit X-D1..D3, round 13): the write ledger is
		*  keyed by doc ids and past STAGE_LEDGER_CAP the OLDEST IDLE rows
		*  evict first-insert order — the runs planes' MAX_SETTLED_* law,
		*  mirrored here so abandoned drafts cannot grow the maps forever.
		*  A busy row (links in flight, a trailing write still scheduled, an
		*  unsettled chain) is never a candidate, and a switched-away draft
		*  is NOT forgotten wholesale (undo can return to it — V-S5's
		*  memory law); only idle residue past the cap pays. */
		const STAGE_LEDGER_CAP = 128;
		function pruneStageLedger() {
			let excess = stageWrites.size - STAGE_LEDGER_CAP;
			for (const key of stageWrites.keys()) {
				if (excess <= 0) break;
				const row = stageWrites.get(key);
				if (row === void 0 || row.inflight.size > 0) continue;
				if (scheduledWrites.get(key) !== void 0 || sendChains.get(key) !== void 0) continue;
				stageWrites.delete(key);
				excess -= 1;
			}
			excess = scheduledWrites.size - STAGE_LEDGER_CAP;
			for (const key of scheduledWrites.keys()) {
				if (excess <= 0) break;
				const row = scheduledWrites.get(key);
				if (row === void 0 || row.size > 0) continue;
				scheduledWrites.delete(key);
				excess -= 1;
			}
		}
		function writeRow(draftId, stageId) {
			const key = draftId + "/" + stageId;
			let row = stageWrites.get(key);
			if (row === void 0) {
				row = {
					inflight: /* @__PURE__ */ new Set(),
					failedKeys: /* @__PURE__ */ new Set(),
					lastError: null,
					confirmedRev: null,
					epoch: 0
				};
				stageWrites.set(key, row);
				pruneStageLedger();
			}
			return row;
		}
		/** The stage's write accountability snapshot — what the UI consults
		* before it lets anything compose from this doc. */
		function stageWriteState(draftId, stageId) {
			const row = writeRow(draftId, stageId);
			return {
				pending: row.inflight.size,
				failedKeys: [...row.failedKeys],
				lastError: row.lastError,
				confirmedRev: row.confirmedRev
			};
		}
		/** THE AUTHORING CONTRACT (2026-10-10, the operator's live face:
		*  "Generate Image: lane 'krea-2/turbo' refuses the state: this lane
		*  requires 'prompt' — 'prompt' is not stated" — and "THERE SHOULD
		*  HAVE BEEN A CONTRACT, SO USERS CAN ADD CARDS"). What you type in
		*  a card IS that card's state on the bench. A typed SCHEMA field
		*  used to live in the drill's React state alone (CardForm forwards
		*  its onPatch to the MODS section only), so the run's fresh-read
		*  composed a row that never heard the prompt — the row rode the
		*  axis seeds and nothing else, and the lane refused the image.
		*
		*  The contract's write: EVERY non-slot field edit registers in the
		*  ledger here, coalesced per key on a short trailing delay (a
		*  keystroke storm is one write, not forty) — module-level state, so
		*  a view flip cannot kill a pending write by killing its timer
		*  owner (the 2026-09-23 burn's exact death). ONE hole, named
		*  honestly rather than patched with a lying flush: a write inside
		*  its trailing window dies on DRILL CLOSE — but on a real BROWSER
		*  TAB close the whole heap dies with the page (this ledger, the
		*  timers, the run gate itself — no beforeunload/beacon exists, and
		*  none honestly can: the door's CAS fence needs the write's
		*  answer). The tab-close loss window is REAL and UNCOVERED; the
		*  drill-close half is caught by the run gate, which FORCES every
		*  pending write before composing (flushStageWrites below), so the
		*  engine only ever sees what the studio shows. */
		const SCHEDULED_TRAILING_MS = 300;
		/** Pending trailing writes, keyed draft/stage then param key (the
		*  coalescing unit: one write per key, the newest value wins). */
		const scheduledWrites = /* @__PURE__ */ new Map();
		/** Per-stage SEND CHAIN (the second audit's timer-fan-out finding,
		*  2026-10-11): two keys scheduled in the same tick fire their
		*  timers together and both read the SAME confirmedRev — the second
		*  collides and burns a rebase round, the exact CAS fan-out the
		*  force path killed, relocated to the timers. Every send for a
		*  stage — timer or force — rides this chain, so each write reads
		*  the rev the PREVIOUS landing answered, by construction. */
		const sendChains = /* @__PURE__ */ new Map();
		function enqueueSend(draftId, stageId, thunk) {
			const key = draftId + "/" + stageId;
			writeRow(draftId, stageId).epoch += 1;
			const link = (sendChains.get(key) ?? Promise.resolve()).then(thunk);
			const settled = link.then(() => void 0, () => void 0);
			sendChains.set(key, settled);
			settled.then(() => {
				if (sendChains.get(key) === settled) sendChains.delete(key);
			});
			return link;
		}
		/** Keys still sitting in their trailing window (the flush's
		*  liveness check — a schedule that survives the loop below is
		*  voiced, never composed over). Reads the entries' REAL param keys
		*  (the 2026-10-15 stretch cure): the surface-patch entry rides one
		*  sentinel row key but carries whole-channel bodies, so the row key
		*  would voice a sentinel nobody typed — the voice names what the
		*  operator stated. Param entries carry exactly their row key, so
		*  their voice is unchanged. */
		function pendingScheduledKeys(draftId, stageId) {
			const row = scheduledWrites.get(draftId + "/" + stageId);
			if (row === void 0) return [];
			const out = [];
			for (const write of row.values()) for (const k of Object.keys(write.params)) if (!out.includes(k)) out.push(k);
			return out;
		}
		function scheduledRow(draftId, stageId) {
			const key = draftId + "/" + stageId;
			let row = scheduledWrites.get(key);
			if (row === void 0) {
				row = /* @__PURE__ */ new Map();
				scheduledWrites.set(key, row);
				pruneStageLedger();
			}
			return row;
		}
		/** Register an authoring edit: the value rides the row on the
		*  trailing delay. The promise settles when the door ANSWERED —
		*  also when a later edit superseded this one (the waiters ride the
		*  newest write's fate: one key, one write, every waiter hears it)
		*  and when the run gate forced the write out of band. The ledger
		*  owns the failure memory either way. */
		function scheduleStageParam(draftId, stageId, name, value, expectRev) {
			const key = draftId + "/" + stageId;
			const row = scheduledRow(draftId, stageId);
			const params = { [name]: value };
			if (Object.keys(params).length === 0) return Promise.resolve();
			const send = (merged, rev) => {
				const confirmed = writeRow(draftId, stageId).confirmedRev;
				return patchStageParams(draftId, stageId, merged, confirmed ?? rev);
			};
			const remaining = { n: Object.keys(params).length };
			return new Promise((resolve) => {
				const settle = () => {
					remaining.n -= 1;
					if (remaining.n === 0) resolve();
				};
				for (const [k, v] of Object.entries(params)) {
					const prev = row.get(k);
					if (prev !== void 0) clearTimeout(prev.timer);
					const merged = prev !== void 0 ? { ...prev.params } : {};
					merged[k] = v;
					const waiters = prev !== void 0 ? [...prev.waiters, settle] : [settle];
					const entry = {
						params: merged,
						expectRev,
						waiters,
						timer: setTimeout(() => {
							if (row.get(k) !== entry) return;
							row.delete(k);
							if (row.size === 0) scheduledWrites.delete(key);
							enqueueSend(draftId, stageId, () => send(merged, expectRev)).then(() => {
								for (const w of waiters) w(true);
							}, () => {
								for (const w of waiters) w(false);
							});
						}, SCHEDULED_TRAILING_MS)
					};
					row.set(k, entry);
				}
			});
		}
		/** THE SURFACE-PATCH ROW KEY (the 2026-10-15 stretch cure): the
		*  whole-patch coalescer's ONE pending entry per stage. Never a real
		*  doc key (the '@' prefix is outside the door's key vocabulary), so
		*  it cannot collide with a param entry — and pendingScheduledKeys
		*  voices the entry's real keys, never this sentinel. */
		const SURFACE_PATCH_KEY = "@surface-patch";
		/** Register a surface-studio patch: the whole patch body rides the
		*  row on the trailing delay, coalesced newest-per-key (a stretch is
		*  one write, not sixty). THE STRETCH CURE (2026-10-15, the
		*  operator's "the card claims to have been rebuilt"): the studio's
		*  bar fires onPatch per pointermove, and the surface seat used to
		*  send each through the DIRECT door with the render-time rev — every
		*  writer in the burst collided with every other, the PATCH_ATTEMPTS
		*  budget exhausted, and the loud "bench moved under the patch"
		*  refusal painted a storm the operator never typed. This seat joins
		*  the keystroke-storm law instead: one trailing body per stage,
		*  fired through the SAME send chain riding confirmedRev at send
		*  time — a single author lands with ZERO collisions.
		*
		*  THE WHOLE-BODY LAW (the 2026-10-12 marriage rule, kept): the
		*  pending body merges per key but FIRES WHOLE — one door write,
		*  judged against the state it describes, never split per key. A
		*  param entry for an overlapping key (a form edit racing a studio
		*  gesture) stays its own entry: the chain serializes the two sends
		*  in schedule order, so the later statement still wins.
		*
		*  The promise resolves TRUE when the write carrying this caller's
		*  fate landed, FALSE when it did not (refused past the budget, or
		*  torn down before firing) — superseded callers ride the newest
		*  write's fate, forced-out-of-band callers the force's. Never
		*  rejects: the ledger owns the failure memory, the boolean owns the
		*  optimistic overlay's retraction. */
		function scheduleStagePatch(draftId, stageId, patch, expectRev) {
			const key = draftId + "/" + stageId;
			const row = scheduledRow(draftId, stageId);
			if (Object.keys(patch).length === 0) return Promise.resolve(true);
			const send = (merged, rev) => {
				const confirmed = writeRow(draftId, stageId).confirmedRev;
				return patchStageParams(draftId, stageId, merged, confirmed ?? rev);
			};
			const prev = row.get(SURFACE_PATCH_KEY);
			if (prev !== void 0) clearTimeout(prev.timer);
			const merged = {
				...prev?.params ?? {},
				...patch
			};
			return new Promise((resolve) => {
				const settle = (landed) => {
					resolve(landed);
				};
				const waiters = prev !== void 0 ? [...prev.waiters, settle] : [settle];
				const entry = {
					params: merged,
					expectRev,
					waiters,
					timer: setTimeout(() => {
						if (row.get(SURFACE_PATCH_KEY) !== entry) return;
						row.delete(SURFACE_PATCH_KEY);
						if (row.size === 0) scheduledWrites.delete(key);
						enqueueSend(draftId, stageId, () => send(merged, expectRev)).then(() => {
							for (const w of waiters) w(true);
						}, () => {
							for (const w of waiters) w(false);
						});
					}, SCHEDULED_TRAILING_MS)
				};
				row.set(SURFACE_PATCH_KEY, entry);
			});
		}
		/** Fire every pending trailing write for the stage NOW (the run
		*  gate's first move — a press composes what the studio shows).
		*  SERIALIZED, one write landing before the next leaves (the
		*  write-seat audit's CAS-violation finding: the first cut fanned
		*  the keys out CONCURRENTLY at one shared render-time rev, every
		*  writer collided, each retry round eliminated exactly one, and
		*  the rebase budget (PATCH_ATTEMPTS=3) exhausted at four-plus keys
		*  into a SPURIOUS refusal the operator never typed). Serial and
		*  riding confirmedRev at send time, a single-author press lands
		*  every key with ZERO collisions; a true second author is met
		*  with the full rebase budget per write. Settling is still
		*  non-throwing here — the LEDGER owns the failure memory and the
		*  run gate voices it. */
		async function forceScheduledWrites(draftId, stageId) {
			const key = draftId + "/" + stageId;
			const row = scheduledWrites.get(key);
			if (row === void 0 || row.size === 0) return;
			for (const [k, write] of [...row.entries()]) {
				if (row.get(k) !== write) continue;
				clearTimeout(write.timer);
				row.delete(k);
				if (row.size === 0) scheduledWrites.delete(key);
				let landed = true;
				try {
					await enqueueSend(draftId, stageId, async () => {
						const confirmed = writeRow(draftId, stageId).confirmedRev;
						await patchStageParams(draftId, stageId, write.params, confirmed ?? write.expectRev);
					});
				} catch {
					landed = false;
				}
				for (const w of write.waiters) w(landed);
			}
		}
		/** Await every authoring write still in flight for the stage (the
		* run gate's flush). Never throws — the caller reads the settled
		* state and refuses the run on any failure. */
		async function flushStageWrites(draftId, stageId) {
			const key = draftId + "/" + stageId;
			for (let guard = 0; guard < 16; guard++) {
				await forceScheduledWrites(draftId, stageId);
				const row = writeRow(draftId, stageId);
				while (row.inflight.size > 0) await Promise.allSettled([...row.inflight]);
				const sched = scheduledWrites.get(key);
				if (sched !== void 0 && sched.size > 0) continue;
				const tail = sendChains.get(key);
				if (tail === void 0) break;
				await tail;
			}
			return stageWriteState(draftId, stageId);
		}
		/** THE RUN GATE'S VOICE (the one-press/one-engine law) — the ONE
		* seat every run verb rides (runCardStage, the chat tile, every
		* future caller): flush the stage's authoring writes, then refuse
		* with the naming message when a key's latest write has not landed.
		* Null = the press may compose. Never throws. */
		async function refuseForUnlandedWrite(draftId, stageId) {
			const state = await flushStageWrites(draftId, stageId);
			if (state.failedKeys.length === 0) {
				const stillRiding = pendingScheduledKeys(draftId, stageId);
				if (stillRiding.length === 0) return null;
				return "THE WRITE DID NOT LAND — run refused: authoring write(s) still in their trailing window after repeated flush (unlanded keys: " + stillRiding.join(", ") + "). The persisted doc under this stage is not what the studio shows; nothing was sent to the engine.";
			}
			return "THE WRITE DID NOT LAND — run refused: " + (state.lastError ?? "authoring write(s) still in flight") + " (unlanded keys: " + state.failedKeys.join(", ") + "). The persisted doc under this stage is not what the studio shows; nothing was sent to the engine.";
		}
		/** THE WRITE FACE'S VOICE (2026-11-02, the one-home law): the banner
		*  every drill write path paints when a write fails — derived FROM
		*  THE LEDGER ROW (the same row the run gate refuses on), so the face
		*  can never disagree with the gate that owns the refusal. Prefix,
		*  lastError, the row's unlanded keys: NO call site builds its own
		*  string — a per-path dialect is how the UI lied about the backend
		*  it renders. @param draftId the bench draft @param stageId the
		*  stage whose row voices @returns the banner string, always */
		function unlandedWriteVoice(draftId, stageId) {
			const state = stageWriteState(draftId, stageId);
			return "THE WRITE DID NOT LAND — " + (state.lastError ?? "authoring write(s) still in flight") + " (unlanded keys: " + (state.failedKeys.length > 0 ? state.failedKeys.join(", ") : "none recorded yet") + "). The studio shows your edit; the bench does not — Run would refuse this stage until the write lands.";
		}
		/** THE LEDGER'S INVALIDATION (audit V-S5): a stage the bench no
		*  longer holds — remove-stage, clear, an undo that rewound past it —
		*  must not keep accountability rows forever. Per-row cancel mirrors
		*  resetStageWrites: a pending trailing write's timer dies and its
		*  waiters settle, and that write never fires, so it never lands. A
		*  send already fired into the chain is past cancelling — the door has
		*  it (or will) — so its row is not dropped under it either: the chain
		*  drops the stageWrites row only after its last link settles, so an
		*  in-flight link keeps its failure memory until the door has answered
		*  it. Neighbouring stages are untouched: this is per-stage, never the
		*  nuclear reset.
		*
		*  The row dies with the RIDE THIS FORGET FOUND, never with a
		*  successor's (the race audit's F2/F3, 2026-10-22): a direct-call
		*  write has no chain to defer to, so its row waits for the last
		*  attempt to settle instead of vanishing under it, and a write that
		*  arrives after the forget bumps the row's epoch, which voids the
		*  deferred drop rather than wiping the memory it is accumulating. */
		function forgetStageWrites(draftId, stageIds) {
			for (const stageId of stageIds) {
				const key = draftId + "/" + stageId;
				const scheduled = scheduledWrites.get(key);
				if (scheduled !== void 0) {
					for (const write of scheduled.values()) {
						clearTimeout(write.timer);
						for (const w of write.waiters) w(false);
					}
					scheduledWrites.delete(key);
				}
				const armed = stageWrites.get(key)?.epoch ?? -1;
				const chain = sendChains.get(key);
				sendChains.delete(key);
				const drop = () => {
					forgetRowWhenIdle(key, armed);
				};
				if (chain === void 0) drop();
				else chain.finally(drop);
			}
		}
		/** Drop a stage's row once the ride the forget armed for is over.
		*  @param key the ledger key (draft id / stage id).
		*  @param armed the row's epoch when the forget fired; a successor
		*  write bumps it, and a row that no longer stands at `armed` is not
		*  this forget's to drop. */
		function forgetRowWhenIdle(key, armed) {
			const row = stageWrites.get(key);
			if (row === void 0 || row.epoch !== armed) return;
			if (row.inflight.size > 0) {
				for (const attempt of [...row.inflight]) attempt.then(() => {
					forgetRowWhenIdle(key, armed);
				}, () => {
					forgetRowWhenIdle(key, armed);
				});
				return;
			}
			stageWrites.delete(key);
		}
		/** Forget EVERY row the draft holds — for an action whose stage set the
		*  caller cannot enumerate: an undo restores and removes stages the live
		*  list never showed together, so the ledger's memory of each is stale
		*  truth (the race audit's F4, 2026-10-22). Keys are `draftId/stageId`,
		*  so the draft's rows are the rows under its own prefix — every other
		*  draft is untouched.
		*  @param draftId the draft whose rows go. */
		function forgetDraftWrites(draftId) {
			const prefix = draftId + "/";
			const stageIds = /* @__PURE__ */ new Set();
			for (const key of [...stageWrites.keys(), ...scheduledWrites.keys()]) if (key.startsWith(prefix)) stageIds.add(key.slice(prefix.length));
			forgetStageWrites(draftId, [...stageIds]);
		}
		/** Reconcile the failure memory against what the studio NOW shows
		* (the write-seat audit's dead-end finding, 2026-10-10): a key whose
		* write FAILED stays in failedKeys forever — but after the drill
		* closes and REOPENS, the edit state reseeds from the HELD row, so
		* the studio shows the field empty while the run gate still refuses
		* naming a key nobody holds anymore (a GHOST: the cure — "retype the
		* field" — is invisible, the refusal looks like a lie). A failed key
		* is dead weight from a prior session of the form only when NOBODY
		* can show it: the held row does not carry it, the freshly seeded
		* edit state does not carry it, AND the form does not DECLARE it
		* (the second audit's live-drop finding, 2026-10-11: seedUser seeds
		* only held keys + axis rows, but the form RENDERS every declared
		* field — a declared-but-never-written 'prompt' shows an empty field
		* the operator can retype, so its refusal is live and curable, not
		* a ghost). A key any of the three still carries KEEPS its refusal
		* — that failure is live and the gate must voice it. */
		function reconcileStageWriteFailures(draftId, stageId, heldParams, seededParams, declaredKeys = /* @__PURE__ */ new Set()) {
			const row = writeRow(draftId, stageId);
			for (const k of [...row.failedKeys]) if (!(k in heldParams) && !(k in seededParams) && !declaredKeys.has(k)) row.failedKeys.delete(k);
			if (row.failedKeys.size === 0) row.lastError = null;
		}
		/** The CAS dance (the run-start face law, 2026-09-14): write with the
		*  held rev; on the door's cas-conflict RE-READ the rev and re-apply
		*  — BOUNDED (2026-10-09: the once-law died under a live bench with
		*  a second author — the agent session or a late-landing keystroke
		*  patch — bumping the rev between the re-read and the retry; one
		*  re-apply refused the run a second time and the operator hit the
		*  wall). Up to PATCH_ATTEMPTS total tries, a fresh rev between
		*  each; exhaustion, a missing rev, or any non-CAS refusal throws
		*  LOUD — never a silent drop, never a blind write. */
		const PATCH_ATTEMPTS = 3;
		async function patchWithRebase(draftId, stageId, patch, expectRev) {
			let rev = expectRev;
			if (rev === void 0) {
				rev = await fetchDraftRev(draftId) ?? void 0;
				if (rev === void 0) throw new Error("drafts/patch: no bench rev to write against (draft " + draftId + ")");
			}
			let last;
			for (let i = 0; i < PATCH_ATTEMPTS; i++) try {
				return await patchOnce(draftId, stageId, patch, rev);
			} catch (e) {
				if (!(0, _melite_card_base_client.isCasConflict)(e)) throw e;
				last = e;
				const fresh = await fetchDraftRev(draftId) ?? void 0;
				if (fresh === void 0) throw e;
				rev = fresh;
			}
			throw last;
		}
		/** Edit one stage's params — the REAL door, reborn 2026-09-11: the
		*  drafts remote's `drafts/patch` write arm over the drafts domain
		*  (the gateway-era PATCH /v1/flows/drafts/:id/stages/:sid died with
		*  the app; stroke L stubbed this to a loud throw — the shared-state
		*  door is back, same per-key merge semantics server-side). Throws
		*  the door's named refusal; delivered:false lands as a named throw
		*  (never a lying success). Null params values ride VERBATIM —
		*  the door's JSON Merge Patch arm deletes those keys (the unset
		*  path's domain half). */
		async function patchStageParams(draftId, stageId, params, expectRev) {
			const row = writeRow(draftId, stageId);
			row.epoch += 1;
			const keys = Object.keys(params);
			let attempt;
			attempt = (async () => {
				try {
					const settled = await patchWithRebase(draftId, stageId, { params }, expectRev);
					if (settled.rev !== null) row.confirmedRev = settled.rev;
					for (const k of keys) row.failedKeys.delete(k);
					if (row.failedKeys.size === 0) row.lastError = null;
				} catch (e) {
					for (const k of keys) row.failedKeys.add(k);
					row.lastError = (0, _melite_card_base_client.rejectionVoice)(e);
					throw e;
				} finally {
					if (attempt !== void 0) row.inflight.delete(attempt);
				}
			})();
			row.inflight.add(attempt);
			return attempt;
		}
		/** Report a stage's RUN OUTCOME onto the bench row — the same
		*  shared-state door (runStatus + result keys of the fixed patch
		*  set). This is the chain's attribution half: the estate names
		*  runs by DRAFT only (every bench stage runs under the shared
		*  bench draft), so the tab — the one that knows WHICH stage ran —
		*  writes the outcome the wire edge later reads. result.url rides
		*  the media-route currency (renders in tiles AND stages verbatim
		*  as the next run's chained input). health is the transport
		*  channel (LOW-23): `health: 'unreachable'` escalates, `health:
		*  null` clears on recovery — the status word itself never carries
		*  a resource signal. At least one of runStatus/health/result
		*  rides every body this helper sends. */
		async function patchStageOutcome(draftId, stageId, outcome, expectRev) {
			await patchWithRebase(draftId, stageId, outcome, expectRev);
		}
		/** Start the run; returns the run_id or throws the door's named refusal. */
		async function startDraft(draftId) {
			const row = await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().runs.start({ draft_id: draftId }), "runs/start");
			if (typeof row["run_id"] !== "string") throw new Error("runs/start: no run_id in the answer");
			return row["run_id"];
		}
		/** The terminal statuses — the tail's stop condition must match the
		*  stream's, or a dropped socket rides forever / an unknown run stops
		*  early. */
		function runFinished(status) {
			return isTerminalStatus(status);
		}
		function rowStatus(live, doc) {
			return statusOrPendingOf(live ?? doc ?? "");
		}
		/** Distill the draft (+ optional live run status) into card rows. */
		function cardRows(doc, live) {
			const liveStages = live?.stages ?? [];
			const runFailed = live?.status === "failed" && typeof live.error === "string" && live.error !== "";
			return doc.stages.map((stage, index) => {
				const runStage = liveStages[index];
				const params = stage.params ?? {};
				const prompt = typeof params["prompt"] === "string" && params["prompt"] !== "" ? params["prompt"].slice(0, 96) : null;
				const rowFailed = runFailed && (runStage?.status === "failed" || liveStages.every((s) => s.status !== "failed") && index === doc.stages.length - 1);
				const docResult = stage["result"];
				const docError = docResult !== null && typeof docResult === "object" && typeof docResult["error"] === "string" && docResult["error"] !== "" ? docResult["error"] : void 0;
				const docUrl = docResult !== null && typeof docResult === "object" && typeof docResult["url"] === "string" && docResult["url"] !== "" ? docResult["url"] : void 0;
				return {
					stageId: stage.id,
					title: stage.title ?? stage.id,
					kind: stage.kind ?? "stage",
					service: typeof stage.service === "string" && stage.service !== "" ? stage.service : null,
					prompt,
					status: rowStatus(runStage?.status, stage.status),
					thumbUrl: typeof runStage?.url === "string" && runStage.url !== "" ? toRunMediaUrl(live?.run_id ?? "", runStage.url) : docUrl ?? null,
					...rowFailed && live !== null ? { error: live.error } : {},
					...live === null && docError !== void 0 ? { error: docError } : {}
				};
			});
		}
		/** Project a stage's params into editable fields (in key order). */
		function paramFields(params) {
			const fields = [];
			for (const [key, value] of Object.entries(params)) if (typeof value === "boolean") fields.push({
				key,
				value,
				atom: "switch"
			});
			else if (typeof value === "number") fields.push({
				key,
				value,
				atom: "number"
			});
			else if (typeof value === "string") fields.push({
				key,
				value,
				atom: "text"
			});
			return fields;
		}
		/** Coerce an edited atom value back to the param's wire type. The
		*  numeric leg delegates to the spec owner's parseNumericInput —
		*  an unparseable or emptied input keeps the field's current value
		*  (the owner's own law; clearing the box is not a zero edit). */
		function coerceEdit(field, next) {
			if (field.atom === "number") {
				const n = (0, _melite_card_base_client.parseNumericInput)(next);
				return n !== void 0 ? n : field.value;
			}
			return next;
		}
		/** The PATCH body for one stage: only the keys whose coerced value
		*  actually changed (a "1." retyped back to the original number is NOT
		*  an edit). */
		function editPatch(fields, edits) {
			const patch = {};
			let changed = false;
			for (const f of fields) {
				const raw = edits.get(f.key);
				if (raw === void 0) continue;
				const next = typeof raw === "boolean" ? raw : coerceEdit(f, raw);
				if (next === f.value) continue;
				patch[f.key] = next;
				changed = true;
			}
			return changed ? patch : null;
		}
		//#endregion
		//#region src/client/run-rescue-core.ts
		/**
		* run-rescue-core.ts — the run-gate rescue's data half (roadmap item 4,
		* the operator's 2026-09-20 order: hit RUN without a model or a
		* ComfyUI extension → a popup offers the install through the
		* manage seat, right where the run refused).
		*
		* THE LINKS-IN-CODE LAW (the operator, same order: "we NEVER do
		* one-time downloads, ALL download links are KEPT IN CODE"): the
		* client NEVER carries a URL. It passes NAMES ONLY —
		* install_extension takes the pack id from the refusal's own text;
		* acquire_weight takes the FAMILY id and the manage seat resolves
		* the DECL provision rows server-side (the declaration is the one
		* truth for what downloads from where). An ad-hoc URL has no door
		* here, by construction.
		*
		* THE ONE WIRE: the install rides postManageAction (card-base's
		* manage/act gateway door — the SAME wire the form-time prompts
		* ride; there is no second manage client). This module is the
		* RUN-TIME half: the form-time prompts (PackPrompt, the model
		* offer) catch the miss BEFORE the press; this catches the miss
		* the press itself surfaced — a pack the form could not see, a
		* model file the presence mark believed present, an engine refusal
		* mid-run. Same seat, same vocabulary, later gate.
		*/
		/** Parse a failed run's reason for a rescueable miss. The
		* missing-extension refusal names its pack verbatim
		* ("card 'x' requires 'PACK' …"); the lane-presence gate names its
		* family and declared file verbatim ("lane presence: family 'x'
		* declares <slot> '<file>' but no store copy exists …"); a model
		* miss names a weight file in a not-found context. Anything else is
		* not ours to fix — null (never a wrong install). */
		function parseRescue(error) {
			if (typeof error !== "string" || error === "") return null;
			const ext = /card '[^']*' requires '([^']+)'/.exec(error);
			if (ext !== null) return {
				kind: "extension",
				pack: ext[1]
			};
			const lane = /lane presence: family '([^']+)' declares \S+ '([\w.-]+\.(?:safetensors|bin|pt|pth|ckpt|gguf))' but no store copy exists/.exec(error);
			if (lane !== null) return {
				kind: "model",
				file: lane[2],
				target: lane[1]
			};
			const target = /provision_model\s+model=([A-Za-z0-9_-]+)(?=\s|\)|;|,|$)/i.exec(error)?.[1];
			const weight = /needs weight '([^']+)'/i.exec(error);
			if (weight !== null && /absent on the models tree/i.test(error)) return {
				kind: "model",
				file: weight[1],
				...target === void 0 ? {} : { target }
			};
			const file = /([\w.-]+\.(?:safetensors|bin|pt|pth|ckpt|gguf))/.exec(error);
			const provisionBorne = target !== void 0 || new RegExp("needs weight '" + (file?.[1] ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "'", "i").test(error);
			if (file !== null && provisionBorne && /not found|does not exist|no such file|missing|absent on the models tree|404/i.test(error)) return {
				kind: "model",
				file: file[1],
				...target === void 0 ? {} : { target }
			};
			return null;
		}
		/** THE STRUCTURED LANE MISS (operator 2026-10-22): the runs door's
		*  lane_input_missing details row, read into the popup's Rescue —
		*  the exact key at the press site, no prose parsing. Null when the
		*  record is not that row (the prose anchor in parseRescue still
		*  covers the row-derived face). */
		function rescueOfLaneDetails(details) {
			if (details === void 0) return null;
			const family = details["family"];
			const slot = details["slot"];
			const missing = details["missing"];
			if (typeof family !== "string" || family === "" || typeof slot !== "string" || slot === "" || typeof missing !== "string" || missing === "" || details["kind"] !== "model") return null;
			return {
				kind: "model",
				file: missing,
				target: family
			};
		}
		/** Terminal acquire_weight states (the tracker stops polling).
		*  'active' is NOT here: it is the service's LIVE state (the manage
		*  plane re-arms on it), never completion — a poll saying 'active'
		*  is not a landing (ERRORS k2/m, the purge P5 rescue honesty). */
		const ACQUIRE_TERMINAL = /* @__PURE__ */ new Set([
			"installed",
			"restart_required",
			"failed",
			"blocked"
		]);
		function weightStateOf(reply) {
			const data = typeof reply.data === "object" && reply.data !== null && !Array.isArray(reply.data) ? reply.data : {};
			const operationId = typeof data["operation_id"] === "string" ? data["operation_id"] : typeof data["operationId"] === "string" ? data["operationId"] : "";
			if (operationId === "") throw new Error("acquire_weight answered without an operation_id");
			return {
				operationId,
				state: typeof data["state"] === "string" ? data["state"] : "acquiring",
				bytes: typeof data["bytes"] === "number" ? data["bytes"] : 0,
				total: typeof data["total"] === "number" ? data["total"] : 0,
				...typeof reply.detail === "string" && reply.detail !== "" ? { detail: reply.detail } : {}
			};
		}
		/** Start the weight fetch through the ONE acquisition door (the
		*  same door the agent's comfy_manage acquire_weight seat rides —
		*  one door, two callers). Names only: the model/card id plus the
		*  missing file for DISPLAY (the DECL owns the fetch source).
		*  Returns the operation id at once with the opening bytes/total —
		*  the caller polls acquireWeightPoll for the live count. */
		/** ONE acquire seat for this module (the door + the optional
		*  teardown signal): a present signal rides as postManageAction's
		*  third arg; an absent one keeps the two-arg seam the specs pin. */
		async function acquireAction(payload, signal) {
			return signal === void 0 ? (0, _melite_card_base_client.postManageAction)("acquire_weight", payload) : (0, _melite_card_base_client.postManageAction)("acquire_weight", payload, signal);
		}
		async function acquireWeightStart(target, file, signal) {
			const reply = await acquireAction({
				model: target,
				...file === void 0 || file === "" ? {} : { file }
			}, signal);
			if (!reply.ok) throw new Error(reply.detail ?? "manage refused");
			return weightStateOf(reply);
		}
		/** Poll one weight fetch (the tracker's read): the SAME action with
		*  ONLY the operation id — no model, no second fetch. */
		async function acquireWeightPoll(operationId, signal) {
			const reply = await acquireAction({ operation_id: operationId }, signal);
			if (!reply.ok) throw new Error(reply.detail ?? "manage refused");
			return weightStateOf(reply);
		}
		/** THE ACQUIRED VOICE (one home for the success line): the landed
		*  byte count over the DECL total. A report with no declared total
		*  (a DECL row without size_bytes seeds 0) voices the undeclared
		*  size — never the dead "0/0 bytes" success (the purge P5's
		*  total=0 face). */
		function acquiredDetailOf(target, current) {
			if (!(current.total > 0)) return target + " acquired — the engine reported no declared total (size unknown; verify the file on disk)";
			return target + " acquired (" + String(current.bytes) + "/" + String(current.total) + " bytes)";
		}
		/** Offer one rescue through the manage seat. Names only — the
		* server owns every URL (the declaration law above). The target
		* is the model family OR the card id (model-less tool cards carry
		* their own provision rows under the card id — the acquire_weight
		* door resolves both, as provision_model did before it). The model
		* arm rides acquire_weight (ONE door with the popup tracker and the
		* agent seat); the extension arm keeps install_extension. Resolves
		* with the reply's detail line, refuses with its own name, and
		* refuses STUCK when the ceiling expires non-terminal (the stuck
		* burn, ERRORS k2/m). */
		async function runRescueCall(rescue, target, signal) {
			const provisionTarget = rescue.kind === "model" && rescue.target !== void 0 && rescue.target !== "" ? rescue.target : target;
			if (rescue.kind === "extension") {
				const reply = await (0, _melite_card_base_client.postManageAction)("install_extension", { nodes: [rescue.pack] });
				if (!reply.ok) throw new Error(reply.detail ?? "manage refused");
				const data = typeof reply.data === "object" && reply.data !== null && !Array.isArray(reply.data) ? reply.data : null;
				const state = data !== null && typeof data["state"] === "string" ? data["state"] : "";
				return {
					detail: reply.detail ?? rescue.pack + " installed",
					restartRequired: data !== null && data["restart_required"] === true || state === "restart_required"
				};
			}
			let current = await acquireWeightStart(provisionTarget, rescue.file, signal);
			for (let attempt = 0; !ACQUIRE_TERMINAL.has(current.state) && attempt < 150; attempt += 1) {
				await new Promise((resolve) => {
					const t = setTimeout(resolve, 200);
					signal?.addEventListener("abort", () => {
						clearTimeout(t);
						resolve();
					}, { once: true });
				});
				if (signal?.aborted === true) throw signal.reason ?? /* @__PURE__ */ new Error("aborted");
				current = await acquireWeightPoll(current.operationId, signal);
			}
			if (!ACQUIRE_TERMINAL.has(current.state)) throw new Error("weight acquisition stuck — no longer progressing: the engine last reported state \"" + current.state + "\" at " + String(current.bytes) + "/" + String(current.total) + " bytes across the full 150-poll ceiling; retry the fetch or delete the stuck operation");
			const restartRequired = current.state === "restart_required" || current.state === "installed";
			if (current.state === "failed" || current.state === "blocked") throw new Error(current.detail ?? "weight acquisition " + current.state);
			return {
				detail: current.detail ?? acquiredDetailOf(provisionTarget, current),
				restartRequired
			};
		}
		function terminalStageErrorOf(stages) {
			for (const stage of stages) {
				if (statusOrPendingOf(typeof stage.runStatus === "string" ? stage.runStatus : "") !== "error") continue;
				if (typeof stage.result !== "object" || stage.result === null || Array.isArray(stage.result)) continue;
				const error = Reflect.get(stage.result, "error");
				if (typeof error === "string" && error !== "") return error;
			}
			return null;
		}
		/** THE RUN FACE'S TERMINAL VOICE (the runface-error cure,
		*  2026-10-12): the run wire carries stage errors on a DIFFERENT
		*  shape than drafts — `RunStageStatus { status, error }` (the
		*  status door serves the failure text verbatim on the row; the
		*  run-level `error` is the observer's fallback when no single
		*  stage owns the reason) — so terminalStageErrorOf's
		*  `{ runStatus, result.error }` read folds every run stage to
		*  not-failed and the run face voiced nothing. Same law, run
		*  shape: the first error-folded stage's verbatim error wins, the
		*  run-level text is the fallback (terminalOutcomeOf's own
		*  stage-first order in cards-resource.ts). The view-side read is
		*  the same: an unreadable status word is not failed, and an
		*  empty/non-string error is no voice. */
		function terminalRunStageErrorOf(stages, runError) {
			for (const stage of stages) {
				if (statusOrPendingOf(typeof stage.status === "string" ? stage.status : "") !== "error") continue;
				if (typeof stage.error === "string" && stage.error !== "") return stage.error;
			}
			if (typeof runError === "string" && runError !== "") return runError;
			return null;
		}
		/** The first family id on a bench/draft's stage params (the model
		* the run shot — the rescue's provision target). Null when no
		* stage names one (the card-id fallback below gets its turn). */
		function familyOfStages(stages) {
			for (const s of stages) {
				const m = s.params?.["model"];
				if (typeof m === "string" && m !== "") return m;
			}
			return null;
		}
		/** THE CARD-ID FALLBACK (the mask SAM2 law, 2026-09-19):
		* model-less tool cards name no family — the stage's own card id
		* is the provision target (the manage door resolves card-owned
		* DECL rows under it). Null when no stage names a card. */
		function cardOfStages(stages) {
			for (const s of stages) if (typeof s.card === "string" && s.card !== "") return s.card;
			return null;
		}
		//#endregion
		//#region src/chromeCopy.ts
		/**
		* chromeCopy.ts — THE OPERATOR-FACING MAINTENANCE CHROME DICTIONARY.
		*
		* Client UI copy is locale-owned (the estate's decision, mirrored from
		* card-base's square.ts and h3-timeline's studioCopy.ts): presentation
		* code owns no product-copy literals; it consumes them here through the
		* typed seat. A second locale plugs into this dictionary without
		* touching a single card-view component.
		*
		* THE BOUND: the host's OWN chrome — tab labels, button text,
		* placeholders, aria names, hover titles, and the enhance-verb notes.
		* Per-card strings that come from card `identity`/result metadata are
		* DATA at the seat and stay at the seat; computed law wordings that
		* narrate a lane's own rule with live values (the rescue's Missing
		* sentences, the restore report, the progress percents) likewise ride
		* the seat — the dictionary would only rename them, not own them.
		*/
		/** The typed dictionary. Keys are stable copy ids; parameterized
		*  entries are functions with typed params (the call renders the exact
		*  string the literal spelled — one character unchanged). */
		/** The EngineRef suffix for the graph-receipt chip faces (one home
		*  for both faces — the separator and the # mark live here, never
		*  in the client): a stamped prompt_id rides as ` · #<id>`, an
		*  absent one leaves the legacy face byte-identical. */
		function engineRefSuffix(promptId) {
			return promptId !== void 0 && promptId !== "" ? " · #" + promptId : "";
		}
		// v8 ignore next -- exercised key-by-key by the copy census wall (every entry consumed at its seats)
		const chromeCopy = {
			/** Brand badge on the flow-cards header (both planes). */
			brand: "melite",
			/** Model slot fallback when neither the draft intent nor the call names a model. */
			flowFallback: "flow",
			/** Legacy header state: a settled call whose result predates the draft contract. */
			cardsEarlierDraft: "cards · earlier draft",
			/** Loading face when the draft id will never resolve (an errored call). */
			draftFailed: "draft failed",
			/** Loading face while the draft id is still composing. */
			composing: "composing…",
			/** Header badge when the call's args body is corrupt (never header-less). */
			argsUnparseable: "args unparseable — corrupted call record",
			/** Retry affordance suffix after a load error. */
			retrySuffix: " · retry",
			/** Header door to the shell's Media page (the card runs' archive). */
			openMedia: "open media",
			/** The flow-edit card's link: opens the edited flow (the session
			*  bench) in the Cards tab — the operator's "clickable link opens
			*  the right sidebar flow view" verb. No hover title: hover text
			*  rides the estate Tip, never a native title (the tip canon). */
			openFlow: "open flow",
			/** The flow-edit card's verdict title — the host presentCall's
			*  `Bench <verb>[ · <stage|card>]` wording, mirrored from the
			*  frozen args (the keyed toolview replaces the generic row, so
			*  the title face lives here; the copy census owns the
			*  literals — presentation code carries none). */
			constructTitle: (p) => "Bench " + p.verb + (p.on !== "" ? " · " + p.on : ""),
			/** The sidebar tab's chip + guide title — the bench page is titled this
			*  no matter which address form reached it (the address law, 2026-09-11). */
			cardsTabTitle: "Media Flow",
			/** The cards tab guide row's description under the tab title. */
			cardsTabGuide: "The media flow — the shared bench and its runs.",
			/** A chat file mention's tooltip title, naming the live kind + value. */
			mentionTitle: (p) => `melite ${p.kind} ${p.value} — opens the Media page`,
			/** Loading face while the draft doc hydrates. */
			cardsLoading: "cards…",
			/** Drill title: the host's "Card " prefix over the row's own (data) title. */
			cardTitle: (p) => "Card " + p.name,
			/** Add-card door title + the bench grid's trailing Add tile name. */
			addCard: "Add a card",
			/** Add-card picker close control. */
			closePicker: "Close picker",
			/** Add-card picker search field placeholder. */
			searchPlaceholder: "Search cards…",
			/** Add-card picker search field accessible name. */
			searchAria: "Search cards",
			/** Bench tile title for a grouped stage (the child count is data). */
			groupTitle: (p) => "Group (" + String(p.count) + ")",
			/** Play button hover while the pass is running. */
			passRunning: "the pass is running",
			/** Play button hover: the pass runs every card in bench order. */
			runAllHint: "run every card in bench order — one run per card, stop on failure",
			/** Clear button hover once armed (the second press clears). */
			clearConfirm: "confirm: every stage leaves the bench (undo restores them)",
			/** Clear button hover while idle (the wedge cure's one-click door). */
			clearHint: "clear the whole bench — every stage out, one rev, undo restores them",
			/** Undo button hover when the log holds an unreverted action. */
			undoHint: "revert the newest bench action (one log entry per press — its own inverse, by rev)",
			/** Undo button hover when the log holds no unreverted action. */
			nothingToUndo: "nothing to undo — the log holds no unreverted action",
			/** Save-flow name field placeholder. */
			flowNamePlaceholder: "flow name",
			/** Save button hover: mint the bench as a named flow. */
			saveFlowHint: "mint this bench as a named flow (restores from the Flows face)",
			/** Run button word (rides after the play/spinner glyph — the leading space is verbatim). */
			playLabel: " Play",
			/** Save button word (the mint press + the save-panel confirm). */
			saveButton: "Save",
			/** Save-panel cancel word. */
			cancelButton: "Cancel",
			/** Tab face when the cards resource hook is absent (a broken provider, voiced loud). */
			cardsHookUnavailable: "cards resource hook unavailable",
			/** Tab face when a live snapshot carries no value (a broken provider, voiced loud). */
			cardsNoValue: "cards resource gave no value",
			/** Card drill close control. */
			closeCard: "Close card",
			/** Restore button hover when the run names no draft. */
			restoreNoDraft: "this run names no draft — nothing to restore",
			/** Restore button hover: copy the run's stages back onto the bench. */
			restoreHint: "copy this run’s stages back onto the bench as your own",
			/** Draft face back button (the stage left the draft). */
			backToBench: "Back to the bench",
			/** Run face back button. */
			backToBenchRun: "Back to bench",
			/** Extension-rescue install button hover (the DECL owns the URL). */
			installViaManage: "install via /v1/manage (the declaration owns the URL)",
			/** Weight popup title once the acquisition landed. */
			weightReady: "Weight ready",
			/** Weight popup close control (both faces). */
			closeWeightPopup: "Close weight popup",
			/** Weight button hover when no stage names the owning family or card. */
			noProvisionTarget: "no stage names the owning family or card — provision via the agent door",
			/** Weight button hover (the DECL owns the URL). */
			downloadViaManage: "download via /v1/manage (the declaration owns the URL)",
			/** Weight popup title on a missing model file. */
			missingWeight: "Missing weight",
			/** Restart face: the engine is restarting (the full door — reload, then Run). */
			restartWaiting: "Restarting… waiting for the engine to become active. Reload the page or engine, then press Run.",
			/** Restart face: the engine is restarting (the short door beside the button). */
			restartWaitingShort: "Restarting… waiting for the engine to become active.",
			/** Rescue done face: the caller's own re-run. */
			runAgain: "Run again",
			/** Weight offer button word (the dismissed popup's inline offer). */
			downloadWeight: "Download weight",
			/** Weight tracker note while the download polls acquire_weight. */
			downloadingLive: "Downloading… live bytes from the estate (polling acquire_weight).",
			/** Tile spinner accessible name while the row runs. */
			tileRunning: "running",
			/** Tile + drill percent faces' accessible name. */
			progressPercent: "progress percent",
			/** Tile trash button accessible name. */
			removeStage: "Remove stage",
			/** Tile + zoom stop button accessible name. */
			stopRun: "Stop run",
			/** Tile + zoom run button accessible name. */
			runStage: "Run stage",
			/** Tile wired-mark hover (the agent-recorded inputs.source edge). */
			sourceWired: "source wired",
			/** Tile health-face hover (the transport word is data). */
			transportTitle: (p) => "transport " + p.health,
			/** Enhance note: the verb is already in flight. */
			enhanceAlreadyRunning: "enhance already running",
			/** Enhance note: the prompt field is empty. */
			enhanceEmptyPrompt: "nothing to enhance — the prompt is empty",
			/** Enhance note: no model selected for the enhance call. */
			enhanceNoModel: "no model to enhance with — pick a Model first",
			/** Enhance note: the call succeeded but swept nothing (the server's field list is data). */
			enhanceNoFields: (p) => "the enhancer returned no declared fields (" + p.fields + ")",
			/** Enhance note: the sweep landed N fields via the named route. */
			enhancedVia: (p) => "enhanced via " + p.via + " (" + String(p.count) + " field" + (p.count === 1 ? "" : "s") + ")",
			/** Enhance note: the sweep landed N fields (no route named). */
			enhancedCount: (p) => "enhanced (" + String(p.count) + " field" + (p.count === 1 ? "" : "s") + ")",
			/** Drill webhook feed's activity line accessible name. */
			engineActivity: "engine activity",
			/** Preview seat's media-drilldown opener accessible name. */
			openMediaDrilldown: "Open media drilldown",
			/** Zoom overlay + bar accessible name ("Stage " over the row's own name, which is data). */
			stageAria: (p) => "Stage " + p.name,
			/** Zoom model-dropdown accessible name (the enhance verb's selector). */
			enhanceModelAria: "Enhance model",
			/** Zoom enhance capsule accessible name. */
			agentEnhanceAria: "Agent Enhance",
			/** Zoom enhance capsule word (the ✦ verb's own mark — the estate's agent-enhance brand glyph, not a catalog concept). */
			enhanceWord: "✦ Enhance",
			/** Zoom enhance capsule busy word (the promise's in-flight face). */
			enhanceBusyWord: "✦ enhancing…",
			/** Zoom close pill accessible name. */
			collapseCard: "Collapse card",
			/** Zoom model-dropdown Auto option (the estate's preference chain server-side). */
			autoOption: "Auto",
			/** Zoom stop pill word (rides beside the stop glyph). */
			stopWord: "Stop",
			/** Zoom run pill word (rides beside the play glyph). */
			runWord: "Run",
			/** Zoom close pill word (rides beside the ✕ glyph). */
			closeWord: "Close",
			/** Error-dismiss control accessible name (the red × beside every
			*  error face — the operator's "errors stick there FOREVER" cure:
			*  closing the face retires it). No hover title: hover text rides
			*  the estate Tip, never a native title (the tip canon). */
			dismissError: "Dismiss error",
			/** Run view's cancel verb (danger face — the live run stops). */
			cancelRunWord: "Cancel run",
			/** Run view's cancel in-flight face. */
			cancellingWord: "cancelling…",
			/** Run view's restore verb (the run's stages land back on the bench). */
			restoreToBench: "Restore to bench",
			/** Run view's restore in-flight face. */
			restoringWord: "Restoring…",
			/** Group sub-view's ungroup verb. */
			ungroupWord: "Ungroup",
			/** Group sub-view's ungroup in-flight face. */
			ungroupingWord: "ungrouping…",
			/** Rescue restart verb (the restart-required face's confirm). */
			restartToActivate: "Restart to activate",
			/** Rescue restart verb's in-flight face. */
			restartingWord: "Restarting…",
			/** Rescue restart-required note (the engine's own detail leads). */
			restartRequiredNote: (p) => p.detail + " — restart required before activation.",
			/** Rescue done face's note (the engine's own detail leads). */
			runAgainWhenReady: (p) => p.detail + " — run again when ready.",
			/** Rescue extension face's confirm (install through the manage seat). */
			installContinue: "Install & continue",
			/** Rescue extension confirm's in-flight face. */
			installingWord: "installing…",
			/** Rescue weight popup's download verb. */
			downloadWord: "Download",
			/** Rescue weight download's start face. */
			startingWord: "starting…",
			/** Rescue weight download's polling face. */
			downloadingWord: "downloading…",
			/** Rescue missing-extension note (what the run lacked). */
			missingInstall: (p) => "Missing " + p.what + " — install through the manage seat?",
			/** Rescue missing-weight note (what the run lacked). */
			missingDownload: (p) => "Missing " + p.what + " — download through the manage seat?",
			/** Weight popup title when the acquisition ended STUCK (frozen
			*  bytes across polls or an expired poll ceiling) — never the
			*  ready face (the purge P5 rescue honesty, ERRORS k2/m). */
			weightStuck: "Weight stuck",
			/** Weight stuck face's note: the engine's last truth leads (state
			*  + bytes/total), and the two honest exits are named. */
			stuckNote: (p) => "Stuck — the download is no longer progressing: the engine last reported state \"" + p.state + "\" at " + String(p.bytes) + "/" + String(p.total) + " bytes. Retry the fetch or delete the stuck operation.",
			/** Run view's graph-receipt chip on the complete face (the silent
			*  UI-drop purge's P1): every stated scalar rode the composed
			*  graph — the node count is data. The engine-minted prompt_id
			*  (GAP B: the receipt carried it, no face rendered it) rides as
			*  an EngineRef suffix wherever the estate stamped one — absent
			*  prompt_id leaves the legacy face byte-identical. */
			graphReceiptCarried: (p) => "graph ✓ " + String(p.nodes) + "n" + engineRefSuffix(p.promptId),
			/** Run view's graph-receipt chip on the partial face: the composed
			*  graph dropped doc scalars — the names are data (the estate's
			*  sorted receipt, joined by the seat). The EngineRef suffix rides
			*  here too (both faces name the queued engine call). */
			graphReceiptDropped: (p) => "graph ✕ dropped " + p.dropped.join(", ") + engineRefSuffix(p.promptId),
			/** Weight stuck face's retry verb (re-rides the acquire_weight door). */
			retryDownload: "Retry the download",
			/** Weight stuck face's delete verb (the discard rides the manage seat). */
			deleteStuck: "Delete stuck operation",
			/** The stuck face's run refusal — a run press on an incomplete
			*  weight is refused loudly, never fired silently (the purge P5). */
			stuckRunRefusal: "The weight is not complete — the run stays refused until the fetch lands (retry) or the stuck operation is deleted.",
			/** Weight tracker line when the engine declared no total (a DECL
			*  row without size seeds 0): the voice says so — no dead
			*  0-of-0 meter dressed as 0% (the purge P5's total=0 face). */
			undeclaredTotal: (p) => p.bytes + "/" + p.total + " bytes — total undeclared (the engine reported no size)"
		};
		//#endregion
		//#region src/client/run-rescue.tsx
		/**
		* run-rescue.tsx — the run-gate rescue's face (roadmap item 4): the
		* rescue that renders where a failed run's error lands WHEN the miss
		* is rescueable — a missing extension pack or a missing model file.
		* THE LINKS-IN-CODE LAW: names only, the DECL owns every URL
		* server-side (run-rescue-core.ts's header).
		*
		* TWO FACES: an extension miss keeps the inline banner (one confirm
		* through install_extension); a model miss opens the WEIGHT POPUP —
		* the F9 run-press acquisition seat — with a Download button and a
		* live bytes/total tracker. The Download press rides acquire_weight
		* (ONE door with the agent's comfy_manage seat: one door, two
		* callers); the tracker polls the SAME action with the operation id.
		* The re-run rides the caller's own onRun (never an automatic
		* re-fire).
		*
		* THE HONESTY LAWS (the purge P5 rescue honesty, ERRORS k2/m):
		* completion is judged off engine truth — 'active' polls keep the
		* tracker on the door (never the ready face); bytes frozen across
		* polls, or a ceiling expiring non-terminal, land the STUCK face
		* (Retry + Delete/discard, a run press refused loudly); a report
		* with no declared total voices the undeclared size (no dead 0/0
		* meter). A dismissal of a failed/stuck popup outlives the mount
		* (the dismissal memory) — the tab's remounts never re-pop it.
		*/
		function progressPercent(bytes, total) {
			if (!(total > 0) || !(bytes >= 0)) return 0;
			return Math.min(100, Math.round(bytes / total * 100));
		}
		/** THE TRACKER FACES (the popup's download ledger): the live
		*  bytes/total line plus the meter fill, rendered both mid-flight
		*  and on the done face — the terminal count stays visible, never
		*  unmounting at completion. Null when no fetch has started.
		*  THE UNDECLARED-TOTAL FACE (the purge P5): a report with no
		*  declared total (a DECL row without size seeds 0) renders no
		*  progress measure — no 0-of-0 meter dressed as 0%, no 0-valued
		*  maximum the engine never reported; the voice says the size is
		*  undeclared and the meter stays an unmeasured track (no role, no
		*  bounds) so the face keeps its place. */
		function trackerFaces(acquire) {
			if (acquire === null) return [];
			const undeclared = !(acquire.total > 0);
			const pct = undeclared ? 0 : progressPercent(acquire.bytes, acquire.total);
			return [(0, react.createElement)("p", {
				"data-testid": "weight-progress",
				className: card_module_css_default.rescueNote
			}, undeclared ? chromeCopy.undeclaredTotal({
				bytes: String(acquire.bytes),
				total: String(acquire.total)
			}) : String(acquire.bytes) + "/" + String(acquire.total) + " bytes (" + String(pct) + "%)"), (0, react.createElement)("div", {
				...undeclared ? {} : {
					role: "progressbar",
					"aria-valuemin": 0,
					"aria-valuemax": acquire.total,
					"aria-valuenow": acquire.bytes
				},
				"data-testid": "weight-meter",
				style: {
					height: "8px",
					borderRadius: "4px",
					background: "rgba(127,127,127,.25)",
					overflow: "hidden"
				}
			}, (0, react.createElement)("span", {
				"data-testid": "weight-meter-fill",
				style: {
					display: "block",
					height: "100%",
					width: undeclared ? "100%" : String(pct) + "%",
					background: "currentColor",
					...undeclared ? { opacity: .35 } : {}
				}
			}))];
		}
		/** THE DISMISSAL MEMORY (the re-pop cure, ERRORS m): the popup's
		*  dismissal outlives the mount — the tab's error-strip retire/re-arm
		*  remounts this face with the same miss, and a mount-local flag
		*  re-popped the modal over and over with no new engine event. Keyed
		*  by the miss identity (the rescue's own file/target or pack). A
		*  dismissal is RECORDED only when the acquire ended failed or stuck
		*  — the re-pop burn; a live flight's close or a landed download's
		*  close stays mount-local (the miss is stale or the operator is
		*  mid-look). Cleared when the operator re-offers (the inline press)
		*  or starts a new fetch (the acquire state changed). */
		const dismissedMisses = /* @__PURE__ */ new Set();
		function dismissalKeyOf(rescue) {
			return rescue.kind === "model" ? "model:" + rescue.file + "@" + (rescue.target ?? "") : "extension:" + rescue.pack;
		}
		function RunRescue({ error, stages, onRun, rescue: structured }) {
			const rescue = structured ?? parseRescue(error);
			const dismissalKey = rescue === null ? "" : dismissalKeyOf(rescue);
			const [busy, setBusy] = (0, react.useState)(false);
			const [done, setDone] = (0, react.useState)(null);
			const [restarting, setRestarting] = (0, react.useState)(false);
			const [restarted, setRestarted] = (0, react.useState)(false);
			const [note, setNote] = (0, react.useState)(null);
			const [acquire, setAcquire] = (0, react.useState)(null);
			const [stuck, setStuck] = (0, react.useState)(null);
			const [dismissed, setDismissed] = (0, react.useState)(() => dismissedMisses.has(dismissalKey));
			const downloadAbort = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				downloadAbort.current?.abort();
			}, []);
			if (rescue === null) return null;
			const family = familyOfStages(stages) ?? "";
			const card = family !== "" ? "" : cardOfStages(stages) ?? "";
			const target = rescue.kind === "model" && rescue.target !== void 0 && rescue.target !== "" ? rescue.target : family !== "" ? family : card;
			const targetKind = rescue.kind === "model" && rescue.target !== void 0 && rescue.target !== "" ? "declared target " : family !== "" ? "family " : "card ";
			const what = rescue.kind === "extension" ? "extension pack \"" + rescue.pack + "\"" : "model file \"" + rescue.file + "\"" + (target !== "" ? " (" + targetKind + target + ")" : "");
			const restartFace = (detail) => {
				if (restarted) return (0, react.createElement)("div", { className: card_module_css_default.rescue }, (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.restartWaiting));
				return (0, react.createElement)("div", { className: card_module_css_default.rescue }, (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.restartRequiredNote({ detail })), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "primary",
					disabled: restarting,
					onClick: () => {
						setRestarting(true);
						setNote(null);
						(0, _melite_card_base_client.postManageAction)("restart", {}).then((reply) => {
							if (!reply.ok) throw new Error(reply.detail ?? "restart refused");
							setRestarting(false);
							setRestarted(true);
						}).catch((e) => {
							setRestarting(false);
							setNote((0, _melite_card_base_client.rejectionVoice)(e));
						});
					}
				}, restarting ? chromeCopy.restartingWord : chromeCopy.restartToActivate), restarting ? (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.restartWaitingShort) : null, note !== null ? (0, react.createElement)("p", { className: card_module_css_default.rescueErr }, note) : null);
			};
			const doneFace = (result) => {
				if (result.restartRequired) return restartFace(result.detail);
				return (0, react.createElement)("div", { className: card_module_css_default.rescue }, (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.runAgainWhenReady({ detail: result.detail })), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "primary",
					onClick: onRun
				}, chromeCopy.runAgain));
			};
			if (rescue.kind === "extension") {
				if (done !== null) return doneFace(done);
				return (0, react.createElement)("div", { className: card_module_css_default.rescue }, (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.missingInstall({ what })), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "primary",
					disabled: busy,
					title: chromeCopy.installViaManage,
					onClick: () => {
						setBusy(true);
						setNote(null);
						runRescueCall(rescue, target).then((result) => {
							setBusy(false);
							setDone(result);
						}).catch((e) => {
							setBusy(false);
							setNote((0, _melite_card_base_client.rejectionVoice)(e));
						});
					}
				}, busy ? chromeCopy.installingWord : chromeCopy.installContinue), note !== null ? (0, react.createElement)("p", { className: card_module_css_default.rescueErr }, note) : null);
			}
			if (done !== null) {
				if (dismissed) return null;
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: true,
					onClose: () => {
						setDismissed(true);
					},
					title: chromeCopy.weightReady,
					closeLabel: chromeCopy.closeWeightPopup
				}, (0, react.createElement)("div", {
					"data-testid": "weight-popup",
					className: card_module_css_default.rescue
				}, trackerFaces(acquire), doneFace(done)));
			}
			const download = () => {
				dismissedMisses.delete(dismissalKey);
				setBusy(true);
				setNote(null);
				setStuck(null);
				setAcquire(null);
				downloadAbort.current?.abort();
				downloadAbort.current = new AbortController();
				const signal = downloadAbort.current.signal;
				(async () => {
					try {
						const first = await acquireWeightStart(target, rescue.file, signal);
						setAcquire(first);
						let current = first;
						let lastSeenBytes = first.bytes;
						let frozenPolls = 0;
						for (let attempt = 0; !ACQUIRE_TERMINAL.has(current.state) && attempt < 150; attempt += 1) {
							if (await (0, _melite_card_base_client.abortableSleep)(400, signal) === "abort") return;
							if (signal.aborted) return;
							current = await acquireWeightPoll(current.operationId, signal);
							setAcquire({ ...current });
							frozenPolls = current.total > 0 && current.bytes < current.total && current.bytes === lastSeenBytes ? frozenPolls + 1 : 0;
							lastSeenBytes = current.bytes;
							if (frozenPolls >= 2) break;
						}
						setBusy(false);
						if (!ACQUIRE_TERMINAL.has(current.state)) {
							setStuck({ ...current });
							return;
						}
						if (current.state === "failed" || current.state === "blocked") {
							setNote(current.detail ?? "weight acquisition " + current.state);
							return;
						}
						setDone({
							detail: current.detail ?? acquiredDetailOf(target, current),
							restartRequired: current.state === "restart_required" || current.state === "installed"
						});
					} catch (e) {
						if (signal.aborted) return;
						setBusy(false);
						setNote((0, _melite_card_base_client.rejectionVoice)(e));
					}
				})();
			};
			const downloading = acquire !== null && !ACQUIRE_TERMINAL.has(acquire.state);
			if (dismissed) return (0, react.createElement)("div", { className: card_module_css_default.rescue }, (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.missingDownload({ what })), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "primary",
				disabled: target === "",
				title: target === "" ? chromeCopy.noProvisionTarget : chromeCopy.downloadViaManage,
				onClick: () => {
					dismissedMisses.delete(dismissalKey);
					setDismissed(false);
				}
			}, chromeCopy.downloadWeight));
			const dismissPopup = () => {
				if (stuck !== null || acquire !== null && (acquire.state === "failed" || acquire.state === "blocked")) dismissedMisses.add(dismissalKey);
				downloadAbort.current?.abort();
				setAcquire(null);
				setDismissed(true);
			};
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: dismissPopup,
				title: stuck !== null ? chromeCopy.weightStuck : chromeCopy.missingWeight,
				closeLabel: chromeCopy.closeWeightPopup
			}, (0, react.createElement)("div", {
				"data-testid": "weight-popup",
				className: card_module_css_default.rescue
			}, stuck !== null ? (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.stuckNote({
				state: stuck.state,
				bytes: stuck.bytes,
				total: stuck.total
			})) : (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.missingDownload({ what })), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "primary",
				"data-testid": "weight-download",
				disabled: busy || target === "",
				title: target === "" ? chromeCopy.noProvisionTarget : chromeCopy.downloadViaManage,
				onClick: download
			}, busy ? acquire === null ? chromeCopy.startingWord : chromeCopy.downloadingWord : chromeCopy.downloadWord), ...trackerFaces(acquire), stuck === null && downloading ? (0, react.createElement)("p", { className: card_module_css_default.rescueNote }, chromeCopy.downloadingLive) : null, stuck !== null ? (0, react.createElement)("div", null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				onClick: download
			}, chromeCopy.retryDownload), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				onClick: () => {
					const operationId = stuck.operationId;
					setStuck(null);
					setAcquire(null);
					setNote(null);
					(0, _melite_card_base_client.postManageAction)("acquire_discard", { operation_id: operationId }).catch((e) => {
						setNote((0, _melite_card_base_client.rejectionVoice)(e));
					});
				}
			}, chromeCopy.deleteStuck), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				onClick: () => {
					setNote(chromeCopy.stuckRunRefusal);
				}
			}, chromeCopy.runAgain)) : null, note !== null ? (0, react.createElement)("p", { className: card_module_css_default.rescueErr }, note) : null));
		}
		//#endregion
		//#region src/client/card-drill.tsx
		/**
		* card-drill.tsx — THE CARD DRILLDOWN: the second state of the card
		* system, ONE component every card surface drills through (the chat
		* toolview FlowCards and the sidebar Cards tab — the 2026-09-10 UX
		* reborn 2026-09-11 as shared state + shared tool between the agent
		* and the user).
		*
		* DSH Modal (body portal, Escape/mask close — the operator's split
		* directive 2026-09-10): params LEFT (editable — switch fields ride
		* the Pill toggle, everything else a raw-string Input; editPatch
		* coerces ONCE at patch time so decimal dots survive typing), outputs
		* + Run RIGHT. Run ON THE CARD is a USER GESTURE, and it runs what
		* the user SEES: the caller receives the coerced patch and owns the
		* write-then-run order (the shared-state law — the patch lands in the
		* domain BEFORE the run reads it).
		*/
		function CardDrill({ title, fields, thumbUrl, running, onRun, onClose, stages }) {
			const [edits, setEdits] = (0, react.useState)(/* @__PURE__ */ new Map());
			const [runError, setRunError] = (0, react.useState)(null);
			const [rescue, setRescue] = (0, react.useState)(void 0);
			const patch = editPatch(fields, edits);
			const run = async () => {
				setRunError(null);
				setRescue(void 0);
				try {
					await onRun(patch);
				} catch (e) {
					setRunError((0, _melite_card_base_client.rejectionVoice)(e));
					setRescue(rescueOfLaneDetails(e.details) ?? void 0);
				}
			};
			const fieldNode = (f) => {
				if (f.atom === "switch") {
					const current = typeof f.value === "boolean" ? edits.get(f.key) ?? f.value : false;
					return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
						active: current,
						onClick: () => {
							setEdits((m) => new Map(m).set(f.key, !current));
						}
					}, typeof f.value === "boolean" ? current ? "on" : "off" : "?");
				}
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					value: String(edits.get(f.key) ?? f.value),
					onChange: (e) => {
						const target = e;
						setEdits((m) => new Map(m).set(f.key, target.target.value));
					}
				});
			};
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title,
				closeLabel: chromeCopy.closeCard,
				className: card_module_css_default.drill
			}, (0, react.createElement)("div", { className: card_module_css_default.split }, (0, react.createElement)("div", { className: card_module_css_default.params }, fields.map((f) => (0, react.createElement)("label", {
				key: f.key,
				className: card_module_css_default.field
			}, (0, react.createElement)("span", { className: card_module_css_default.fieldKey }, f.key), fieldNode(f)))), (0, react.createElement)("div", { className: card_module_css_default.outputs }, thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.outputImg,
				src: thumbUrl,
				alt: title
			}) : null, (0, react.createElement)("div", { className: card_module_css_default.runRow }, runError !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, runError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: () => {
					setRunError(null);
					setRescue(void 0);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, runError !== null && rescue !== void 0 ? (0, react.createElement)(RunRescue, {
				error: runError,
				stages: stages ?? [],
				onRun: () => {
					run();
				},
				rescue
			}) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: running,
				onClick: () => {
					run();
				}
			}, running ? "running…" : "Run")))));
		}
		//#endregion
		//#region ../../vendor/typert-protocol/src/remote-error.ts
		/**
		* One Remote call failure: a real Error carrying its stable code and typed
		* details. Owners throw it at the failure point; the Host Gateway encodes it
		* onto the wire unchanged; the Client face rebuilds an instance for the
		* `RemoteResult` error branch, so `throw result.error` keeps throw semantics.
		* Discrimination is always by `code`, never by instanceof.
		*/
		var RemoteError = class extends Error {
			/**
			* @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
			* @param message - human diagnostic carried across the wire.
			* @param details - structured payload typed by the code.
			* @param options - standard Error options (`cause` survives in-process only).
			*/
			constructor(code, message, details, options) {
				super(message, options);
				this.code = code;
				this.details = details;
				this.isDSHRemoteError = true;
				this.name = "RemoteError";
			}
		};
		//#endregion
		//#region ../../vendor/typert-protocol/src/index.ts
		/**
		* Remote decorators and explicit Gateway bindings backed by versioned
		* descriptors carried on decorated class prototypes. Strict reflection
		* remains a Typert compiler responsibility.
		* @module @deepseek-ai/dsh-typert-protocol
		*/
		//#endregion
		//#region ../../web-kit/contracts/src/benchStage.ts
		/** THE BIRTH STRIP (the cross-bench history leak, 2026-09-23,
		*  live proof bench-session-2bd2a61f): the wand restores onto fresh
		*  sessions carrying rows from a FOREIGN bench's run snapshot, and
		*  archives — history tiles, the run's result params, its live
		*  status, its resolved view — are the observe state THIS bench's
		*  own runs earn. They never survive a BIRTH.
		*
		*  THE ARM DECIDES, THE CONTRACT NAMES THE KEYS: this list belongs
		*  to the birth arm, not to row normalization — the LOAD arm keeps
		*  the stage memory law whole (same-id carry, fill-never-clobber),
		*  which is how a restore's history tiles are the restore's own
		*  point. Stripping at the wrong altitude is how a restore lost its
		*  tiles once already.
		*
		*  `result` is never in it: the wand's preview stamp is the one
		*  lawful birth memory. */
		const BIRTH_STRIP_KEYS = [
			"history",
			"resultParams",
			"runStatus",
			"resolved"
		];
		const SESSION_RE = /^[A-Za-z0-9_-]{1,64}$/;
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
		//#endregion
		//#region src/client/cards-resource.ts
		const tailDelay = (ms) => new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
		/** The bench address (the legacy bare form serves 'main' — the
		*  pre-session key records resolve unchanged). */
		const CARDS_BENCH_ADDRESS = "dsh-resource://cards/bench";
		/** The bench address for one session key. */
		function benchAddressOf(sessionKey) {
			return CARDS_BENCH_ADDRESS + "/" + benchSessionOf(sessionKey);
		}
		/** The session key a bench address carries (the bare legacy address
		*  and every non-bench address resolve to 'main'). */
		function benchSessionOfAddress(address) {
			if (!address.startsWith("dsh-resource://cards/bench/")) return "main";
			return benchSessionOf(address.slice(27));
		}
		/** The draft-stage address — the conversation card's studio target
		*  (the old embed's law; both segments encode, either may carry the
		*  separators the bare grammar refuses). */
		function cardsDraftStageAddress(draftId, stageId) {
			return "dsh-resource://cards/draft/" + encodeURIComponent(draftId) + "/" + encodeURIComponent(stageId);
		}
		/** Parse a cards address; null when the path is not one of ours. */
		function parseCardsAddress(address) {
			if (!address.startsWith("dsh-resource://cards/")) return null;
			const rest = address.slice(21);
			if (rest === "bench" || rest.startsWith("bench/")) return { bench: true };
			if (rest.startsWith("run/")) {
				const runId = decodeURIComponent(rest.slice(4));
				if (runId !== "") return { run: runId };
			}
			if (rest.startsWith("draft/")) {
				const body = rest.slice(6);
				const slash = body.indexOf("/");
				if (slash > 0 && slash < body.length - 1) return {
					draft: decodeURIComponent(body.slice(0, slash)),
					stage: decodeURIComponent(body.slice(slash + 1))
				};
			}
			return null;
		}
		/** One failure frame (the contract's error branch — a real RemoteError
		*  on the unclassified cards code; the address prefixes the diagnostic). */
		function failure(address, message) {
			return {
				ok: false,
				error: new RemoteError("cards/unclassified", address + ": " + message, {})
			};
		}
		/** Defensive row readers — the door's wire is untyped at this seam. */
		/** THE CARD BIRTH LAW, ONE PLACE (2026-10-10, the wire audit's
		*  CRITICAL-1): a chat-born bench's stage arrives with NO `card` —
		*  its identity survives on the DRAFT INTENT alone. The law was
		*  written out three times (readBench, the chat consult, and NOT at
		*  all in freshStageRow), so a tile could RENDER a card and then
		*  refuse to run: the drill read the re-attached row, the run read
		*  the raw one. One function, every reader: a single-stage
		*  card-born bench takes its identity from the intent; a
		*  user-authored multi-stage bench carries `card` per row and never
		*  takes this arm. */
		function deriveCardForRow(stages, intent) {
			if (intent === "" || stages.length !== 1) return stages;
			const only = stages[0];
			if (only["card"] !== void 0 && only["card"] !== "") return stages;
			return [{
				...only,
				card: intent
			}];
		}
		/** THE PROBE VERDICT, TRANSLATED (2026-10-10, the wire audit's
		*  H1): a file-era sidecar can answer `success` or `unknown` (the
		*  runs list admits both, and probeRunGone returns them verbatim).
		*  The tile's vocabulary has neither — so the stage was stamped with
		*  a status no dot knows, the observer stopped, and the tile looked
		*  idle FOREVER though its run had finished. The map is here, once:
		*  a verdict this client cannot render becomes a terminal one it
		*  can, never an unknown word stamped onto a row. */
		function tileStatusFromVerdict(verdict) {
			if (verdict === "gone") return "stopped";
			if (isLiveRunStatus(verdict)) return "running";
			if (!RUN_STATUS_WORDS.has(verdict.toLowerCase())) return "stopped";
			const folded = statusOf(verdict);
			if (folded === "done" || folded === "cached" || folded === "skipped" || folded === "reused") return "done";
			return "stopped";
		}
		function readBench(doc, sessionKey) {
			let stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			const intent = typeof doc["intent"] === "string" ? doc["intent"] : "";
			stages = deriveCardForRow(stages, intent);
			const log = Array.isArray(doc["log"]) ? doc["log"].filter((s) => typeof s === "object" && s !== null && typeof s["rev"] === "number") : [];
			return {
				kind: "bench",
				draftId: typeof doc["draft_id"] === "string" ? doc["draft_id"] : "bench-main",
				rev: typeof doc["rev"] === "number" ? doc["rev"] : 0,
				stages,
				log,
				sessionKey: benchSessionOf(sessionKey)
			};
		}
		/** A missing bench is a FRESH conversation's honest zero state, not a
		*  failure (stroke 44): a conversation's bench is born by its first
		*  write; reading before that serves the empty bench — rev 0, so the
		*  birth (rev 1) lands as a FRESH frame and the spotlight reveals
		*  the very first card. */
		function emptyBench(sessionKey) {
			const key = benchSessionOf(sessionKey);
			return readBench({
				draft_id: "bench-" + key,
				rev: 0,
				intent: "",
				stages: []
			}, key);
		}
		function isMissingBench(e) {
			return (0, _melite_card_base_client.rejectionVoice)(e).includes("no such bench");
		}
		/** Re-read one conversation's bench — the consumer's reload
		*  after its own edits (the provider's bench stream is a single
		*  snapshot; same-address navigation does not re-run it). */
		async function fetchBench(sessionKey, signal) {
			const key = benchSessionOf(sessionKey);
			try {
				return readBench(await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().bench.get(key, signal), "bench/get"), key);
			} catch (e) {
				if (isMissingBench(e)) return emptyBench(key);
				throw e;
			}
		}
		/** The cards surface's live marker (set by CardsTab's mount effect —
		*  the only seat that renders the bench). The spotlight skips the
		*  reveal while the surface is mounted AND the column is expanded:
		*  re-placing an address the user is already reading would reset
		*  their scroll/selection for nothing. */
		let cardsSurfaceLive = false;
		/** CardsTab's visibility contract: true while the bench surface is
		*  the mounted tab body, false the moment it unmounts (another tab
		*  took the pane, or the column collapsed its body away). */
		function markCardsSurface(live) {
			cardsSurfaceLive = live;
		}
		/** Whether the spotlight should reveal given the seat's own state
		*  (exported for the wall battery: the flag + the column's expanded
		*  face decide together — a collapsed column shows the rail, not the
		*  flow, so it still reveals). */
		function shouldSpotlight(isExpanded) {
			return !cardsSurfaceLive || !isExpanded;
		}
		/** THE SPOTLIGHT WATCHER, STREAM EDITION (2026-09-15, the mux swap —
		*  the heartbeat poll is DEAD): consume `bench/subscribe` for the
		*  ACTIVE session key — every estate write pushes one item, so the
		*  reveal fires at write time, not at the next tick. On a rev drift
		*  whose fresh log entries carry author "agent", fire onAgentLand
		*  once. The FIRST item of each key is hydration — history never
		*  yanks the user forward on load or on a conversation switch (the
		*  per-key baseline map survives re-keys, so returning to a key
		*  never replays its past).
		*
		*  RE-KEY WITHOUT A TIMER: the session source's observable
		*  (HostObservable.subscribe — push, no polling) trips a latch the
		*  consumption loop races against the pending item; a key change
		*  disposes the stream and reopens on the new key. Without the
		*  subscription seam the watcher still re-keys on the next item (a
		*  quiet switch delays only its own reveals, never the active
		*  stream's).
		*
		*  A terminal stream failure ends the watcher best-effort (logged —
		*  the watcher owns no rendered truth, the tab tail does; its
		*  swallow can hide nothing). Returns the stop function (the
		*  plugin's effect disposer). */
		function watchBenchLands(getSession, onAgentLand, signal, remote, benchNs, subscribeSession) {
			let stopped = false;
			const ctrl = new AbortController();
			const halt = () => {
				if (stopped) return;
				stopped = true;
				ctrl.abort();
			};
			signal?.addEventListener("abort", halt, { once: true });
			if (signal?.aborted === true) halt();
			if (remote === void 0 || benchNs === void 0) {
				console.error("[melite-card-view] bench spotlight off: the remote face or bench namespace did not mount");
				return halt;
			}
			const lastRevs = /* @__PURE__ */ new Map();
			let activeKey = benchSessionOf(getSession());
			let wakeRekey;
			let rekeyLatch = new Promise((resolve) => {
				wakeRekey = () => resolve("rekey");
			});
			const offSubscribe = subscribeSession?.(() => {
				if (benchSessionOf(getSession()) !== activeKey && !stopped) wakeRekey?.();
			});
			const openStream = (key) => remote.$stream({
				name: "cards bench spotlight",
				open: (openSignal) => benchNs.subscribe(key, openSignal),
				ended: (accepted) => new _deepseek_ai_dsh_api_gateway_client.RemoteStreamCarrierError(`bench spotlight stream ${accepted ? "ended" : "never opened"} (${key})`)
			});
			/** THE NAVIGATION-TEARDOWN LATCH (the reload wall, 2026-10-13): a
			*  page reload or close aborts every open transport mid-flight
			*  ("signal is aborted without reason" — the browser killing the
			*  connection at unload). A stream death after the page began
			*  unloading is teardown, never a supervisor failure: the error
			*  ledger of a plain reload must stay empty. */
			let pageUnloading = false;
			addEventListener("pagehide", () => {
				pageUnloading = true;
			}, { once: true });
			const run = async () => {
				let stream = openStream(activeKey);
				let iterator = stream[Symbol.asyncIterator]();
				let first = true;
				try {
					while (!stopped) {
						const raced = await Promise.race([iterator.next().then((item) => ({ item })), rekeyLatch]);
						if (raced === "rekey") {
							rekeyLatch = new Promise((resolve) => {
								wakeRekey = () => resolve("rekey");
							});
							const wanted = benchSessionOf(getSession());
							if (wanted !== activeKey) {
								activeKey = wanted;
								stream.dispose().catch((error) => {
									console.warn("[melite-card-view] spotlight rekey dispose refused:", error);
								});
								stream = openStream(wanted);
								iterator = stream[Symbol.asyncIterator]();
								first = true;
							}
							continue;
						}
						const result = raced.item;
						if (result.done) break;
						if (first) {
							result.value.accept();
							first = false;
						}
						const key = activeKey;
						const bench = readBench(result.value.value, key);
						const lastRev = lastRevs.get(key) ?? null;
						if (lastRev === null) lastRevs.set(key, bench.rev);
						else if (bench.rev > lastRev) {
							const seen = lastRev;
							lastRevs.set(key, bench.rev);
							if (bench.log.filter((e) => e.rev > seen).some((e) => e.author === "agent")) onAgentLand(key);
						} else lastRevs.set(key, bench.rev);
					}
				} catch (error) {
					if (pageUnloading) return;
					console.error("[melite-card-view] bench spotlight stream failed:", error);
				} finally {
					offSubscribe?.();
					await stream.dispose().catch((error) => {
						console.warn("[melite-card-view] spotlight dispose refused:", error);
					});
					signal?.removeEventListener("abort", halt);
				}
			};
			run();
			return halt;
		}
		/** THE OUTCOME OBSERVER (the attribution half): poll the run to
		*  terminal on the run-wire cadence, then write runStatus + result
		*  onto the bench row through the shared-state door. Both run paths
		*  (the sequential pass AND the tab's onStarted arm) fire it per
		*  gesture — the SINGLE-FLIGHT registry below seats them on ONE
		*  poller. The patch is bookkeeping — a refusal is swallowed (the
		*  next run rewrites the row), an abort ends the watch. The
		*  result.url rides the status door's already-rewritten media
		*  route. */
		/** THE SINGLE-FLIGHT REGISTRY (2026-09-21, the operator's catch:
		* the bench log carried PAIRS of identical result/runStatus patches
		* — two writes per state move, a re-render storm mid-run that ate
		* clicks and reset scroll): ONE observer per draft:stage:run, ever,
		* in-process. Both run paths (the sequential pass's own await AND
		* the tab's onStarted arm) observe the same run — the second call
		* RIDES the first's promise instead of arming a twin poller. The
		* entry clears when the observer settles, so a genuinely new run
		* (or a retry after settle) observes fresh. */
		const observingRuns = /* @__PURE__ */ new Map();
		function observeRunOutcome(draftId, stageId, runId, signal, onTouched) {
			const key = `${draftId}\u0000${stageId}\u0000${runId}`;
			const inFlight = observingRuns.get(key);
			if (inFlight !== void 0) return inFlight;
			const seated = observeRunOutcomeRun(draftId, stageId, runId, signal, onTouched).finally(() => {
				observingRuns.delete(key);
			});
			observingRuns.set(key, seated);
			return seated;
		}
		async function observeRunOutcomeRun(draftId, stageId, runId, signal, onTouched) {
			try {
				await patchStageOutcome(draftId, stageId, {
					runStatus: statusOf(await (0, _melite_card_base_client.fetchRunStatus)(runId, signal).then((r) => r.status).catch(() => "running")) === "queued" ? "queued" : "running",
					result: { run_id: runId }
				});
				onTouched?.();
			} catch {}
			let lastLive = "running";
			let lastPct = null;
			let lastAct = "";
			let transportFails = 0;
			let healthStamped = false;
			const TRANSPORT_UNREACHABLE_AFTER = 10;
			const TRANSPORT_BACKOFF_BASE_MS = 1500;
			const TRANSPORT_BACKOFF_MAX_MS = 1e4;
			while (signal?.aborted !== true) {
				let row;
				try {
					row = await (0, _melite_card_base_client.fetchRunStatus)(runId, signal);
				} catch (e) {
					if ((0, _melite_card_base_client.isEstateRefusal)(e)) {
						const terminal = tileStatusFromVerdict(await (0, _melite_card_base_client.probeRunGone)(runId, signal));
						try {
							await patchStageOutcome(draftId, stageId, healthStamped ? {
								runStatus: terminal,
								result: { run_id: runId },
								health: null
							} : {
								runStatus: terminal,
								result: { run_id: runId }
							});
							onTouched?.();
						} catch {}
						return terminal === "running" ? null : terminal;
					}
					transportFails += 1;
					if (transportFails === TRANSPORT_UNREACHABLE_AFTER) try {
						await patchStageOutcome(draftId, stageId, {
							health: "unreachable",
							result: { run_id: runId }
						});
						healthStamped = true;
						lastLive = "";
						onTouched?.();
					} catch {}
					await (0, _melite_card_base_client.abortableSleep)(Math.min(TRANSPORT_BACKOFF_BASE_MS * 2 ** (transportFails - 1), TRANSPORT_BACKOFF_MAX_MS), signal);
					continue;
				}
				transportFails = 0;
				if (!isTerminalStatus$1(row.status)) {
					const live = statusOf(row.status) === "queued" ? "queued" : "running";
					const stage = row.stages.find((s) => s.id === stageId) ?? (row.stages.length === 1 ? row.stages[0] : void 0);
					const p = stage?.progress;
					const pct = p !== void 0 && p.max > 0 ? Math.floor(100 * p.value / p.max) : null;
					const act = stage?.activity ?? "";
					if (live !== lastLive || pct !== lastPct || act !== lastAct) {
						const patch = { runStatus: live };
						if (healthStamped) {
							patch["health"] = null;
							healthStamped = false;
						}
						if (pct !== null || act !== "") patch["result"] = {
							run_id: runId,
							...pct !== null && p !== void 0 ? { progress: {
								value: p.value,
								max: p.max
							} } : {},
							...act !== "" ? { activity: act } : {}
						};
						lastLive = live;
						lastPct = pct;
						lastAct = act;
						try {
							await patchStageOutcome(draftId, stageId, patch);
							onTouched?.();
						} catch {}
					}
					await (0, _melite_card_base_client.abortableSleep)(1500, signal);
					continue;
				}
				const stage = row.stages.find((s) => s.id === stageId) ?? (row.stages.length === 1 ? row.stages[0] : void 0);
				const rowError = row["error"];
				const runError = typeof rowError === "string" ? rowError : void 0;
				const { result, terminal } = terminalOutcomeOf(runId, row.status, stage, runError);
				try {
					await patchStageOutcome(draftId, stageId, healthStamped ? {
						runStatus: terminal,
						result,
						health: null
					} : {
						runStatus: terminal,
						result
					});
					onTouched?.();
				} catch {}
				return terminal;
			}
			return null;
		}
		/** THE PHANTOM RECONCILE (2026-09-13): rows stamped running/queued
		*  whose run the restarted estate no longer knows flip to their
		*  honest terminal (the file-era list's answer, else stopped) — the
		*  observer that would have written it died with the session that
		*  started the run. Live rows arm a tab-side observer so terminal
		*  always lands even when the starting session is gone. Idempotent
		*  per stage:run key (the `armed` set is the caller's, kept across
		*  bench refreshes). */
		async function reconcileBenchRuns(bench, hooks = {}) {
			for (const stage of bench.stages) {
				if (!isLiveRunStatus(typeof stage.runStatus === "string" ? stage.runStatus : "")) continue;
				const result = typeof stage.result === "object" && stage.result !== null ? stage.result : null;
				const runId = result !== null && typeof result["run_id"] === "string" ? result["run_id"] : "";
				if (runId === "") continue;
				const key = stage.id + ":" + runId;
				if (hooks.armed?.has(key) === true) continue;
				hooks.armed?.add(key);
				let verdict;
				try {
					verdict = await (0, _melite_card_base_client.probeRunGone)(runId, hooks.signal);
				} catch {
					hooks.armed?.delete(key);
					continue;
				}
				if (verdict === "live") {
					observeRunOutcome(bench.draftId, stage.id, runId, hooks.signal, hooks.onTouched);
					continue;
				}
				const terminal = tileStatusFromVerdict(verdict);
				try {
					await patchStageOutcome(bench.draftId, stage.id, {
						runStatus: terminal,
						result: { run_id: runId }
					});
					hooks.onTouched?.();
				} catch {}
			}
		}
		/** THE TERMINAL OUTCOME BUILDER (pure, under CONTRACT — the
		* operator's law, 2026-09-20). Turns a terminal runs/status row
		* into the bench patch's result + runStatus. The row it returns
		* satisfies `benchResultDefects` (the bench stage result contract)
		* — the observer writes lawful rows only, and the walls drive THIS
		* builder against the real status shape (never a hand-claimed
		* fixture).
		*
		* ONE FILE, ONE KEY (the doubled-rowset cure): the artifacts map
		* carries each file EXACTLY ONCE, keyed by its gallery name. The
		* legacy hardcoded 'video' stamp wrote the stage url — which IS
		* gallery[0] — under a second key, so every image-gen result
		* rendered the same picture twice (hero + a phantom rest-thumb
		* row). The h3 timeline (the stamp's only reader) backfills its
		* own artifacts.video when absent — no consumer needs the stamp.
		* The primary `url` field may name a file that also lives in the
		* map (it is the primary POINTER, not a second key). */
		function terminalOutcomeOf(runId, status, stage, runError) {
			const folded = statusOf(status);
			const terminal = folded === "done" ? "done" : folded === "error" ? "failed" : "stopped";
			const result = { run_id: runId };
			const url = stage !== void 0 && typeof stage.url === "string" && stage.url !== "" ? stage.url : "";
			if (url !== "") result["url"] = url;
			const gallery = Array.isArray(stage?.gallery) ? stage.gallery : [];
			const artNames = [];
			for (const g of gallery) if (typeof g?.name === "string" && g.name !== "") artNames.push(g.name);
			if (artNames.length > 0) {
				const artifacts = {};
				const mediaUrls = [];
				for (const n of artNames) {
					const u = toRunMediaUrl(runId, n);
					if (mediaUrls.includes(u)) continue;
					mediaUrls.push(u);
					artifacts[n] = u;
				}
				result["artifacts"] = artifacts;
				result["assetUrls"] = url !== "" && !mediaUrls.includes(url) ? [url, ...mediaUrls] : mediaUrls;
			}
			if (stage !== void 0 && typeof stage.reports === "object" && stage.reports !== null && !Array.isArray(stage.reports)) {
				const entries = Object.entries(stage.reports).filter(([, v]) => typeof v === "object" && v !== null && !Array.isArray(v));
				if (entries.length > 0) result["reports"] = Object.fromEntries(entries);
			}
			if (terminal === "failed") {
				const reason = typeof stage?.error === "string" && stage.error !== "" ? stage.error : runError;
				if (reason !== void 0 && reason !== "") result["error"] = reason;
			}
			return {
				result,
				terminal
			};
		}
		function readRun(runId, doc) {
			const row = readRunStatus(runId, doc);
			return {
				kind: "run",
				runId: row.runId,
				status: row.status,
				draftId: row.draftId,
				stages: row.stages,
				...row.error !== void 0 ? { error: row.error } : {},
				...row.graph_receipt !== void 0 ? { graphReceipt: row.graph_receipt } : {},
				lastFrame: void 0
			};
		}
		async function readStageRow(draftId, stageId, signal) {
			try {
				const doc = await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().drafts.get(draftId, signal), "drafts/get");
				const row = deriveCardForRow(Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [], typeof doc["intent"] === "string" ? doc["intent"] : "").find((s) => s.id === stageId) ?? null;
				return row === null ? { status: "gone" } : {
					status: "ready",
					row
				};
			} catch {
				return { status: "unreadable" };
			}
		}
		/** The drill's fresh read (the null contract — null when gone, never
		*  a throw). The RUN door must NOT use this: it needs the reason
		*  (readStageRow above) — composing the held row on a failed read
		*  is the silent stale-run seat. */
		async function freshStageRow(draftId, stageId, signal) {
			const read = await readStageRow(draftId, stageId, signal);
			return read.status === "ready" ? read.row : null;
		}
		function readDraft(draftId, stageId, doc) {
			const stages = Array.isArray(doc["stages"]) ? doc["stages"].filter((s) => typeof s === "object" && s !== null && typeof s["id"] === "string") : [];
			const bench = doc["bench"];
			const rev = typeof bench === "object" && bench !== null && typeof bench["rev"] === "number" ? bench["rev"] : 0;
			return {
				kind: "draft",
				draftId,
				stageId,
				intent: typeof doc["intent"] === "string" ? doc["intent"] : "",
				stages,
				rev
			};
		}
		/** Card-back-into-flow: restore a run's producing draft onto the
		*  shared bench — drafts/get (the draft holds the full
		*  card/engine/params stages) then per-stage bench/add-stage as the
		*  USER (the CAS law: bench/get first, each add carries expect_rev,
		*  chained from the previous answer's rev). A stage with no card is
		*  SKIPPED and counted (add-stage requires one); an id collision
		*  retries once without the id (the bench auto-ids s_<n>) and notes
		*  it. Any other refusal throws with the door's own text — the bench
		*  keeps whatever landed before it, and the report says so.
		*
		*  THE OUTCOME CARRY (2026-10-02, the resume law's run-view half):
		*  the run's own stage rows hold the terminal outcome a bare
		*  re-admission loses — the add-stage door authors params only and
		*  refuses result/runStatus by its own law, so the outcome rides the
		*  same drafts patch door the live observer writes, stamped by the
		*  same builder (terminalOutcomeOf). Matching is by stage id (the
		*  run executed this very draft's rows); a draft edited since keeps
		*  its surviving ids' outcomes and simply has none for new rows. */
		async function restoreRunToBench(run, sessionKey, signal) {
			if (run.draftId === null || run.draftId === "") throw new Error("this run names no draft — nothing to restore");
			const key = benchSessionOf(sessionKey);
			let draft;
			try {
				draft = await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().drafts.get(run.draftId, signal), "drafts/get");
			} catch (e) {
				throw new Error("the producing draft is unreadable: " + (0, _melite_card_base_client.rejectionVoice)(e));
			}
			const raw = draft["stages"];
			const stages = Array.isArray(raw) ? raw.filter((s) => typeof s === "object" && s !== null) : [];
			if (stages.length === 0) throw new Error("the producing draft holds no stages — nothing to restore");
			let bench;
			try {
				bench = await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().bench.get(key, signal), "bench/get");
			} catch (e) {
				throw new Error("the bench is unreadable: " + (0, _melite_card_base_client.rejectionVoice)(e));
			}
			let rev = typeof bench["rev"] === "number" ? bench["rev"] : 0;
			const report = {
				added: 0,
				skipped: 0,
				carried: 0,
				notes: []
			};
			for (const st of stages) {
				const card = st["card"];
				if (typeof card !== "string" || card === "") {
					report.skipped += 1;
					report.notes.push("skipped a stage with no card (add-stage requires one)");
					continue;
				}
				const doc = {
					card,
					author: "user",
					expect_rev: rev
				};
				if (typeof st["engine"] === "string" && st["engine"] !== "") doc["engine"] = st["engine"];
				if (typeof st["params"] === "object" && st["params"] !== null && !Array.isArray(st["params"])) doc["params"] = st["params"];
				const id = typeof st["id"] === "string" && st["id"] !== "" ? st["id"] : null;
				if (id !== null) doc["id"] = id;
				try {
					const row = await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().bench["add-stage"](key, doc, signal), "bench/add-stage");
					if (typeof row["rev"] === "number") rev = row["rev"];
					report.added += 1;
					await carryOutcome(run, key, id, row, report, signal);
				} catch (e) {
					const message = (0, _melite_card_base_client.rejectionVoice)(e);
					if (id !== null && message.includes("already on the bench")) {
						const retry = { ...doc };
						delete retry["id"];
						try {
							const row = await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().bench["add-stage"](key, retry, signal), "bench/add-stage");
							if (typeof row["rev"] === "number") rev = row["rev"];
							report.added += 1;
							report.notes.push(id + " was already on the bench — added under a fresh id");
							await carryOutcome(run, key, id, row, report, signal);
						} catch (e2) {
							throw new Error("restore stopped after " + String(report.added) + " stage(s): " + (0, _melite_card_base_client.rejectionVoice)(e2));
						}
					} else throw new Error("restore stopped after " + String(report.added) + " stage(s): " + message);
				}
			}
			return report;
		}
		/** One restored row's outcome carry: patch the terminal outcome the
		*  run's own stage row holds onto the seated bench row, through the
		*  drafts patch door (the only door result/runStatus lawfully ride
		*  — the add-stage verb refuses them by its authoring law). The
		*  lookup id is the DRAFT's id (the run's rows carry it); the patch
		*  target is the SEATED id the add answer names (a collision retry
		*  seats a fresh one). A stage with no outcome data carries nothing;
		*  a carry that cannot land notes itself — the workflow stands
		*  either way.
		*  @param run the run value the restore serves (its stage rows hold
		*  the terminal outcomes).
		*  @param benchKey the bench draft id the rows landed on.
		*  @param draftStageId the DRAFT stage id this row restored (null —
		*  an id-less draft row — carries nothing: the run's rows are id-keyed).
		*  @param addAnswer the bench/add-stage answer (its `stage` names the
		*  seated id; a non-string answer falls back to the draft id).
		*  @param report the report the carry counts into.
		*  @param signal the caller's abort signal, honored by the patch. */
		async function carryOutcome(run, benchKey, draftStageId, addAnswer, report, signal) {
			if (draftStageId === null) return;
			const runStage = run.stages.find((s) => s.id === draftStageId);
			if (runStage === void 0) return;
			const outcome = terminalOutcomeOf(run.runId, runStage.status, runStage, void 0);
			if (!("url" in outcome.result) && !("artifacts" in outcome.result) && !("error" in outcome.result)) return;
			const seated = typeof addAnswer["stage"] === "string" && addAnswer["stage"] !== "" ? addAnswer["stage"] : draftStageId;
			try {
				await patchStageOutcome(benchKey, seated, {
					runStatus: outcome.terminal,
					result: outcome.result
				});
				report.carried += 1;
			} catch (e) {
				report.notes.push("could not carry " + draftStageId + "'s outcome: " + (0, _melite_card_base_client.rejectionVoice)(e));
			}
		}
		/** The provider registration body: `ctx.resources.register({ protocol:
		*  'cards', open })`. The bench tail rides the mounted remote face
		*  (bench/subscribe over the mux — the client entry passes the live
		*  ctx.remote here); abort ends the stream per the contract. */
		function openCardsResource(address, ctx, remote, benchNs) {
			const target = parseCardsAddress(address);
			const benchKey = benchSessionOfAddress(address);
			const bench = target !== null && "bench" in target;
			const runId = target !== null && "run" in target ? target.run : "";
			const draftTarget = target !== null && "draft" in target ? target : null;
			return (async function* () {
				if (target === null) {
					yield failure(address, "not a cards address");
					return;
				}
				if (bench) {
					if (remote === void 0) {
						let value;
						try {
							value = readBench(await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().bench.get(benchKey), "bench/get"), benchKey);
						} catch (e) {
							if (!isMissingBench(e)) {
								yield failure(address, (0, _melite_card_base_client.rejectionVoice)(e));
								return;
							}
							value = emptyBench(benchKey);
						}
						yield {
							ok: true,
							value
						};
						yield failure(address, "bench stream unavailable — the remote face did not mount (showing one snapshot)");
						return;
					}
					if (benchNs === void 0) {
						yield failure(address, "bench stream failed: the bench namespace did not mount (the inject seat is absent)");
						return;
					}
					yield* streamBenchFrames(remote, benchNs, benchKey, address, ctx.signal);
					return;
				}
				if (draftTarget !== null) {
					let value;
					try {
						value = readDraft(draftTarget.draft, draftTarget.stage, await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().drafts.get(draftTarget.draft), "drafts/get"));
					} catch (e) {
						yield failure(address, (0, _melite_card_base_client.rejectionVoice)(e));
						return;
					}
					yield {
						ok: true,
						value
					};
					let lastRev = value.rev;
					let lastFaces = JSON.stringify(value.stages);
					while (!ctx.signal.aborted) {
						await tailDelay(1500);
						if (ctx.signal.aborted) return;
						let next;
						try {
							next = readDraft(draftTarget.draft, draftTarget.stage, await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().drafts.get(draftTarget.draft), "drafts/get"));
						} catch (tailReadError) {
							continue;
						}
						const faces = JSON.stringify(next.stages);
						if (lastRev === next.rev && lastFaces === faces) continue;
						lastRev = next.rev;
						lastFaces = faces;
						value = next;
						yield {
							ok: true,
							value
						};
					}
					return;
				}
				let value;
				try {
					value = readRun(runId, await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().runs.status(runId), "runs/status"));
				} catch (e) {
					yield failure(address, (0, _melite_card_base_client.rejectionVoice)(e));
					return;
				}
				yield {
					ok: true,
					value
				};
				if (isTerminal(value.status)) return;
				if (remote === void 0) {
					yield failure(address, "run stream unavailable — the remote face did not mount (showing one snapshot)");
					return;
				}
				yield* streamRunFrames(remote, runId, address, value, ctx.signal);
			})();
		}
		/** The sidebar conversation card's run-frames carrier — handed down
		*  from the client entry. The card (the toolview mount in the right
		*  sidebar's cards column) cannot reach ctx.remote (estateRemote
		*  binds the namespaces only, and $stream lives on the remote face),
		*  so the entry binds the live face here after its mounts; the card's
		*  live tail then rides the SAME run frames the run view's resource
		*  serves. Unbound (a harness that never mounted) is the provider's
		*  unmounted face: one snapshot, one failure frame, the tail ends. */
		let runFramesRemote;
		/** Bind the run-frames carrier (the client entry, once, after mounts).
		*
		* @param remote the live remote face ($stream included); undefined
		*   unbinds (tests reset between mounts) */
		function bindRunFramesRemote(remote) {
			runFramesRemote = remote;
		}
		/** The sidebar conversation card's live tail — run frames by run id
		*  (the run view's resource, same address, same carrier law).
		*
		* @param runId the started run
		* @param signal abort disposes the stream and ends the tail
		* @returns the run resource's frames: one hydrate, then movement */
		function subscribeRunFrames(runId, signal) {
			return openCardsResource((0, _melite_card_base_client.cardsRunAddress)(runId), { signal }, runFramesRemote, void 0);
		}
		/** The terminal statuses — the runs seat's own vocabulary (runsRegistry:
		*  stopFlag stamps 'stopped'; the settle path stamps 'completed' or
		*  'failed'. A settled run ends the stream; the hydrated/polled value
		*  stays as the last ok frame. */
		function isTerminal(status) {
			return isTerminalStatus(status);
		}
		/** THE RUN TAIL, STREAM EDITION (1.8, the hand-roll audit's last
		*  poll retired 2026-10-12 — the poll is DEAD): consume
		*  `runs/subscribe` through the gateway's reconnecting RemoteStream —
		*  one item per registry write that moves the run, push on the
		*  same-origin mux, zero cadence chatter. The laws the poll held,
		*  kept one-for-one (the bench tail's own charter, streamBenchFrames
		*  below):
		*
		*  - NO FRAME SPAM: an item yields ONLY on row change — status
		*    drift or the stages' own bytes. The spam floor is seeded from
		*    the hydrated row, so the stream re-serving the row the view
		*    already shows stays quiet.
		*  - THE VISIBILITY LAW (the silent-death cure): a carrier loss —
		*    the wire dropped, the supervisor is reconnecting — surfaces as
		*    ONE failure frame beside the last ok value, cleared by the next
		*    frame. A TERMINAL stream failure (the supervisor gave up) is
		*    one final failure frame, then the tail ends; the holder can
		*    reopen.
		*  - TERMINAL ROW: a settled run ends the tail (the last ok frame
		*    stays as the view).
		*  - ABORT: the holder's signal disposes the stream and ends the
		*    tail clean.
		*
		* The loss race: the carrierFailed callback cannot yield from inside
		* the generator, so it trips a latch the consumption loop races
		* against the pending iterator step — the voice lands the moment the
		* loss is noticed, not at recovery. */
		async function* streamRunFrames(remote, runId, address, hydrated, signal) {
			let wake;
			let latch = new Promise((resolve) => {
				wake = () => resolve("loss");
			});
			const stream = remote.$stream({
				name: "cards run stream",
				open: (openSignal) => (0, _melite_card_base_client.estateRemote)().runs.subscribe(runId, openSignal),
				ended: (accepted) => new _deepseek_ai_dsh_api_gateway_client.RemoteStreamCarrierError(accepted ? `run stream ended after its snapshot (${address})` : `run stream ended before its first frame (${address})`),
				carrierFailed: () => {
					wake?.();
				}
			});
			const onAbort = () => {
				stream.dispose().catch((error) => {
					console.warn("[melite-card-view] tail dispose refused:", error);
				});
			};
			if (signal.aborted) {
				onAbort();
				return;
			}
			signal.addEventListener("abort", onAbort, { once: true });
			const iterator = stream[Symbol.asyncIterator]();
			let first = true;
			let lastStatus = hydrated.status;
			let lastFaces = JSON.stringify(hydrated.stages);
			try {
				for (;;) {
					const step = iterator.next();
					const raced = await Promise.race([step.then((item) => ({ item })), latch]);
					let result;
					if (raced === "loss") {
						yield failure(address, "run live stream lost — reconnecting (showing the last known state)");
						latch = new Promise((resolve) => {
							wake = () => resolve("loss");
						});
						result = await step;
					} else result = raced.item;
					if (result.done) return;
					const item = result.value;
					if (first) {
						item.accept();
						first = false;
					}
					const value = readRun(runId, item.value);
					const faces = JSON.stringify(value.stages);
					if (lastStatus === value.status && lastFaces === faces) continue;
					lastStatus = value.status;
					lastFaces = faces;
					yield {
						ok: true,
						value
					};
					if (isTerminal(value.status)) return;
				}
			} catch (e) {
				yield failure(address, "run stream failed: " + (0, _melite_card_base_client.rejectionVoice)(e));
				return;
			} finally {
				signal.removeEventListener("abort", onAbort);
				await stream.dispose().catch((error) => {
					console.warn("[melite-card-view] run tail dispose refused:", error);
				});
			}
		}
		/** THE BENCH TAIL, STREAM EDITION (2026-09-15, the mux swap — the
		*  poll is DEAD): consume `bench/subscribe` through the gateway's
		*  reconnecting RemoteStream — one item per estate write, push on the
		*  same-origin mux, zero cadence chatter. The laws the poll held,
		*  kept one-for-one:
		*
		*  - FIRST FRAME: the stream's opening doc (the subscribe generator
		*    serves the zero state for a not-yet-born bench — the birth watch).
		*  - NO FRAME SPAM: later items yield ONLY on doc change — rev
		*    drift (an author move) or run-face movement at the same rev (a
		*    run's progress/result/history landing through a rev-silent
		*    telemetry write). A reconnect re-serving the identical doc is
		*    the same rev AND the same stage bytes: no frame.
		*  - THE VISIBILITY LAW (the silent-death cure): a carrier loss —
		*    the wire dropped, the supervisor is reconnecting — surfaces as
		*    ONE failure frame beside the last ok value, cleared by the next
		*    frame. A TERMINAL stream failure (the supervisor gave up) is one
		*    final failure frame, then the tail ends; the holder can reopen.
		*  - ABORT: the holder's signal disposes the stream and ends the
		*    tail clean.
		*
		* The loss race: the carrierFailed callback cannot yield from inside
		* the generator, so it trips a latch the consumption loop races
		* against the pending iterator step — the voice lands the moment the
		* loss is noticed, not at recovery. */
		async function* streamBenchFrames(remote, benchNs, sessionKey, address, signal) {
			let wake;
			let latch = new Promise((resolve) => {
				wake = () => resolve("loss");
			});
			const stream = remote.$stream({
				name: "cards bench stream",
				open: (openSignal) => benchNs.subscribe(sessionKey, openSignal),
				ended: (accepted) => new _deepseek_ai_dsh_api_gateway_client.RemoteStreamCarrierError(accepted ? `bench stream ended after its snapshot (${address})` : `bench stream ended before its first frame (${address})`),
				carrierFailed: () => {
					wake?.();
				}
			});
			const onAbort = () => {
				stream.dispose().catch((error) => {
					console.warn("[melite-card-view] tail dispose refused:", error);
				});
			};
			if (signal.aborted) {
				onAbort();
				return;
			}
			signal.addEventListener("abort", onAbort, { once: true });
			const iterator = stream[Symbol.asyncIterator]();
			let first = true;
			let lastRev = null;
			let lastFaces = null;
			try {
				for (;;) {
					const step = iterator.next();
					const raced = await Promise.race([step.then((item) => ({ item })), latch]);
					let result;
					if (raced === "loss") {
						yield failure(address, "bench live stream lost — reconnecting (showing the last known state)");
						latch = new Promise((resolve) => {
							wake = () => resolve("loss");
						});
						result = await step;
					} else result = raced.item;
					if (result.done) return;
					const item = result.value;
					if (first) {
						item.accept();
						first = false;
					}
					const value = readBench(item.value, sessionKey);
					const faces = JSON.stringify(value.stages);
					if (lastRev === value.rev && lastFaces === faces) continue;
					lastRev = value.rev;
					lastFaces = faces;
					yield {
						ok: true,
						value
					};
				}
			} catch (e) {
				yield failure(address, "bench stream failed: " + (0, _melite_card_base_client.rejectionVoice)(e));
				return;
			} finally {
				signal.removeEventListener("abort", onAbort);
				await stream.dispose().catch((error) => {
					console.warn("[melite-card-view] bench tail dispose refused:", error);
				});
			}
		}
		//#endregion
		//#region ../../web-kit/contracts/src/mediaKinds.ts
		/** The estate media-kind vocabulary (typed DATA — see header). */
		function mediaVocab$1() {
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
		const KIND_BY_EXT$1 = (() => {
			const table = {};
			const vocab = mediaVocab$1();
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
		function mediaKindOf$1(name) {
			const dot = name.lastIndexOf(".");
			if (dot < 0 || dot === name.length - 1) return void 0;
			return KIND_BY_EXT$1[name.slice(dot + 1).toLowerCase()];
		}
		//#endregion
		//#region src/client/preview-kinds.ts
		/** THE PREVIEW SEAM CONSULT (hour-9 law: "Where the VIDEO PREVIEW
		*  and the IMAGE PREVIEW of other cards go in a SLOT with SHARED DSH
		*  PRIMITIVES"): one consult, keyed by media kind, the card-base
		*  shared previews as the DEFAULTS. Every card's rendered output
		*  previews through this — image cards get the shared image preview,
		*  video cards the shared video one; a studio's own stage view is
		*  its specialization (the claim-over-default law).
		*
		*  ONE CLASSIFIER (the li-ay stroke, 2026-10-11): this private
		*  three-regex sniff was the FIFTH media vocabulary on the estate —
		*  it carried avif but dropped svg/bmp (an .svg artifact got NO
		*  preview) and missed mkv/avi/aac entirely. The contract's
		*  mediaKindOf classifies now; this seat keeps only its own two
		*  concerns — the query string a served url may carry, and the UI's
		*  'mesh' spelling for the vocab's 'model' kind. */
		function previewKindFor(url) {
			const kind = mediaKindOf$1(url.split("?")[0]);
			if (kind === void 0) return null;
			return kind === "model" ? "mesh" : kind;
		}
		/** THE PRIMARY-OUTPUT RESOLUTION (2026-09-13): the card's DECLARED
		*  primary output — the served form-spec's `outputs.default` — is
		*  the preview's kind, never a url sniff. The sniff stays ONLY as
		*  the fallback: when no spec is in hand (a flow row without card
		*  identity), or when the declaration names a non-previewable kind
		*  (seg) whose artifacts may still carry a renderable url — mask
		*  declares 'seg' and its artifact IS a png; the sniff keeps its
		*  gallery alive. Declared-previewable ALWAYS wins: an audio card
		*  previews audio even before artifacts land (the empty state names
		*  the kind), a mesh card rides the raw-three stage — and a TEXT
		*  card (the tagger stroke, 2026-10-24) previews its words: text is
		*  a first-class previewable kind, never a dead tile. */
		const PREVIEWABLE_KINDS = /* @__PURE__ */ new Set([
			"video",
			"image",
			"audio",
			"mesh",
			"text"
		]);
		function primaryKindFor(spec, url) {
			const declared = spec?.outputs?.["default"];
			if (typeof declared === "string" && PREVIEWABLE_KINDS.has(declared)) return declared;
			return previewKindFor(url);
		}
		/** THE PARAMS CHIP (the output-component stroke — the operator's
		*  law: old generations are tagged by the parameters that differ):
		*  the comma-joined KEYS whose values differ between an archived
		*  generation's params snapshot and the live params. undefined when
		*  the snapshot is absent (an entry archived before the stroke) or
		*  nothing differs — same params, same picture, no noise. */
		function paramsDiffKeys(a, b) {
			const ok = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
			if (!ok(a) || !ok(b)) return void 0;
			const keys = /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)]);
			const diff = [];
			for (const k of keys) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diff.push(k);
			if (diff.length === 0) return void 0;
			return diff.slice(0, 4).join(", ") + (diff.length > 4 ? "…" : "");
		}
		/** The stage row's preview artifacts, harvested from the estate's
		*  result shape (artifacts name→url map first, the flat assetUrls
		*  list second — the harvest law the h3 adapter states).
		*  ONE FILE, ONE ARTIFACT (2026-09-20, the operator's catch: "two
		*  rowsets under the preview image"): rows written before the
		*  observer's de-stamp carry the same url under two keys (the
		*  legacy 'video' stamp + the gallery name) — the harvest dedupes
		*  BY URL so those rows render ONE artifact, and the legacy
		*  'video' name never paints (retitled 'output'): the word
		*  'video' on an image card is the phantom's face. */
		function previewArtifactsFor(row) {
			const result = typeof row["result"] === "object" && row["result"] !== null ? row["result"] : {};
			const out = [];
			const seen = /* @__PURE__ */ new Set();
			const arts = typeof result["artifacts"] === "object" && result["artifacts"] !== null ? result["artifacts"] : {};
			for (const [name, val] of Object.entries(arts)) {
				if (name === "video") continue;
				if (typeof val === "string" && val !== "" && !seen.has(val)) {
					seen.add(val);
					out.push({
						name,
						url: val
					});
				}
			}
			for (const [name, val] of Object.entries(arts)) {
				if (name !== "video") continue;
				if (typeof val === "string" && val !== "" && !seen.has(val)) {
					seen.add(val);
					out.push({
						name: "output",
						url: val
					});
				}
			}
			if (out.length === 0 && Array.isArray(result["assetUrls"])) {
				for (const u of result["assetUrls"]) if (typeof u === "string" && u !== "") out.push({
					name: "output",
					url: u
				});
			}
			if (out.length === 0 && typeof result["url"] === "string" && result["url"] !== "") out.push({
				name: "output",
				url: result["url"]
			});
			return out;
		}
		/** The stage row's REPORT harvest (ROADMAP 11e): the named
		*  machine-readable verdicts a run writes beside its media — the
		*  same object the agent loop gates on, rendered by the result
		*  row's ONE default atom (card-base's ReportView, claimed by
		*  kind). ONLY kind-'report' entries harvest; a degenerate value
		*  (not an object) never renders — the contract's validator names
		*  it at the writer, the reader just stays silent. */
		function previewReportsFor(row) {
			const result = typeof row["result"] === "object" && row["result"] !== null ? row["result"] : {};
			const raw = typeof result["reports"] === "object" && result["reports"] !== null && !Array.isArray(result["reports"]) ? result["reports"] : {};
			const out = [];
			for (const [name, val] of Object.entries(raw)) {
				if (typeof val !== "object" || val === null || Array.isArray(val)) continue;
				const rep = val;
				if (rep["kind"] !== "report") continue;
				if (rep["status"] !== "pass" && rep["status"] !== "fail" && rep["status"] !== "warn") continue;
				out.push({
					name,
					report: {
						kind: "report",
						status: rep["status"],
						...typeof rep["title"] === "string" && rep["title"] !== "" ? { title: rep["title"] } : {},
						...Array.isArray(rep["chips"]) && rep["chips"].every((c) => typeof c === "string" && c !== "") ? { chips: rep["chips"] } : {},
						...typeof rep["rows"] === "object" && rep["rows"] !== null && !Array.isArray(rep["rows"]) && Object.values(rep["rows"]).every((v) => typeof v === "string" || typeof v === "number" || typeof v === "boolean") ? { rows: rep["rows"] } : {}
					}
				});
			}
			return out;
		}
		//#endregion
		//#region src/client/bench-row.ts
		/** bench-row.ts — the bench stage distilled to the card row: the dot
		* map, the row interface, the distillation, the card grouping
		* (extracted from CardsTab.tsx hour 15). */
		/** CardStatus → the installed StateDot union (FlowCards' CardRowLine
		*  law: done|warning|ongoing|error — a stage that never ran shows NO
		*  dot, never a fake state). */
		const STATUS_DOT = {
			pending: null,
			queued: "warning",
			running: "ongoing",
			done: "done",
			error: "error",
			stopped: "warning",
			stale: null,
			cached: "done",
			skipped: null,
			reused: "done"
		};
		/** The chrome's running truth: the row's FOLDED status (the observer
		*  patches it terminal the moment the run lands). The folded live
		*  pair is running|queued — the waiting face. Folded `pending` is
		*  deliberately excluded: on the folded plane it is the
		*  no-information home (never-ran, or a word the fold does not
		*  know), and spinning on no information is a fake state. Raw
		*  'pending' words never reach here folded-pending: the fold maps a
		*  raw queued-for-start to 'queued'. Seats that judge RAW words use
		*  the owner's isLiveRunStatus instead. */
		function rowRunning(row) {
			const s = row.status;
			return s === "running" || s === "queued";
		}
		/** exported for the door-contract specs (the tile-face law). */
		function benchRow(stage, bench, cardLabel) {
			const isGroup = stage.card === "group";
			const children = isGroup && Array.isArray(stage.children) ? stage.children.length : 0;
			const label = isGroup ? null : cardLabel?.(String(stage.card)) ?? null;
			const title = isGroup ? chromeCopy.groupTitle({ count: children }) : stage.title ?? label ?? stage.card ?? stage.id;
			const status = statusOrPendingOf(typeof stage.runStatus === "string" ? stage.runStatus : "");
			const health = typeof stage.health === "string" && stage.health !== "" ? stage.health : null;
			typeof stage.activity === "string" && stage.activity;
			const progress = stage.progress ?? null;
			progress !== null && progress.max > 0 && Math.floor(100 * progress.value / progress.max);
			const params = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const promptRaw = typeof params["prompt"] === "string" ? params["prompt"] : "";
			const result = stage.result;
			const url = typeof result === "object" && result !== null && typeof Reflect.get(result, "url") === "string" ? Reflect.get(result, "url") : "";
			const failText = typeof result === "object" && result !== null && typeof Reflect.get(result, "error") === "string" ? Reflect.get(result, "error") : "";
			const artifacts = previewArtifactsFor(stage);
			const harvested = (() => {
				for (const a of artifacts) {
					const kind = previewKindFor(a.name);
					if (kind === null) continue;
					return {
						kind,
						url: a.url
					};
				}
				return null;
			})();
			const face = previewKindFor(url) ?? harvested?.kind ?? null;
			const absolute = (u) => /^(https?:\/\/|\/)/.test(u);
			const posterFromArtifacts = (() => {
				if (face !== "mesh") return null;
				for (const a of artifacts) if ((previewKindFor(a.name) ?? previewKindFor(a.url)) === "image" && absolute(a.url)) return a.url;
				return null;
			})();
			return {
				id: stage.id,
				kind: isGroup ? "group" : String(stage.card ?? "card"),
				kindLabel: isGroup ? null : label,
				title: String(title),
				service: typeof stage.engine === "string" && stage.engine !== "" ? stage.engine : null,
				status,
				dot: health !== null ? "warning" : STATUS_DOT[status],
				/** the transport-health carry — the row's resource word, or null. */
				health,
				prompt: promptRaw !== "" ? promptRaw.slice(0, 96) : null,
				/** the failure carry — the run's own refusal text, or null. */
				error: failText !== "" ? failText : null,
				progress: typeof result === "object" && result !== null && typeof Reflect.get(result, "progress") === "object" && Reflect.get(result, "progress") !== null ? Reflect.get(result, "progress") : null,
				activity: typeof result === "object" && result !== null && typeof Reflect.get(result, "activity") === "string" ? Reflect.get(result, "activity") : "",
				thumbUrl: face === "image" && absolute(url) ? url : posterFromArtifacts,
				face,
				videoUrl: face === "video" && absolute(url) ? url : null,
				upstream: (() => {
					const inputs = typeof stage.inputs === "object" && stage.inputs !== null ? stage.inputs : null;
					const edge = inputs !== null && typeof inputs["source"] === "object" && inputs["source"] !== null ? inputs["source"] : null;
					const from = edge !== null && typeof edge["stage"] === "string" ? edge["stage"] : "";
					if (from === "" || bench === void 0) return null;
					const upstreamRow = bench.stages.find((s) => s.id === from);
					return upstreamRow !== void 0 ? String(upstreamRow.card ?? upstreamRow.id) : null;
				})(),
				sourceAttached: Object.values(params).some((v) => {
					if (typeof v !== "string") return false;
					const lower = v.toLowerCase();
					return v.startsWith("data/input/") || lower.startsWith("/melite-media/") || lower.startsWith("/v1/assets/") || lower.startsWith("/infer-gallery/artifact");
				}),
				stage
			};
		}
		//#endregion
		//#region src/client/FlowCards.tsx
		/**
		* The melite_flow toolview — THE ACTION CARDS, rendered NATIVE in the
		* DSH React tree (2026-09-10 Phase 1: the iframe died).
		*
		* Keyed into the shipped `tool.call.toolview` seat for the wire tool
		* name `melite_flow`. NOT an iframe, NOT a bridge: the cards are React
		* components IN the host document —
		*   (a) THEME — inherited. The cards sit in DSH's tree, so every
		*       --dsw-alias-* token applies directly; the embed-bridge token
		*       copy is gone with the frame (the deck canvas keeps its own
		*       until Phase 2).
		*   (b) HEIGHT — gone as a problem. In-tree flow lays out natively;
		*       no polling, no scrollHeight reads.
		*   (c) DRILLDOWN — the ui-primitives Modal (body portal, Escape/
		*       mask close, aria-modal): the split detail — params left,
		*       outputs right — per the operator's directive 2026-09-10
		*       ("our cards go inside the dsh modal for the split drill
		*       down and drill up"). No zoom-promotion machine; DSH's own
		*       overlay machinery is the only layer.
		*
		* The wire is the editor's wire, same-origin via the card-deck host's
		* /v1 proxy (draft.ts owns every fetch). The user reviews the rows,
		* edits params in the drilldown, and presses Run ON THE CARD — the run
		* door (runs/start over the wire frame) is a user gesture, never the model's.
		*
		* WATERFALL LEDGER (operator law 2026-09-10: ride DSH 1:1 → minimize
		* our code → DOCUMENT what can't be ridden; each entry is for review):
		*   (a-1) RIDEN 1:1 — Button, Input, Pill, StateDot, Modal from the
		*         INSTALLED @deepseek-ai/dsh-client-ui-primitives rc.8 (Pill
		*         replaced hand-rolled capsule badges; Modal replaced the zoom
		*         machine). The css module is LAYOUT ONLY, every color an
		*         inherited --dsw-alias-* token — the ui-model-selection idiom.
		*   (c-4) rc.8 SURFACE GAP: the reference catalog also ships Tag and
		*         Switch; installed rc.8 does NOT. Pill is the shipped capsule
		*         for both (static span, no onClick = read-only badge; with
		*         onClick = the boolean toggle). REVIEW at the next rc bump:
		*         swap to Tag/Switch when installed.
		*   (c-1) NO ATOM: the card ROW (a list row that opens a Modal).
		*         DisclosureRow is inline expansion — a different interaction;
		*         no shipped atom covers row→modal. Hand-rolled, layout-only.
		*   (a-2) THE LIVE RUN, post-kill: the gateway-era events WS died
		*         with the gateway app (nothing serves it, by design); the
		*         run tail rides the run resource's frames (runs/subscribe
		*         over the reconnecting RemoteStream — the entry hands the
		*         carrier down, cards-resource.ts's bindRunFramesRemote).
		*         The run press seeds the tail; the interval poll is gone.
		*   (c-3) NO CLIENT: the draft/run remote layer (draft.ts). No DSH
		*         package wraps the estate's remotes as a browser client; the
		*         thin wire caller (client-request frame, api-gateway.md) is
		*         the sanctioned shape for plugins outside the web kernel.
		*/
		/** Parse the melite_flow / card-tool call: the draft id + the model
		*  header. NATIVE CHANNEL FIRST: a settled result carries the tool's
		*  persisted presentationMeta (ToolResultNode.meta) with {draft_id} —
		*  every card tool emits it; the handle is read from meta, never
		*  parsed out of prose. The render-text token ('card <draftId>') is
		*  the LEGACY fallback: sessions logged before a tool grew its
		*  projector still hydrate through the parse rule. */
		function parseCardsBlock(block) {
			const settled = block.kind === "tool-result";
			const argsRaw = settled ? block.call?.argsRaw ?? "" : block.argsRaw ?? "";
			let model = null;
			let malformedArgs = false;
			if (argsRaw !== "") try {
				const args = JSON.parse(argsRaw);
				if (typeof args["model"] === "string" && args["model"] !== "") model = args["model"];
			} catch {
				malformedArgs = true;
			}
			let draftId = null;
			if (settled && block.isError !== true) {
				const meta = block.meta;
				if (meta !== null && typeof meta === "object" && !Array.isArray(meta)) {
					const id = meta["draft_id"];
					if (typeof id === "string" && id !== "") draftId = id;
				}
				if (draftId === null && Array.isArray(block.content)) for (const part of block.content) {
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
			}
			return {
				draftId,
				model,
				malformedArgs,
				settled,
				isError: block.isError === true
			};
		}
		/** Draft doc + live run status (all doors in draft.ts; the live tail
		*  rides the run resource's frames — cards-resource.ts). */
		function useDraft(draftId) {
			const [doc, setDoc] = (0, react.useState)(null);
			const [live, setLive] = (0, react.useState)(null);
			const [liveRunId, setLiveRunId] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [tick, setTick] = (0, react.useState)(0);
			const refresh = (0, react.useCallback)(() => {
				setTick((t) => t + 1);
			}, []);
			/** Seed the live tail from the run press's own answer — the started
			*  run id is the only honest seed (the draft doc carries none). */
			const startedRun = (0, react.useCallback)((runId) => {
				setLive(null);
				setLiveRunId(runId);
			}, []);
			(0, react.useEffect)(() => {
				if (draftId === null) return;
				setDoc(null);
				setLive(null);
				setLiveRunId(null);
				setError(null);
			}, [draftId]);
			(0, react.useEffect)(() => {
				if (draftId === null) return;
				let alive = true;
				fetchDraft(draftId).then((d) => {
					if (alive) setDoc(d);
				}).catch((e) => {
					if (alive) setError((0, _melite_card_base_client.rejectionVoice)(e));
				});
				return () => {
					alive = false;
				};
			}, [draftId, tick]);
			(0, react.useEffect)(() => {
				if (liveRunId === null) return;
				const controller = new AbortController();
				let alive = true;
				(async () => {
					try {
						for await (const frame of subscribeRunFrames(liveRunId, controller.signal)) {
							if (!alive) return;
							if (!frame.ok) continue;
							setLive({
								run_id: frame.value.runId,
								status: frame.value.status,
								stages: frame.value.stages,
								error: frame.value.error
							});
							if (runFinished(frame.value.status)) {
								setTick((t) => t + 1);
								return;
							}
						}
					} catch {
						if (alive && !controller.signal.aborted) setTick((t) => t + 1);
					}
				})();
				return () => {
					alive = false;
					controller.abort();
				};
			}, [liveRunId]);
			return {
				doc,
				live,
				error,
				refresh,
				startedRun
			};
		}
		/** The chat-listed card row: kind tag, title, service, status dot, prompt.
		*  THE CLICK opens the AUTHORING SURFACE in the Cards tab (the old
		*  embed's law — timeline, video preview, per-gen splits, global
		*  audio) when the shell face is installed; without a shell (unit
		*  tests, headless harnesses) it falls back to the in-card drill.
		*  THE ROW ERROR DISMISS (operator 2026-11-05: the failure
		*  description under the card stuck FOREVER with no way out): the
		*  red × retires the row's error face for THIS text — the row keeps
		*  its truth (status dot stays failed), so a new refusal re-voices.
		*  The × consumes its click (the ToolRow file-link law: the row
		*  button underneath must not open). The voice itself is resolved
		*  by the owner (silenced entries never arrive here). */
		function CardRowLine({ row, error, onOpen, onDismissError }) {
			const dot = STATUS_DOT[row.status];
			const dismiss = onDismissError !== void 0 && error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: (e) => {
					e.stopPropagation();
					onDismissError();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })
			}) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: card_module_css_default.rowWrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: card_module_css_default.row,
					onClick: onOpen,
					"data-stage": row.stageId,
					"data-status": row.status,
					children: [
						row.thumbUrl !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: card_module_css_default.thumb,
							src: row.thumbUrl,
							alt: row.title,
							loading: "lazy"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.kind }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.rowTitle,
							children: row.title
						}),
						row.service !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: row.service }),
						dot !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot }),
						row.prompt !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.prompt,
							children: row.prompt
						}),
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.rowError,
							role: "alert",
							children: error
						})
					]
				}), dismiss]
			});
		}
		/** One melite_flow call as the REAL action cards (native React, in-tree). */
		function FlowCards({ block, openSurface, openMedia }) {
			const parsed = (0, react.useMemo)(() => parseCardsBlock(block), [block]);
			const { doc, live, error, refresh, startedRun } = useDraft(parsed.draftId);
			const [openStage, setOpenStage] = (0, react.useState)(null);
			if (parsed.settled && !parsed.isError && parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				"data-legacy": "1",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: card_module_css_default.head,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: chromeCopy.brand }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.model,
							children: parsed.model ?? chromeCopy.flowFallback
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.state,
							"data-state": "legacy",
							children: chromeCopy.cardsEarlierDraft
						})
					]
				})
			});
			if (parsed.draftId === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: card_module_css_default.load,
					children: parsed.isError ? chromeCopy.draftFailed : chromeCopy.composing
				})
			});
			const rows = doc !== null ? cardRows(doc, live) : [];
			const openRow = rows.find((r) => r.stageId === openStage) ?? null;
			const openParams = doc?.stages.find((s) => s.id === openStage)?.params ?? {};
			const [silencedRowErrors, setSilencedRowErrors] = (0, react.useState)({});
			const voicedErrors = rows.map((r) => r.stageId + ":" + (r.error ?? "")).join("|");
			(0, react.useEffect)(() => {
				setSilencedRowErrors((prev) => {
					const ids = Object.keys(prev);
					if (ids.length === 0) return prev;
					let next = null;
					for (const id of ids) {
						const row = rows.find((r) => r.stageId === id);
						if (row === void 0 || row.error !== prev[id]) {
							if (next === null) next = { ...prev };
							delete next[id];
						}
					}
					return next ?? prev;
				});
			}, [voicedErrors]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-flow-card",
				"data-draft-id": parsed.draftId,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: card_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.badge,
								children: chromeCopy.brand
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.model,
								children: doc?.intent ?? parsed.model ?? chromeCopy.flowFallback
							}),
							parsed.malformedArgs && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: card_module_css_default.state,
								"data-state": "error",
								children: chromeCopy.argsUnparseable
							}),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: card_module_css_default.state,
								"data-state": "error",
								role: "button",
								tabIndex: 0,
								onClick: refresh,
								onKeyDown: refresh,
								children: [error, chromeCopy.retrySuffix]
							}),
							openMedia !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: card_module_css_default.media,
								onClick: () => {
									openMedia();
								},
								children: chromeCopy.openMedia
							})
						]
					}),
					doc === null && error === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: card_module_css_default.load,
						children: chromeCopy.cardsLoading
					}),
					rows.map((row) => {
						const voice = row.error !== void 0 && silencedRowErrors[row.stageId] !== row.error ? row.error : void 0;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardRowLine, {
							row,
							error: voice,
							onDismissError: voice !== void 0 ? () => {
								setSilencedRowErrors((prev) => ({
									...prev,
									[row.stageId]: voice
								}));
							} : void 0,
							onOpen: () => {
								const address = parsed.draftId === null ? null : cardsDraftStageAddress(parsed.draftId, row.stageId);
								if (address === null || openSurface?.(address) !== true) setOpenStage(row.stageId);
							}
						}, row.stageId);
					}),
					openRow !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardDrill, {
						title: chromeCopy.cardTitle({ name: openRow.title }),
						fields: paramFields(openParams),
						thumbUrl: openRow.thumbUrl ?? null,
						running: false,
						stages: doc?.stages ?? [],
						onRun: async (patch) => {
							const draftId = parsed.draftId;
							if (draftId === null) throw new Error("draft id gone");
							if (patch !== null) await patchStageParams(draftId, openRow.stageId, patch);
							const gate = await refuseForUnlandedWrite(draftId, openRow.stageId);
							if (gate !== null) throw new Error(gate);
							startedRun(await startDraft(draftId));
							setOpenStage(null);
							refresh();
						},
						onClose: () => {
							setOpenStage(null);
							refresh();
						}
					})
				]
			});
		}
		//#endregion
		//#region src/client/construct-card.tsx
		/**
		* The melite_construct toolview — THE FLOW LINK, rendered NATIVE in
		* the DSH React tree beside FlowCards.
		*
		* A construct call edits THE SHARED BENCH (no draft id exists to
		* card), so its chat face is not rows but the verdict title plus the
		* clickable link to the edited flow: the bench address opened
		* through the shell's navigation face (the register site's inject
		* share — ctx.sidebarRight.openResource, the same channel
		* FlowCards' rows ride to open the Cards tab). Operator 2026-11-05:
		* "when it edits a flow, the clickable link opens the right
		* sidebar flow view."
		*
		* The link derives from the NATIVE channel only: the tool's
		* persisted presentationMeta ({bench} — the projector melite-
		* construct.ts owns). Prose and args never carry the key, so a
		* block without meta renders the title alone — never a dead link.
		* Without the shell face the card degrades to the title (the
		* openMedia precedent: a door the shell did not provide does not
		* render); a shell refusal (false) stays put, never throws.
		*
		* The keyed hit REPLACES the generic row (the ToolCallTree
		* dispatch: keyed entry wins, GenericToolCard is the fallback), so
		* this card also owns the title face — the host presentCall's
		* `Bench <verb>[ · <stage|card>]` wording, mirrored from argsRaw —
		* and the refusal's first line (the render text the generic row's
		* OUT section would have shown).
		*/
		/** The verdict title — the host presentCall's wording, mirrored
		*  from the frozen args (the keyed toolview replaces the generic
		*  row, so the title face lives here now). The literals live in the
		*  dictionary (chromeCopy.constructTitle — the copy census); this
		*  seat carries none. */
		function constructTitleOf(argsRaw) {
			if (argsRaw === "") return {
				title: chromeCopy.constructTitle({
					verb: "?",
					on: ""
				}),
				malformedArgs: false
			};
			try {
				const args = JSON.parse(argsRaw);
				const verb = typeof args["verb"] === "string" ? args["verb"] : "?";
				const on = typeof args["stage"] === "string" && args["stage"] !== "" ? args["stage"] : typeof args["card"] === "string" && args["card"] !== "" ? args["card"] : "";
				return {
					title: chromeCopy.constructTitle({
						verb,
						on
					}),
					malformedArgs: false
				};
			} catch {
				return {
					title: chromeCopy.constructTitle({
						verb: "?",
						on: ""
					}),
					malformedArgs: true
				};
			}
		}
		/** Parse a melite_construct call: the verdict title + the linked
		*  bench key. NATIVE CHANNEL FIRST: a settled result carries the
		*  tool's persisted presentationMeta (ToolResultNode.meta) with
		*  {bench} — every construct verb emits it, refusals included. No
		*  legacy fallback exists (pre-projector prose never carried the
		*  key): those blocks render title-only, never a dead link. */
		function parseConstructBlock(block) {
			const settled = block.kind === "tool-result";
			const { title, malformedArgs } = constructTitleOf(settled ? block.call?.argsRaw ?? "" : block.argsRaw ?? "");
			const isError = settled && block.isError === true;
			let bench = null;
			if (settled) {
				const meta = block.meta;
				if (meta !== null && typeof meta === "object" && !Array.isArray(meta)) {
					const key = meta["bench"];
					if (typeof key === "string" && key !== "") bench = key;
				}
			}
			let errorLine = null;
			if (isError && Array.isArray(block.content)) for (const part of block.content) {
				if (part === null || typeof part !== "object") continue;
				const text = part.text;
				if (typeof text !== "string" || text === "") continue;
				const nl = text.indexOf("\n");
				errorLine = nl < 0 ? text : text.slice(0, nl);
				break;
			}
			return {
				title,
				malformedArgs,
				bench,
				settled,
				isError,
				errorLine
			};
		}
		/** One melite_construct call: the verdict title, the refusal voice,
		*  and the clickable link that opens the edited flow in the Cards
		*  tab (the right sidebar flow view). */
		function ConstructCard({ block, openSurface }) {
			const parsed = (0, react.useMemo)(() => parseConstructBlock(block), [block]);
			const address = parsed.bench === null ? null : benchAddressOf(parsed.bench);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: card_module_css_default.card,
				"data-dsh-part": "melite-construct-card",
				"data-bench": parsed.bench ?? void 0,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: card_module_css_default.head,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, { children: chromeCopy.brand }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.model,
							children: parsed.title
						}),
						parsed.malformedArgs && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.state,
							"data-state": "error",
							children: chromeCopy.argsUnparseable
						}),
						parsed.isError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: card_module_css_default.state,
							"data-state": "error",
							role: "alert",
							children: parsed.errorLine ?? chromeCopy.draftFailed
						}),
						address !== null && openSurface !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							className: card_module_css_default.flowLink,
							"aria-label": chromeCopy.openFlow,
							onClick: () => {
								openSurface(address);
							},
							children: chromeCopy.openFlow
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/card-tools.ts
		/**
		* card-tools — CARD_TOOLS, the wire-name list every card seat keys on.
		* Its own module because two seats need it at eval time: the client
		* entry (the toolview registrations) and card-mentions (the
		* conversation fold — which tool results carry a draft). Importing
		* card-mentions from the entry would otherwise be a cycle.
		*/
		/** Every card tool that produces a draft — the card tile renders for ALL of them. */
		const CARD_TOOLS = [
			"melite_flow",
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
			"creature_flow",
			"humanoid_flow",
			"non_humanoid_flow",
			"prop_flow",
			"sprite_sheet",
			"h3_timeline"
		];
		/** Every flow-edit tool — the chat face is the flow LINK, not a draft
		*  card (operator 2026-11-05: "when it edits a flow, the clickable
		*  link opens the right sidebar flow view"). melite_construct edits
		*  THE SHARED BENCH (no draft id exists to card), so its toolview is
		*  the ConstructCard: the Bench-verb title plus the link that opens
		*  the bench address in the Cards tab. Kept OUT of CARD_TOOLS on
		*  purpose: that list means "produces a draft" (the mentions fold
		*  keys on it), and construct produces none. */
		const FLOW_TOOLS = ["melite_construct"];
		//#endregion
		//#region src/client/card-mentions.ts
		const CARD_TOOL_SET = new Set(CARD_TOOLS);
		function isRecord(value) {
			return typeof value === "object" && value !== null;
		}
		/** Read one string field off a tool/result meta object. */
		function metaString(meta, key) {
			if (!isRecord(meta)) return null;
			const value = meta[key];
			return typeof value === "string" && value.length > 0 ? value : null;
		}
		/** The state-only node: folds card-tool calls and their persisted
		*  result meta into the turn's 'meliteCards' data. The shapes follow
		*  the engine's own deliverables fold (the tree's template for
		*  event→turn-data state machines). */
		const meliteCardsTurnDefinition = {
			kind: "meliteCards",
			match(event) {
				if (event.type === "turn/start") return {
					id: String(event.data.turn),
					role: "start"
				};
				if (event.type === "tool/call") return CARD_TOOL_SET.has(String(event.data.name)) ? {
					id: String(event.data.turn),
					role: "update"
				} : null;
				if (event.type === "tool/result") return {
					id: String(event.data.turn),
					role: "update"
				};
				return null;
			},
			start(_context, match) {
				if (match.event.type !== "turn/start") throw new Error("meliteCards start requires turn/start");
				return {
					turn: match.event.data.turn,
					cardCalls: /* @__PURE__ */ new Map(),
					rows: []
				};
			},
			update(context, match) {
				if (match.event.type === "tool/call") {
					const cardCalls = new Map(context.state.cardCalls);
					cardCalls.set(String(match.event.data.callId), String(match.event.data.name));
					return {
						...context.state,
						cardCalls
					};
				}
				if (match.event.type !== "tool/result") return context.state;
				const callId = String(match.event.data.message.source.callId);
				const tool = context.state.cardCalls.get(callId);
				if (tool === void 0) return context.state;
				const draftId = metaString(match.event.data.meta, "draft_id");
				const runId = metaString(match.event.data.meta, "run_id");
				if (draftId === null && runId === null) return context.state;
				return {
					...context.state,
					rows: [...context.state.rows, {
						tool,
						draftId,
						runId
					}]
				};
			},
			buildLocationData(context, scope, previous) {
				if (scope !== "turn" || context.state === void 0) return null;
				if (previous?.kind === "turn" && previous.turn === context.state.turn && previous.key === "meliteCards" && previous.value.rows === context.state.rows) return previous;
				return {
					kind: "turn",
					turn: context.state.turn,
					key: "meliteCards",
					value: { rows: context.state.rows }
				};
			}
		};
		/** Build the chatFileMentions service: resolves an id token authored in
		*  one closing turn against the ids THAT turn's card tools produced.
		*  Both id kinds open the same door — the Media page — because that
		*  page is where the draft bench and the run archive both live.
		*  @param openMediaTab - the guarded shell open (never throws). */
		function buildChatFileMentions(openMediaTab) {
			return { forClosing(owner) {
				const data = owner.turn.data.get("meliteCards");
				if (data === void 0 || data.rows.length === 0) return void 0;
				const known = /* @__PURE__ */ new Map();
				for (const row of data.rows) {
					if (row.draftId !== null) known.set(row.draftId, "draft");
					if (row.runId !== null) known.set(row.runId, "run");
				}
				if (known.size === 0) return void 0;
				return { resolve(value) {
					const kind = known.get(value);
					if (kind === void 0) return void 0;
					return {
						open: () => {
							openMediaTab();
						},
						label: value,
						title: chromeCopy.mentionTitle({
							kind,
							value
						})
					};
				} };
			} };
		}
		//#endregion
		//#region src/client/stage-run.ts
		/** stage-run.ts — the card stage's run doors: ONE stage through the
		* composing {model:} door (card stages) or the FLOW door (the
		* generic MCP card — a standalone-subagent spawn), and the bench's
		* sequential pass (extracted from CardsTab.tsx hour 15). */
		/** The generic MCP card's id (the ONE engine-served card the run
		* press routes on — the subagent-spawn card, engine 'agent'). */
		const MCP_CARD = "mcp";
		/** Run ONE card stage through its composing door (the run-wire
		*  package's startCardRun — the {model:} arm) — EXCEPT the engine
		*  stage (the generic MCP card), which runs through the FLOW door
		*  (startMcpStage below). The flow_inline door
		*  this gesture rode before cannot consume cards ("card= stages are
		*  unported on this gateway") and its executor demanded a pre-composed
		*  params.workflow nobody emitted — the Sep 11 bench runs' "node
		*  carries no inline workflow". The {model:} door composes the card's
		*  arms estate-side; `model` is the card's DEFAULT FAMILY from the
		*  catalog, and — the Run-press law, 2026-10-08 — a family-less
		*  card rides its OWN id (defaultFamilyForCard's documented
		*  fallback): the door's card-unit arm composes the card verbatim
		*  (prepareCardParams' card-unit arm; no family overlay).
		*  THE PARAM IS THE WIRE (the two-month law): whatever the stage's
		*  slot holds — an upload's estate path or a picked upstream output's
		*  media-route url — rides the start doc VERBATIM; the engine stages
		*  it under its runs-root arm. No client-side edge resolution exists.
		*  Exported for the tab seam's door-contract spec. */
		async function runCardStage(draftId, row) {
			if (typeof row.card !== "string" || row.card === "") return { refused: "this stage names no card — nothing to compose" };
			const gate = await refuseForUnlandedWrite(draftId, row.id);
			if (gate !== null) return { refused: gate };
			const read = await readStageRow(draftId, row.id);
			if (read.status === "unreadable") return { refused: `the bench row for stage "${row.id}" is unreadable — running would compose the open-time row, not the bench's stated state` };
			const src = read.status === "ready" ? read.row : row;
			const params = typeof src.params === "object" && src.params !== null && !Array.isArray(src.params) ? src.params : {};
			const card = typeof src.card === "string" && src.card !== "" ? src.card : "";
			if (card === "") return { refused: "this stage names no card — nothing to compose" };
			const heldModel = params["model"];
			const model = typeof heldModel === "string" && heldModel !== "" ? heldModel : await defaultFamilyForCard(card);
			if (card === MCP_CARD) {
				if ((typeof params["task"] === "string" ? params["task"].trim() : "") === "") return { refused: "write the Task first — the subagent spawns with no brief otherwise" };
				const brain = typeof params["brain"] === "string" ? params["brain"].trim() : "";
				const engineParams = { ...params };
				if (brain !== "") engineParams["model"] = brain;
				delete engineParams["brain"];
				return await (0, _melite_card_base_client.startFlowInlineRun)({
					flowId: "mcp",
					stages: [{
						id: src.id,
						engine: "agent",
						params: engineParams,
						outputs: { default: "text" }
					}],
					draftId
				});
			}
			const wires = typeof src.inputs === "object" && src.inputs !== null && !Array.isArray(src.inputs) ? src.inputs : {};
			let resolved = params;
			const wireNames = Object.keys(wires);
			if (wireNames.length > 0) {
				resolved = { ...params };
				for (const name of wireNames) {
					const ref = wires[name];
					if (!(typeof ref === "object" && ref !== null && typeof ref["stage"] === "string" && typeof ref["output"] === "string")) return { refused: "input " + JSON.stringify(name) + " is neither {stage, output} nor a resolvable binding — the single-stage run maps only stage wires (got " + JSON.stringify(ref ?? null) + ")" };
					const upstreamId = String(ref["stage"]);
					const upstream = await freshStageRow(draftId, upstreamId);
					const res = typeof upstream?.result === "object" && upstream.result !== null ? upstream.result : {};
					const url = typeof res["url"] === "string" && res["url"] !== "" ? res["url"] : "";
					if (url === "") return { refused: "input " + JSON.stringify(name) + " is wired to stage " + JSON.stringify(upstreamId) + " which has no output yet — run it first (or clear the wire). The single-stage run resolves wires to the upstream's last result; it never drops them." };
					const spell = "$" + name;
					const substitute = (v) => {
						if (v === spell) return url;
						if (Array.isArray(v)) return v.map(substitute);
						if (typeof v === "object" && v !== null) {
							const out = {};
							for (const [k, x] of Object.entries(v)) out[k] = substitute(x);
							return out;
						}
						return v;
					};
					for (const k of Object.keys(resolved)) resolved[k] = substitute(resolved[k]);
				}
			}
			let spec;
			try {
				spec = await (0, _melite_card_base_client.fetchFormSpec)(card);
			} catch (e) {
				return { refused: "the form-spec door for " + JSON.stringify(card) + " is unreachable (" + (0, _melite_card_base_client.rejectionVoice)(e) + ") — the run refuses rather than compose unverified params" };
			}
			let doc = resolved;
			const selects = (0, _melite_card_base_client.fieldsOf)(spec).filter((f) => f.type === "select" && Array.isArray(f.options));
			if (selects.length > 0) {
				doc = { ...resolved };
				for (const f of selects) {
					const v = doc[f.name];
					if (typeof v === "number") {
						if (f.options.map((o) => typeof o === "string" ? o : o.value).includes(String(v))) doc[f.name] = String(v);
					}
				}
			}
			return await (0, _melite_card_base_client.startCardRun)({
				model,
				params: doc,
				draftId
			});
		}
		/** THE SEQUENTIAL PASS — Run ALL, the old system's composer law
		*  verbatim (flowExecuteSlice runAll, 2026-08-11): execute the
		*  stages IN ORDER, one run per card (the SAME single-stage door the
		*  drill's Run uses — a typed composer bench is never one graph
		*  run; the flow_inline door serves the chain/graph surface, not
		*  this one). Skip stages already done (the cache-hit skip). A
		*  failed or refused stage STOPS the pass — fail loud, never a
		*  doomed downstream run. The per-card observer patches each row as
		*  it goes (running → terminal), so the tiles flip one by one and
		*  the bench is never taken over. Exported for the door-contract
		*  spec. */
		async function runBenchSequential(bench, hooks = {}) {
			const ran = [];
			for (const stage of bench.stages) {
				if (hooks.signal?.aborted === true) return {
					ran,
					stoppedAt: null,
					refused: null
				};
				{
					const folded = statusOrPendingOf(typeof stage.runStatus === "string" ? stage.runStatus : "");
					if (folded === "done" || folded === "cached" || folded === "reused") continue;
				}
				const res = await runCardStage(bench.draftId, stage);
				if ("refused" in res) return {
					ran,
					stoppedAt: stage.id,
					refused: res.refused,
					refusedCode: res.refusedCode,
					...res.refusedDetails !== void 0 ? { refusedDetails: res.refusedDetails } : {}
				};
				hooks.onCardStarted?.(res.runId, {
					draftId: bench.draftId,
					stageId: stage.id
				});
				const terminal = await observeRunOutcome(bench.draftId, stage.id, res.runId, hooks.signal, hooks.onTouched);
				if (terminal !== null) hooks.onCardSettled?.(res.runId, {
					draftId: bench.draftId,
					stageId: stage.id
				});
				if (terminal !== "done") return {
					ran: [...ran, stage.id],
					stoppedAt: stage.id,
					refused: null
				};
				ran.push(stage.id);
			}
			return {
				ran,
				stoppedAt: null,
				refused: null
			};
		}
		//#endregion
		//#region src/client/add-stage.ts
		/**
		* add-stage.ts — the bench's mutation verb callers (the tab's
		* add/remove/reorder/group/ungroup paths). Every verb is ONE typed
		* call on the mounted bench namespace (stroke 81's one-lane law —
		* the generated client, never a hand-written envelope); the remote
		* signature is (sessionKey, doc) — sessionKey is a TYPED first
		* parameter, so a misaddressed bench is a type error, not a runtime
		* refusal. The doc carries the verb's own keys and every doc rides
		* expect_rev (the CAS law: the caller chains the bench rev it
		* rendered, so a concurrent edit refuses instead of slicing wrong).
		*
		* THE REBASE LAW (2026-09-15, the operator's stuck: "bench main
		* moved: rev is 429, caller held 35 — IT STUCK"): the bench is ONE
		* shared doc the agent writes too, so a tab-rendered rev can be
		* stale through no user fault. A door that refuses ONLY on CAS
		* answers itself: re-read the rev (from the SAME session the verb
		* addresses — the 2026-09-16 fix; the old arm hard-coded 'main' and
		* rebased non-main verbs against the wrong bench's rev), re-apply —
		* BOUNDED at 3 tries with a fresh rev between each (the once-law
		* died under a live second author, 2026-10-09). A conflict after
		* the budget, or any non-CAS refusal, throws loud (the named
		* truth, never a silent drop, never a blind write) — and the
		* view reloads on that final failure so the NEXT gesture composes
		* against fresh truth. The stuck is structurally impossible: a
		* moved bench costs one silent rebase, never a bricked tab.
		*/
		/** The bench's CURRENT rev for one session — the CAS handle for a
		*  re-apply. Returns undefined when the read fails (the re-apply is
		*  then skipped; the original refusal stands as the honest answer). */
		async function benchRev(sessionKey, signal) {
			try {
				const rev = (await (0, _melite_card_base_client.unwrapRemote)((0, _melite_card_base_client.estateRemote)().bench.get(sessionKey, signal), "bench/get")).rev;
				return typeof rev === "number" ? rev : void 0;
			} catch {
				return;
			}
		}
		/** One typed bench verb with the rebase dance: try the held rev; on
		*  the door's cas-conflict re-read the rev (the SAME session) and
		*  re-apply — bounded (3 tries, a fresh rev between each; the
		*  once-law died under a live second author, 2026-10-09). */
		const BENCH_ATTEMPTS = 3;
		async function withRebase(verb, doc, sessionKey, signal) {
			const ns = (0, _melite_card_base_client.estateRemote)().bench;
			const attempt = (expectRev) => (0, _melite_card_base_client.unwrapRemote)(ns[verb](sessionKey, {
				...doc,
				author: "user",
				expect_rev: expectRev
			}, signal), "bench/" + verb).then((row) => row);
			const held = doc["expect_rev"];
			if (typeof held !== "number") throw new Error("bench/" + verb + ": no expect_rev to write against");
			let rev = held;
			let last;
			for (let i = 0; i < BENCH_ATTEMPTS; i++) try {
				return await attempt(rev);
			} catch (e) {
				if (!(0, _melite_card_base_client.isCasConflict)(e)) throw e;
				last = e;
				const fresh = await benchRev(sessionKey, signal);
				if (fresh === void 0) throw e;
				rev = fresh;
			}
			throw last;
		}
		/** The bench add-stage verb caller (the tab's add-card path). The
		*  doc holds card/author/engine/params/expect_rev. */
		async function addStageWire(doc, sessionKey, signal) {
			return await withRebase("add-stage", doc, sessionKey, signal);
		}
		/** The bench remove-stage verb caller (the drill's Remove path). The
		*  doc holds stage/expect_rev; the session key addresses the doc the
		*  bar RENDERS (stroke 80 — 'main' hardcoding deleted against the
		*  wrong bench and refused 'stage not found'). */
		async function removeStageWire(doc, sessionKey, signal) {
			return await withRebase("remove-stage", doc, sessionKey, signal);
		}
		/** THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO CLEAR ALL"
		*  — and a bench with a stranded wire had no way out but the wire).
		*  The doc holds expect_rev only; the session key addresses the doc
		*  the bar RENDERS (same law as remove). */
		async function clearBenchWire(doc, sessionKey, signal) {
			return await withRebase("clear", doc, sessionKey, signal);
		}
		/** The bench reorder verb caller (the drag-reorder path). Doc:
		*  stage/to/after/expect_rev — `to` is the post-splice target index,
		*  `after` the anchor id the press targeted (server-side slot
		*  re-derivation, the F1-residue cure). */
		async function reorderStageWire(doc, sessionKey, signal) {
			return await withRebase("reorder", doc, sessionKey, signal);
		}
		/** The bench group verb caller (the Group Cards sub-view):
		*  stages = 2+ ids (bench order applied server-side). */
		async function groupStagesWire(doc, sessionKey, signal) {
			return await withRebase("group", doc, sessionKey, signal);
		}
		/** The bench ungroup verb caller: spill a compound's children. */
		async function ungroupStageWire(doc, sessionKey, signal) {
			return await withRebase("ungroup", doc, sessionKey, signal);
		}
		/** THE UNDO WIRE (the walkable revision log): revert the log
		*  tail's newest ACTION (or `n` of them — the doc's own key,
		*  server-defaulted to 1). One press, no author filter — the
		*  tab's reader undoes the last change to the ONE shared bench,
		*  whoever authored it; the server's own log walk skips
		*  already-reverted entries and never targets undo entries
		*  themselves (no ping-pong). Same CAS rebase dance: a bench the
		*  agent moved mid-press costs one silent re-read, never a
		*  bricked tab. The session key addresses the doc the bar
		*  RENDERS (stroke 80's law). */
		async function undoBenchWire(doc, sessionKey, signal) {
			return await withRebase("undo", doc, sessionKey, signal);
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
		/** The named escape for non-table URLs. Every use is deliberate and
		* greppable. */
		function externalUrl$1(u) {
			return u;
		}
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
		function unknownVariantVoice(stated, model, known) {
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
		var RELATION_WORDS, quote, UNSTATED_REQUIRED_STEM, statedOf, visibleRows, visibleCells, knownIds, knownQuants;
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
			statedOf = (stated) => typeof stated === "string" ? stated : null;
			visibleRows = (variants) => variants.filter((v) => v.hide_from_dropdown !== true);
			visibleCells = (cells) => cells.filter((c) => c.hide_from_dropdown !== true);
			knownIds = (variants) => variants.map((v) => v.id);
			knownQuants = (cells) => cells.map((c) => typeof c.quant === "string" ? c.quant : "");
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
		//#region ../../web-kit/contracts/lib/index.js
		var lib_exports$1 = /* @__PURE__ */ __exportAll({
			BENCH_DRAFT_PREFIX_RE: () => BENCH_DRAFT_PREFIX_RE,
			BENCH_DRAFT_RE: () => BENCH_DRAFT_RE,
			BIRTH_STRIP_KEYS: () => BIRTH_STRIP_KEYS$1,
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
			RUN_STATUS_WORDS: () => RUN_STATUS_WORDS$1,
			SEGMENT_STATUSES: () => SEGMENT_STATUSES,
			SELF_NAMED_FAMILIES: () => SELF_NAMED_FAMILIES,
			SESSION_RE: () => SESSION_RE$1,
			STAGE_PATCH_KEYS: () => STAGE_PATCH_KEYS,
			TERMINAL_RUN_STATUSES: () => TERMINAL_RUN_STATUSES$1,
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
			benchSessionOf: () => benchSessionOf$1,
			canonicalRunMediaUrl: () => canonicalRunMediaUrl,
			cardResultFromRecord: () => cardResultFromRecord,
			cnEntriesOf: () => cnEntriesOf,
			crossRootOrder: () => crossRootOrder,
			extraOf: () => extraOf,
			hasModifierCapability: () => hasModifierCapability,
			healRunMediaPaths: () => healRunMediaPaths,
			isDataUrl: () => isDataUrl,
			isLiveRunStatus: () => isLiveRunStatus$1,
			isProvenance: () => isProvenance,
			isPurelyUnstatedRequiredVoice: () => isPurelyUnstatedRequiredVoice,
			isTerminalStatus: () => isTerminalStatus$1,
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
			projectStageView: () => projectStageView,
			projectUpstreamStages: () => projectUpstreamStages,
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
		var TagColor$1, TAG_COLOR_VALUES$1, TAG_COLOR_META, STORAGE_KEY$1, SYNC_DEBOUNCE_MS$1, serverSyncEnabled$1, syncTimer$1, _retrySyncOnNextMutation$1, initial$1, tagMapActions$1, useTagMap$1;
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
		async function fetchEnhanceRoutes$1(signal) {
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
		function getCardLlm$1() {
			try {
				const v = window.localStorage.getItem(CARD_LLM_KEY$1);
				return typeof v === "string" && v.length > 0 ? v : null;
			} catch {
				return null;
			}
		}
		/** Set (or clear, with null) the preferred card LLM route. */
		function setCardLlm$1(route) {
			try {
				if (route === null || route.length === 0) window.localStorage.removeItem(CARD_LLM_KEY$1);
				else window.localStorage.setItem(CARD_LLM_KEY$1, route);
			} catch {}
		}
		/**
		* The `llm` argument shape the enhance wire takes: undefined when
		* unset (Auto — the server resolves its preference chain).
		*/
		function cardLlmArg$1() {
			return getCardLlm$1() ?? void 0;
		}
		var CARD_LLM_KEY$1;
		var init_cardLlm = __esmMin((() => {
			CARD_LLM_KEY$1 = "melite:card-llm:v1";
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
			CARD_LLM_KEY: () => CARD_LLM_KEY$1,
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
			cardLlmArg: () => cardLlmArg$1,
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
			fetchEnhanceRoutes: () => fetchEnhanceRoutes$1,
			formForSidebarKey: () => formForSidebarKey,
			formOf: () => formOf,
			formSidebarItems: () => formSidebarItems,
			formatLastRun: () => formatLastRun,
			getBackendState: () => getBackendState,
			getCachedCatalog: () => getCachedCatalog,
			getCachedForms: () => getCachedForms,
			getCardLlm: () => getCardLlm$1,
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
			setCardLlm: () => setCardLlm$1,
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
		const STORAGE_KEY = "melite:tag-map:v1";
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
		/**
		* The card's model picker source (2026-09-06): the LIVE route list
		* off the proof route — never a restated copy. Null when this
		* editor is NOT under a DSH host (no picker renders).
		*/
		async function fetchEnhanceRoutes(signal) {
			let res;
			try {
				res = await apiFetch$1(externalUrl$1("/melite-tools/catalog"), {
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
		//#endregion
		//#region ../../web-kit/catalog/src/cardLlm.ts
		/**
		* cardLlm.ts — the card LLM preference (the ✦ rail's model dropdown
		* store, operator order: "the cards need a model dropdown to select
		* the models we want").
		*
		* ONE preference per browser (localStorage, the tag-map cache's own
		* persistence pattern): every ✦ enhance press from any card reads
		* it at CALL time — the zoom bar's dropdown writes it, the studios'
		* enhance calls thread it as the `llm` argument. UNSET = the host
		* default + the estate's card preference (muse-spark over glm-5v,
		* resolved server-side by the door — the dropdown's "Auto" option).
		*
		* A stale stored route never breaks an enhance: the door resolves
		* explicit names against the LIVE list and 400s — on that refusal
		* the caller may clear the preference (clearCardLlm) and retry on
		* Auto (the honest recovery path, never a silent substitution).
		*/
		/** The localStorage key (namespaced like the tag-map cache). */
		const CARD_LLM_KEY = "melite:card-llm:v1";
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
		//#region src/client/zoom.tsx
		/**
		* zoom.tsx — the zoom overlay, CSS-law port (2026-09-12).
		*
		* THE CONTRACT (the old tree's interaction, framer removed — DSH law:
		* DSH ships no framer; its own surfaces animate in CSS):
		* • the resting tile opens a FIXED inset-0 overlay (portal to body —
		*   the old file's own DSH placement rule; the embed frame is
		*   auto-height, absolute would cover only part of the view).
		* • The card enters compositor-only: a CSS scale+fade keyframe
		*   (zoomIn — transform/opacity, zero reflow, NO modal pop).
		* • While the settle holds the box shows a pure SKELETON; the real
		*   detail swaps in after ZOOM_SKELETON_MS.
		* • Close vectors: the Collapse (X) button and a backdrop click
		*   (target === currentTarget) call onClose directly; Escape belongs
		*   to DSH's useModalLayer, which also owns the focus lifetime and
		*   the layer stack (the dialog contract on the root is what it keys
		*   on).
		* • The overlay is the scroll container; the inner flex centers a
		*   card shorter than the area and scrolls one that is taller.
		*/
		/** How long the skeleton holds the box before the real detail swaps in. */
		const ZOOM_SKELETON_MS = 500;
		/** The zoomed card's bounded size — width caps at 760px, vh-bounded so
		* the ≈square card fits without page scroll (the old tree's number). */
		const ZOOM_DETAIL_MAX_PX = 760;
		/** The envelope's huge class (surface.size='huge'): the studio wants
		*  room — the card grows (the DECLARATION is estate truth). */
		const ZOOM_HUGE_MAX_PX = 1160;
		/** The card's width law, pure (the envelope lift's decision): the
		*  estate's surface.size='huge' grows the card for studio room. The
		*  viewport cap measures WIDTH (94vw, room for the pane's own edge) —
		*  a vh cap on width was a category error that clipped the right
		*  half of the params column on short viewports (2026-09-12).
		*  (No `: string` seat: the inferred return is exactly string, and an
		*  explicit seat would hand this CSS geometry value to the copy
		*  census's string-return arm — geometry is not product copy.) */
		function zoomWidthFor(surfaceSize) {
			return `min(${surfaceSize === "huge" ? ZOOM_HUGE_MAX_PX : ZOOM_DETAIL_MAX_PX}px, 94vw)`;
		}
		/** THE FULL-PAGE LAW (2026-09-13, the operator's hour-7: "the modal
		*  is not taking up the full page like before"). A studio surface
		*  ('huge') IS the old system's full-page card: width AND height take
		*  the page (94vw/94vh — the pane keeps its edge, the shell breathes).
		*  Ordinary cards keep the bounded ≈square law verbatim. */
		function zoomSizeFor(surfaceSize) {
			if (surfaceSize !== "huge") return {
				width: zoomWidthFor(surfaceSize),
				maxWidth: "100%"
			};
			return {
				width: "min(94vw, 1720px)",
				maxWidth: "100%",
				height: "94vh",
				maxHeight: "94vh"
			};
		}
		/** The settle skeleton — an all-skeleton layout with no real content
		*  (the shimmer sweep is the old tree's loading face). */
		function ZoomSkeleton() {
			return (0, react.createElement)("div", { className: card_module_css_default.zoomSkeleton }, (0, react.createElement)("div", { className: card_module_css_default.skLine + " " + card_module_css_default.skWide }), (0, react.createElement)("div", { className: card_module_css_default.skLine }), (0, react.createElement)("div", { className: card_module_css_default.skLine }), (0, react.createElement)("div", { className: card_module_css_default.skBlock }), (0, react.createElement)("div", { className: card_module_css_default.skLine }), (0, react.createElement)("div", { className: card_module_css_default.skRow }, (0, react.createElement)("div", { className: card_module_css_default.skLine + " " + card_module_css_default.skShort }), (0, react.createElement)("div", { className: card_module_css_default.skLine + " " + card_module_css_default.skShort })));
		}
		/** One overlay mount (keyed per stage by the caller). */
		function ZoomMount(props) {
			const { stage, detail, onClose, ...rest } = props;
			const [ready, setReady] = (0, react.useState)(false);
			const boundRef = (0, react.useRef)(null);
			const [enhanceVerb, setEnhanceVerb] = (0, react.useState)(null);
			const [enhancingBar, setEnhancingBar] = (0, react.useState)(false);
			const bindEnhanceStable = (0, react.useCallback)((v) => {
				setEnhanceVerb(() => v);
			}, []);
			const fireEnhance = () => {
				if (enhanceVerb === null || enhancingBar) return;
				setEnhancingBar(true);
				Promise.resolve(enhanceVerb()).catch(() => {}).finally(() => {
					setEnhancingBar(false);
				});
			};
			const [llmRoutes, setLlmRoutes] = (0, react.useState)(null);
			const [cardLlm, setCardLlmSel] = (0, react.useState)("");
			const [llmOpen, setLlmOpen] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let alive = true;
				setCardLlmSel(getCardLlm() ?? "");
				fetchEnhanceRoutes().then((routes) => {
					if (alive) setLlmRoutes(routes);
				});
				return () => {
					alive = false;
				};
			}, []);
			const pickLlm = (route) => {
				setCardLlm(route);
				setCardLlmSel(route);
			};
			const dialogRef = (0, react.useRef)(null);
			const [surfaceSize, setSurfaceSize] = (0, react.useState)(null);
			const onSurface = (size) => {
				setSurfaceSize(size === "" ? null : size);
			};
			(0, react.useEffect)(() => {
				const t = window.setTimeout(() => {
					setReady(true);
				}, ZOOM_SKELETON_MS);
				return () => {
					window.clearTimeout(t);
				};
			}, [stage.id]);
			(0, _deepseek_ai_dsh_client_ui_primitives.useModalLayer)(dialogRef, true, onClose);
			const live = props.running || isLiveRunStatus(typeof stage.runStatus === "string" ? stage.runStatus : "");
			const rec = typeof stage.result === "object" && stage.result !== null ? stage.result : null;
			const prog = rec !== null && typeof rec["progress"] === "object" && rec["progress"] !== null ? rec["progress"] : null;
			const act = rec !== null && typeof rec["activity"] === "string" ? rec["activity"] : "";
			const pct = prog !== null && prog.max > 0 ? Math.floor(100 * prog.value / prog.max) : null;
			const failedText = statusOrPendingOf(typeof stage.runStatus === "string" ? stage.runStatus : "") === "error" && typeof rec?.["error"] === "string" ? rec["error"] : null;
			const startError = typeof props.startError === "string" && props.startError !== "" ? props.startError : null;
			const [dismissedBarError, setDismissedBarError] = (0, react.useState)(null);
			const barError = startError ?? failedText;
			(0, react.useEffect)(() => {
				if (barError === null) setDismissedBarError(null);
			}, [barError]);
			const shownBarError = barError !== null && barError !== dismissedBarError ? barError : null;
			return (0, react.createElement)("div", {
				ref: dialogRef,
				className: card_module_css_default.zoomOverlay,
				role: "dialog",
				"aria-modal": true,
				"aria-label": chromeCopy.stageAria({ name: String(stage.title ?? props.cardLabel ?? stage.card ?? stage.id) }),
				onClick: (e) => {
					if (e.target === e.currentTarget) onClose();
				}
			}, (0, react.createElement)("div", { className: card_module_css_default.zoomScroll }, (0, react.createElement)("div", { className: card_module_css_default.zoomInner }, (0, react.createElement)("div", {
				className: card_module_css_default.zoomCard,
				style: zoomSizeFor(surfaceSize)
			}, (0, react.createElement)("div", { className: card_module_css_default.zoomBar }, (0, react.createElement)("span", { className: card_module_css_default.zoomTitle }, chromeCopy.stageAria({ name: String(stage.title ?? props.cardLabel ?? stage.card ?? stage.id) })), enhanceVerb !== null ? [llmRoutes !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				key: "llm",
				open: llmOpen,
				anchor: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					"aria-label": chromeCopy.enhanceModelAria,
					"data-testid": "drill-llm",
					onClick: () => {
						setLlmOpen(true);
					}
				}, cardLlm === "" ? chromeCopy.autoOption : cardLlm),
				items: [{
					id: "",
					label: chromeCopy.autoOption
				}, ...llmRoutes.map((r) => ({
					id: r,
					label: r
				}))],
				selectedId: cardLlm,
				onSelect: (id) => {
					pickLlm(id);
					setLlmOpen(false);
				},
				onClose: () => {
					setLlmOpen(false);
				},
				compact: true,
				portal: true
			}) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				key: "enhance",
				size: "sm",
				variant: "outline",
				"aria-label": chromeCopy.agentEnhanceAria,
				"data-testid": "drill-enhance",
				disabled: enhancingBar,
				onClick: fireEnhance
			}, enhancingBar ? chromeCopy.enhanceBusyWord : chromeCopy.enhanceWord)] : [null, null], live ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				key: "run",
				size: "sm",
				variant: "outline",
				"aria-label": chromeCopy.stopRun,
				"data-testid": "drill-stop",
				onClick: () => {
					props.onStop();
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconStopFillRegular, { size: 16 }), chromeCopy.stopWord) : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				key: "run",
				size: "sm",
				variant: "outline",
				"aria-label": chromeCopy.runStage,
				"data-testid": "drill-run",
				onClick: () => {
					(boundRef.current ?? props.onRun)();
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutlineRegular, { size: 16 }), chromeCopy.runWord), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				key: "close",
				size: "sm",
				variant: "outline",
				"aria-label": chromeCopy.collapseCard,
				onClick: onClose
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 16 }), chromeCopy.closeWord)), live || shownBarError !== null ? (0, react.createElement)("div", {
				key: "status",
				className: card_module_css_default.zoomWebhook,
				role: "status",
				"data-testid": "zoom-status"
			}, live ? (0, react.createElement)("span", {
				className: card_module_css_default.drillProgress,
				"data-testid": "drill-progress"
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { size: 14 }), (0, react.createElement)("span", null, [act !== "" ? act : "running", pct !== null ? " · " + String(pct) + "%" : ""].join("")), pct !== null ? (0, react.createElement)("span", { className: card_module_css_default.zoomMeter }, (0, react.createElement)("span", {
				className: card_module_css_default.zoomMeterFill,
				style: { width: pct + "%" }
			})) : null) : shownBarError !== null ? (0, react.createElement)("span", {
				className: card_module_css_default.runError,
				"data-testid": "drill-run-error"
			}, shownBarError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: () => {
					setDismissedBarError(shownBarError);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null) : null, (0, react.createElement)("div", {
				key: "body",
				className: card_module_css_default.zoomBody
			}, ready ? (0, react.createElement)(props.detail, {
				stage,
				bench: rest.bench,
				running: rest.running,
				onRun: rest.onRun,
				onStop: rest.onStop,
				onClose,
				onRemoved: rest.onRemoved,
				onPatchParams: rest.onPatchParams,
				renderStageView: rest.renderStageView,
				renderPreview: rest.renderPreview,
				onSurface,
				runId: rest.runId,
				bindRun: (r) => {
					boundRef.current = r;
				},
				bindEnhance: bindEnhanceStable,
				cardLabel: props.cardLabel ?? null
			}) : (0, react.createElement)(ZoomSkeleton))))));
		}
		/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
		* tree's own DSH rule), keyed per stage. */
		function CardZoomOverlay(props) {
			const mounted = typeof document !== "undefined";
			const tree = (0, react.createElement)(ZoomMount, {
				key: props.stage.id,
				...props
			});
			return mounted ? (0, react_dom.createPortal)(tree, document.body, "zoom-portal") : tree;
		}
		//#endregion
		//#region src/client/dnd-payloads.ts
		/** The tile-reorder drag's MIME (native HTML5 sortable — DSH ships no
		*  drag library; the estate drags natively). Carries the source id. */
		const CARD_DRAG_MIME = "application/x-melite-card";
		//#endregion
		//#region src/client/card-labels.ts
		/** card-labels.ts — the card's professional name, resolved client-side.
		*
		* The bench rows carry the card id ('image-gen'); the tile and the
		* drill must face the catalog's professional label ('Generate
		* Image' — the card's own identity rung, served by the catalog
		* door). The GET is cached at the wire (card-base's ONE DOOR LAW),
		* so every face calling this hook shares one read; a refused door
		* resolves nothing (null) and the faces keep today's id faces —
		* never a second failure voice over a name. */
		function useCardLabels() {
			const [labels, setLabels] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				(0, _melite_card_base_client.fetchCardCatalog)().then((list) => {
					if (!alive) return;
					setLabels(new Map(list.map((c) => [c.id, c.label])));
				}).catch(() => {
					if (alive) setLabels(/* @__PURE__ */ new Map());
				});
				return () => {
					alive = false;
				};
			}, []);
			return (cardId) => labels?.get(cardId) ?? null;
		}
		//#endregion
		//#region src/client/sortable-tile.tsx
		/** sortable-tile.tsx — the bench tile: the native-reorder wrapper, the
		* chat-input chrome, the audio-bars face (extracted from CardsTab.tsx
		* hour 15). */
		/** THE CARD TILE — its own face, not the chat row's grammar: a
		*  square preview cell (artifact thumb, video, audio bars, or the
		*  kind-initial fallback) over a caption column (title, service,
		*  upstream tag, clipped prompt). It reads the same folded
		*  CardRowLineTabRow the chat plane distills — one vocabulary, two
		*  faces; the running state is the spinner + progress pill, never a
		*  StateDot. */
		/** THE CARD TILE — the operator's CardTile law (flowCardTile.tsx)
		*  ported to the tab, DSH native: the visual card (INNER) is ONE flex
		*  column with exactly two flow children —
		*    1. the PREVIEW CELL — flex-1 min-h-0, aspect-square: it owns
		*       every pixel the caption strip doesn't need. Media fills it
		*       edge to edge (object-cover); no artifact yet → the KIND FACE
		*       (the kind initial, the glyph chain's face without the editor
		*       runtime). A portrait artifact can NOT drive the row height
		*       (SQUARE LAW, 2026-08-23).
		*    2. the CAPTION STRIP — shrink-0, natural height: the declared
		*       summary line (title · engine) + the live status dot.
		*  Image-anchored overlays (the status dot) live INSIDE the preview
		*  cell so their anchors ride the artifact's corner. Click = the
		
/** The sortable tile wrapper — the old grid's SortableCardWrap
		*  pattern: the li is the drag unit, transform/transition ride the
		*  wrapper, the shared-element layoutId stays INSIDE (the morph
		*  anchor is unbroken). */
		function SortableTile({ row, entered, onOpen, grouping, selected, onToggleSelect, onAssetAttach, dragging, dragOver, onReorderStart, onReorderOver, onReorderDrop, onRun, onStop, onRemove, activeRunId }) {
			const dragHandlers = grouping ? {} : {
				draggable: true,
				onDragStart: (e) => {
					e.dataTransfer.setData(CARD_DRAG_MIME, row.id);
					e.dataTransfer.effectAllowed = "move";
					onReorderStart(row.id);
				},
				onDragEnd: () => {
					onReorderStart(null);
				}
			};
			const wiredFrom = typeof row.stage.inputs === "object" && row.stage.inputs !== null && "source" in row.stage.inputs;
			const [dismissedTileError, setDismissedTileError] = (0, react.useState)(null);
			const tileError = row.error;
			(0, react.useEffect)(() => {
				if (tileError === null) setDismissedTileError(null);
			}, [tileError]);
			const shownTileError = tileError !== null && row.status === "error" && tileError !== dismissedTileError ? tileError : null;
			return (0, react.createElement)("li", {
				className: card_module_css_default.tile + (entered ? " " + card_module_css_default.tileEnter : "") + (dragging ? " " + card_module_css_default.tileDragging : "") + (dragOver ? " " + card_module_css_default.tileDragOver : ""),
				"data-stage-id": row.id,
				"data-stage-status": row.status,
				"data-grouping": grouping ? "on" : null,
				"data-selected": grouping && selected ? "on" : null,
				onDragOver: (e) => {
					if (e.dataTransfer.types.includes("application/x-melite-card")) {
						e.preventDefault();
						e.stopPropagation();
						e.dataTransfer.dropEffect = "move";
						onReorderOver(row.id);
						return;
					}
					if (e.dataTransfer.types.includes(_melite_card_base_client.ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
						e.preventDefault();
						e.stopPropagation();
						e.dataTransfer.dropEffect = "copy";
					}
				},
				onDrop: (e) => {
					if (e.dataTransfer.types.includes("application/x-melite-card")) {
						e.preventDefault();
						e.stopPropagation();
						const active = e.dataTransfer.getData(CARD_DRAG_MIME);
						if (active !== "" && active !== row.id) onReorderDrop(active, row.id);
						return;
					}
					const asset = (0, _melite_card_base_client.parseAssetDrop)(e.dataTransfer.types.includes(_melite_card_base_client.ASSET_DRAG_MIME) ? e.dataTransfer.getData(_melite_card_base_client.ASSET_DRAG_MIME) : "");
					if ((asset.url ?? "") !== "") {
						e.preventDefault();
						e.stopPropagation();
						const t = asset.type ?? "";
						if (!t.startsWith("image/") && !t.startsWith("audio/")) return;
						onAssetAttach(row.id, asset.url, t.startsWith("audio/") ? "audio" : "image");
						return;
					}
					const file = e.dataTransfer.files[0];
					if (file === void 0) return;
					if (file.type !== "image/png" && file.type !== "image/jpeg" && file.type !== "image/webp") return;
					e.preventDefault();
					e.stopPropagation();
					onAssetAttach(row.id, file, "image");
				},
				...dragHandlers
			}, (0, react.createElement)("div", { className: card_module_css_default.tileShared }, (0, react.createElement)("button", {
				className: card_module_css_default.tileInner,
				type: "button",
				"data-status": row.status,
				onClick: () => {
					if (grouping) {
						onToggleSelect(row.id);
						return;
					}
					onOpen(row);
				}
			}, grouping ? (0, react.createElement)("span", {
				className: card_module_css_default.checkCircle + (selected ? " " + card_module_css_default.checkOn : ""),
				"aria-hidden": "true"
			}, selected ? "✓" : "") : null, (0, react.createElement)("span", { className: card_module_css_default.tilePreview }, row.face === "audio" ? AudioBarsFace({ stageId: row.id }) : row.videoUrl !== null ? (0, react.createElement)("video", {
				className: card_module_css_default.tileVideoImg,
				src: row.videoUrl,
				muted: true,
				playsInline: true,
				preload: "metadata",
				"data-testid": "tile-face-video"
			}) : row.thumbUrl !== null ? (0, react.createElement)("img", {
				className: card_module_css_default.tileImg,
				src: row.thumbUrl,
				alt: row.title,
				loading: "lazy"
			}) : (0, react.createElement)("span", {
				className: card_module_css_default.kindFace,
				"data-kind": row.kind
			}, (0, react.createElement)("span", { className: card_module_css_default.kindInitial }, row.kind.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default.kindName }, row.kindLabel ?? (0, _melite_card_base_client.titleCaseId)(row.kind))), rowRunning(row) ? (0, react.createElement)("span", {
				className: card_module_css_default.tileSpin,
				"data-testid": "tile-spin",
				role: "status",
				"aria-label": chromeCopy.tileRunning
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { size: 14 }), row.progress !== null && row.progress.max > 0 ? (0, react.createElement)("span", {
				className: card_module_css_default.tilePct,
				"data-testid": "tile-progress",
				"aria-label": chromeCopy.progressPercent
			}, Math.floor(100 * row.progress.value / row.progress.max) + "%") : null) : null, grouping ? null : (0, react.createElement)("button", {
				className: card_module_css_default.tileIconBtn + " " + card_module_css_default.tileTrash,
				type: "button",
				"aria-label": chromeCopy.removeStage,
				"data-testid": "tile-remove",
				onClick: (e) => {
					e.stopPropagation();
					onRemove(row);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 })), grouping ? null : rowRunning(row) ? (0, react.createElement)("button", {
				className: card_module_css_default.tileIconBtn + " " + card_module_css_default.tileRunBtn,
				type: "button",
				"aria-label": chromeCopy.stopRun,
				"data-testid": "tile-stop",
				disabled: activeRunId === null,
				onClick: (e) => {
					e.stopPropagation();
					onStop(row);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconStopFillRegular, { size: 14 })) : (0, react.createElement)("button", {
				className: card_module_css_default.tileIconBtn + " " + card_module_css_default.tileRunBtn,
				type: "button",
				"aria-label": chromeCopy.runStage,
				"data-testid": "tile-run",
				onClick: (e) => {
					e.stopPropagation();
					onRun(row);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutlineRegular, { size: 14 }))), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, row.title, wiredFrom ? (0, react.createElement)(_melite_card_base_client.Tip, {
				tip: chromeCopy.sourceWired,
				children: (0, react.createElement)("span", { className: card_module_css_default.wiredMark }, " ⛓")
			}) : null), (0, react.createElement)("span", { className: card_module_css_default.tileMeta }, row.service !== null ? (0, _melite_card_base_client.titleCaseId)(row.service) : null, row.upstream !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Tag, { tone: "quiet" }, "⟵ " + row.upstream) : null, row.prompt !== null ? (0, react.createElement)("span", { className: card_module_css_default.tilePrompt }, row.prompt) : null), shownTileError !== null ? (0, react.createElement)("span", {
				className: card_module_css_default.runError,
				"data-testid": "tile-run-error",
				title: shownTileError
			}, shownTileError.length > 140 ? shownTileError.slice(0, 140) + "…" : shownTileError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: (e) => {
					e.stopPropagation();
					setDismissedTileError(shownTileError);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, row.health !== null ? (0, react.createElement)("span", {
				className: card_module_css_default.runError,
				"data-testid": "tile-health",
				title: chromeCopy.transportTitle({ health: row.health })
			}, chromeCopy.transportTitle({ health: row.health })) : null))));
		}
		/** THE AUDIO-BARS FACE (2026-09-13): the old system's music tile
		*  preview — a deterministic bar strip (heights hashed from the stage
		*  id, stable across renders; pure CSS, zero media cost). Rides the
		*  audio identity token per the color law. */
		function AudioBarsFace({ stageId }) {
			let h1 = 0;
			for (let i = 0; i < stageId.length; i++) h1 = h1 * 31 + stageId.charCodeAt(i) | 0;
			const heights = [];
			for (let i = 0; i < 14; i++) heights.push(18 + Math.abs(h1 >> i % 15) % 60);
			return (0, react.createElement)("span", {
				className: card_module_css_default.audioBars,
				"data-testid": "tile-face-audio",
				"aria-hidden": "true"
			}, heights.map((ht, i) => (0, react.createElement)("span", {
				key: i,
				className: card_module_css_default.audioBar,
				style: { height: ht + "%" }
			})));
		}
		//#endregion
		//#region \0dsh-css:packages/web/infer-gallery/src/client/overlay.module.css.mjs
		const css$2 = ".P_5Nua_lightbox{width:min(1200px,96vw);max-width:96vw}.P_5Nua_dangerVerb{color:var(--dsw-alias-state-error-primary)}.P_5Nua_walkBtn{z-index:10;border:1px solid var(--dsw-alias-border-l3);border-radius:999px;width:40px;height:40px;padding:0;position:absolute;top:50%;transform:translateY(-50%)}.P_5Nua_walkBtn[aria-label=Previous\\ media]{left:10px}.P_5Nua_walkBtn[aria-label=Next\\ media]{right:10px}.P_5Nua_overlayClose{z-index:10;position:absolute;top:8px;right:8px}.P_5Nua_renameInput{width:min(280px,60vw)}.P_5Nua_wand{z-index:3;background:var(--dsw-alias-fill-subtle,#020617d1);color:var(--dsw-alias-state-warn-primary,#fde68a);letter-spacing:.4px;cursor:pointer;opacity:0;border-radius:6px;align-items:center;gap:4px;padding:4px 6px;font-family:inherit;font-size:9px;font-weight:700;transition:opacity .12s;display:flex;position:absolute;top:6px;right:6px}.P_5Nua_tile:hover .P_5Nua_wand,.P_5Nua_tile:focus-visible .P_5Nua_wand,.P_5Nua_wand:focus-visible{opacity:1}";
		const tagId$2 = "@melite-plugin/dsh-card-view/overlay.module.css@71525c21";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var overlay_module_css_default = {
			"dangerVerb": "P_5Nua_dangerVerb",
			"lightbox": "P_5Nua_lightbox",
			"overlayClose": "P_5Nua_overlayClose",
			"renameInput": "P_5Nua_renameInput",
			"tile": "P_5Nua_tile",
			"walkBtn": "P_5Nua_walkBtn",
			"wand": "P_5Nua_wand"
		};
		//#endregion
		//#region ../../web-kit/formats/lib/glbLoad.js
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
		const base = { "MODE": "production" }.BASE_URL ?? "/";
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
		//#region ../../web-kit/contracts/lib/mediaKinds.js
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
		//#region ../infer-gallery/src/client/artifact-ops.ts
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
		//#endregion
		//#region ../infer-gallery/src/client/galleryCopy.ts
		/**
		* galleryCopy.ts — THE INFER-GALLERY COPY DICTIONARY (the copy-scope
		* extension, 2026-11-05). Client UI copy is locale-owned (the estate's
		* decision, the DSH verify-client-ui-i18n law): presentation code owns
		* no copy literals; it consumes them here through the typed seat. A
		* second locale plugs into this dictionary without touching a single
		* gallery component.
		*
		* THE BOUND: static user-visible FACES live here (panel title, tab and
		* sort pills, select/confirm verbs, empty and failure states, aria
		* names, the walk + pagination faces, the kind labels, the mesh tile
		* and mesh viewer copy). Parameterized sentences whose shape is fixed
		* but whose slots are live live here as typed dict functions (the
		* square.ts pattern) — the site passes exactly the params the entry
		* declares. DATA never rides the dictionary: refusal-identity Error
		* leads (`delete failed —`, `rename failed (bad_rename_answer)`, the
		* `HTTP <status>` feed identity, the bench refusal formatting) stay in
		* artifact-ops/useFeed/bench-load — they are wire identities callers
		* and tests match, not presentation copy.
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const galleryCopy = {
			/** The panel's title face. */
			panelTitle: "Infer Media",
			/** The header stat line's runs/artifacts body. */
			statRunsArtifacts: (p) => `${p.runs} runs · ${p.artifacts} artifacts`,
			/** The header stat line's gateway-error suffix (pluralized). */
			statGatewayNotes: (p) => ` · ${p.count} gateway note${p.count > 1 ? "s" : ""}`,
			/** The header stat line's truncation suffix. */
			statCapped: (p) => ` · ${p.count} capped`,
			/** The flows tab pill face. */
			tabFlows: (p) => `Flows ${p.count}`,
			/** The artifacts tab pill face. */
			tabArtifacts: (p) => `Artifacts ${p.count}`,
			/** The sort pill: newest first. */
			sortNewest: "Newest",
			/** The sort pill: oldest first. */
			sortOldest: "Oldest",
			/** The sort pill: alphabetical by file. */
			sortAlpha: "A–Z",
			/** The multi-select toggle pill. */
			selectAction: "Select",
			/** The live selection count. */
			selectedCount: (p) => `${p.count} selected`,
			/** The selection-clearing pill. */
			clearAction: "Clear",
			/** The armed destructive pill (names the count). */
			confirmDelete: (p) => `Confirm delete ${p.count}?`,
			/** The un-armed destructive pill. */
			deleteSelected: "Delete selected",
			/** The search box placeholder. */
			searchPlaceholder: "search prompt, file…",
			/** The all-kinds chip face. */
			chipAll: "All",
			/** Kind label: video. */
			kindVideo: "Video",
			/** Kind label: images (the gallery's image face is plural). */
			kindImages: "Images",
			/** Kind label: audio. */
			kindAudio: "Audio",
			/** Kind label: 3D meshes (the tile badge's face too). */
			kindModel: "3D",
			/** Kind label: text artifacts. */
			kindText: "Text",
			/** The Media tab's chip + guide-row title (one home, both read it). */
			mediaTabTitle: "Media",
			/** The guide row's description under the Media title. */
			mediaTabGuide: "Every run's artifacts — the archive, with the lightbox, chips, search and the cards wand.",
			/** The estate-artifact tab's title when the address decodes to no file. */
			artifactFallbackTitle: "artifact",
			/** The empty flows face. */
			emptyDrafts: "no composed cards yet — build one in a chat.",
			/** A draft row's fallback kind word when the model is unknown. */
			draftKindFallback: "card",
			/** The open-failure banner lead. */
			openFailed: (p) => `open failed: ${p.error}`,
			/** The feed-failure banner lead. */
			feedFailed: (p) => `failed to load runs: ${p.error}`,
			/** The first-load face. */
			loadingRuns: "loading runs…",
			/** The empty-filter face. */
			noArtifacts: "no artifacts match.",
			/** The wand's accessible name. */
			wandAria: "Open as cards — this run",
			/** The in-flight restore voice beside the wand (never hover-gated). */
			restoringAction: "restoring…",
			/** The previous-page pill. */
			prevPage: "‹ Prev",
			/** The page position line. */
			pageOf: (p) => `page ${p.page} of ${p.pages} · ${p.count} artifacts`,
			/** The next-page pill. */
			nextPage: "Next ›",
			/** The idle chip's label. */
			tileLoadPreview: "Preview 3D",
			/** The armed seat's collapse affordance. */
			tileClosePreview: "Close preview",
			/** The idle chip's accessible name for one artifact. */
			tileLoadPreviewOf: (file) => `Load 3D preview of ${file}`,
			/** The canvas's accessible name for one artifact. */
			viewOf: (file) => `3D view of ${file}`,
			/** The .gltf honest failure (sidecar buffers the route never serves). */
			viewUnavailableGltf: "3D view unavailable — this .gltf references external buffers the media route does not serve. Download it to open it in a 3D tool.",
			/** The not-a-mesh honest failure, naming the file. */
			viewUnavailableNotArtifact: (p) => `3D view unavailable — "${p.name}" is not a .glb/.gltf artifact.`,
			/** The loading line for one artifact. */
			loadingFile: (file) => `loading ${file}…`,
			/** The estate-artifact tab's malformed-address refusal. */
			addressUnreadable: "artifact address unreadable — the viewer cannot decode it",
			/** The refresh button's busy face. */
			refreshBusy: "loading…",
			/** The refresh button's idle face. */
			refreshIdle: "refresh",
			/** One gateway's warning line. */
			gatewayNote: (p) => `gateway ${p.gateway}: ${p.message}`,
			/** The text view's fetch-failure face. */
			textLoadFailed: "the text could not load —",
			/** The generic loading word. */
			loadingWord: "loading…",
			/** The download link face for one artifact. */
			downloadFile: (file) => `download ${file}`,
			/** The sidebar hand-off link face. */
			openInSidebar: "open 3D view in sidebar",
			/** The modal title's fallback when the item has no file name. */
			previewTitleFallback: "media preview",
			/** The close button's accessible name. */
			closePreviewAria: "Close preview",
			/** The walk-previous button's accessible name. */
			prevMediaAria: "Previous media",
			/** The walk-next button's accessible name. */
			nextMediaAria: "Next media",
			/** The rename verb's face. */
			renameAction: "Rename",
			/** The rename verb's accessible name. */
			renameAria: "Rename media file",
			/** The delete verb's face. */
			deleteAction: "Delete",
			/** The delete verb's accessible name. */
			deleteAria: "Delete media file",
			/** The delete confirmation line, naming the file. */
			deleteConfirmLine: (file) => `Delete ${file}?`,
			/** The deleting busy face. */
			deletingWord: "Deleting…",
			/** The delete confirmation verb's face. */
			confirmDeleteWord: "Confirm delete",
			/** The delete confirmation verb's accessible name. */
			confirmDeleteAria: "Confirm delete media file",
			/** The cancel verb's face (both mutation flows). */
			cancelWord: "Cancel",
			/** The cancel verb's accessible name in the delete flow. */
			cancelDeleteAria: "Cancel delete",
			/** The rename input's accessible name. */
			renameInputAria: "New file name",
			/** The renaming busy face. */
			renamingWord: "Renaming…",
			/** The rename save verb's face. */
			saveWord: "Save",
			/** The rename save verb's accessible name. */
			saveRenameAria: "Save new file name",
			/** The cancel verb's accessible name in the rename flow. */
			cancelRenameAria: "Cancel rename",
			/** The lightbox's escape hint. */
			escHint: "Esc or click the mask to close"
		};
		//#endregion
		//#region ../infer-gallery/src/client/ui.tokens.ts
		/**
		* Design tokens — every var(--dsw-alias-…) string in the media family
		* declared ONCE (audit F6). Numbered suffixes = same alias, different
		* fallback (opacity variants). Pinned by
		* tests/walls/ts/suites/media-sidebar.spec.ts (tokens single site).
		*/
		const bgBase1 = "var(--dsw-alias-bg-base, #000)";
		const labelPrimary2 = "var(--dsw-alias-label-primary, rgba(226,232,240,0.85))";
		const stateBusinessPrimary = "var(--dsw-alias-state-business-primary, rgb(147,197,253))";
		const stateWarnPrimary1 = "var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.9))";
		const textTertiary3 = "var(--dsw-alias-text-tertiary, rgba(148,163,184,0.8))";
		//#endregion
		//#region ../infer-gallery/src/client/mesh-view.tsx
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
			if (path.toLowerCase().endsWith(".gltf")) return galleryCopy.viewUnavailableGltf;
			if (!isModelUrl(path))
 /* v8 ignore next 2 -- same: split never yields an empty array, so
			* pop() returns the last segment as a string. */
			return galleryCopy.viewUnavailableNotArtifact({ name: path.split("/").pop() ?? url });
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
						"aria-label": galleryCopy.viewOf(file),
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
					failure === null && loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						"data-testid": "mesh-view-loading",
						style: {
							color: textTertiary3,
							fontSize: 12
						},
						children: galleryCopy.loadingFile(file)
					}) : null
				]
			});
		}
		//#endregion
		//#region ../infer-gallery/src/drilldown.tsx
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
		/** Text artifact view (the text-kind stroke, 2026-10-24): the
		*  words FETCHED and shown in the modal — a text artifact the
		*  operator can read and copy, with the same download link the mesh
		*  seat carries (a fetch that refuses must not strand the file). */
		function TextView({ item }) {
			const [body, setBody] = react.useState(null);
			const [failed, setFailed] = react.useState(false);
			react.useEffect(() => {
				let alive = true;
				setBody(null);
				setFailed(false);
				fetch(item.url).then((r) => {
					if (!r.ok) throw new Error(String(r.status));
					return r.text();
				}).then((t) => {
					if (alive) setBody(t);
				}).catch(() => {
					if (alive) setFailed(true);
				});
				return () => {
					alive = false;
				};
			}, [item.url]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10,
					alignItems: "center",
					width: "100%"
				},
				children: [body !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
					"data-testid": "drill-text-body",
					style: {
						width: "min(860px, 90vw)",
						maxHeight: "60vh",
						overflow: "auto",
						margin: 0,
						padding: 14,
						borderRadius: 8,
						background: bgBase1,
						color: labelPrimary2,
						fontSize: 13,
						lineHeight: 1.55,
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
						textAlign: "left",
						fontFamily: "ui-monospace, monospace"
					},
					children: body
				}) : failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-testid": "drill-text-failed",
					style: {
						color: labelPrimary2,
						fontSize: 14
					},
					children: galleryCopy.textLoadFailed
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-testid": "drill-text-loading",
					style: {
						color: labelPrimary2,
						fontSize: 14
					},
					children: galleryCopy.loadingWord
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
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
					children: galleryCopy.downloadFile(item.file)
				})]
			});
		}
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
						children: galleryCopy.openInSidebar
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
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
						children: galleryCopy.downloadFile(item.file)
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
			const mountedRef = react.useRef(true);
			const seatUrlRef = react.useRef(item.url);
			react.useEffect(() => () => {
				mountedRef.current = false;
			}, []);
			react.useEffect(() => {
				seatUrlRef.current = item.url;
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
				const seat = item.url;
				inflight.current = true;
				setBusy(true);
				setOpError("");
				onDelete(item).catch((e) => {
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
					setOpError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					inflight.current = false;
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
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
				const seat = item.url;
				inflight.current = true;
				setBusy(true);
				setOpError("");
				onRename(item, name).catch((e) => {
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
					setOpError(e instanceof Error ? e.message : String(e));
				}).finally(() => {
					inflight.current = false;
					if (!mountedRef.current || seatUrlRef.current !== seat) return;
					setBusy(false);
					setMode("idle");
				});
			};
			const actionBtn = (label, verb, opts) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				"aria-label": opts.aria,
				"data-testid": opts.testid,
				disabled: busy,
				className: opts?.danger === true ? overlay_module_css_default.dangerVerb : void 0,
				onClick: (e) => {
					e.stopPropagation();
					verb();
				},
				children: label
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: item.file || galleryCopy.previewTitleFallback,
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							"aria-label": galleryCopy.closePreviewAria,
							variant: "ghost",
							size: "sm",
							onClick: onClose,
							className: overlay_module_css_default.overlayClose,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, {})
						}),
						canWalk ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							"aria-label": galleryCopy.prevMediaAria,
							"data-testid": "drill-prev",
							disabled: atHead,
							onClick: () => {
								step(-1);
							},
							className: overlay_module_css_default.walkBtn,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineRegular, { size: 20 })
						}) : null,
						canWalk ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							"aria-label": galleryCopy.nextMediaAria,
							"data-testid": "drill-next",
							disabled: atTail,
							onClick: () => {
								step(1);
							},
							className: overlay_module_css_default.walkBtn,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 20 })
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
						}) : item.kind === "text" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextView, { item }) : item.kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
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
							children: mode === "idle" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [canRename ? actionBtn(galleryCopy.renameAction, startRename, {
								testid: "drill-rename",
								aria: galleryCopy.renameAria
							}) : null, canDelete ? actionBtn(galleryCopy.deleteAction, startDelete, {
								danger: true,
								testid: "drill-delete",
								aria: galleryCopy.deleteAria
							}) : null] }) : mode === "confirmDelete" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										color: labelPrimary2,
										fontSize: 12
									},
									children: galleryCopy.deleteConfirmLine(item.file)
								}),
								actionBtn(busy ? galleryCopy.deletingWord : galleryCopy.confirmDeleteWord, confirmDelete, {
									danger: true,
									testid: "drill-delete-confirm",
									aria: galleryCopy.confirmDeleteAria
								}),
								actionBtn(galleryCopy.cancelWord, () => {
									setMode("idle");
									setOpError("");
								}, {
									testid: "drill-delete-cancel",
									aria: galleryCopy.cancelDeleteAria
								})
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									"aria-label": galleryCopy.renameInputAria,
									"data-testid": "drill-rename-input",
									value: draftName,
									disabled: busy,
									className: overlay_module_css_default.renameInput,
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
									}
								}),
								actionBtn(busy ? galleryCopy.renamingWord : galleryCopy.saveWord, confirmRename, {
									testid: "drill-rename-save",
									aria: galleryCopy.saveRenameAria
								}),
								actionBtn(galleryCopy.cancelWord, () => {
									setMode("idle");
									setOpError("");
								}, {
									testid: "drill-rename-cancel",
									aria: galleryCopy.cancelRenameAria
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
							children: galleryCopy.escHint
						})
					]
				})
			});
		}
		//#endregion
		//#region ../../estate/drafts/src/trail.ts
		init_benchStage();
		/** One url, canonical: the run-relative path. The media route and
		*  the gallery proxy spell the SAME file two ways
		*  (/melite-media/runs/<rest>, /infer-gallery/artifact?path=<enc>) —
		*  every dedup compares canonical forms, never wire spellings. The
		*  run-media prefix rides the contract's constant — the closure
		*  gate's no-second-copy law. */
		const MEDIA_RUNS = RUN_MEDIA_PREFIX + "/";
		function canonicalOutputUrl(url) {
			if (url.startsWith(MEDIA_RUNS)) return url.slice(MEDIA_RUNS.length);
			if (url.startsWith("/infer-gallery/artifact?path=")) try {
				return decodeURIComponent(url.slice(29));
			} catch {
				return url;
			}
			return url;
		}
		/** A result's OUTPUT urls, one spelling: the artifacts name→url map
		*  first, the flat assetUrls list second, the lone url third (the
		*  same harvest order the client's preview reads). */
		function resultOutputUrls(result) {
			if (typeof result !== "object" || result === null || Array.isArray(result)) return [];
			const row = result;
			const urls = [];
			if (row["artifacts"] !== null && typeof row["artifacts"] === "object" && !Array.isArray(row["artifacts"])) {
				for (const v of Object.values(row["artifacts"])) if (typeof v === "string" && v !== "") urls.push(v);
			}
			if (urls.length === 0 && Array.isArray(row["assetUrls"])) {
				for (const v of row["assetUrls"]) if (typeof v === "string" && v !== "") urls.push(v);
			}
			if (urls.length === 0 && typeof row["url"] === "string" && row["url"] !== "") urls.push(row["url"]);
			return urls;
		}
		/** THE ONE-ROW-PER-RUN TRAIL (bench-trail W2's law, applied to any
		*  carried history): identity is the run_id first — the media route
		*  and the gallery proxy spell the same file differently — with the
		*  canonical-url set as the no-id fallback. Order preserved, newest
		*  first in, newest first out. */
		function trailDedupe(history) {
			const out = [];
			const runIds = /* @__PURE__ */ new Set();
			const sets = [];
			for (const entry of history) {
				if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
					out.push(entry);
					continue;
				}
				const row = entry;
				const rid = row["run_id"];
				if (typeof rid === "string" && rid !== "") {
					if (runIds.has(rid)) continue;
					runIds.add(rid);
				}
				const canon = new Set(resultOutputUrls(row).map(canonicalOutputUrl));
				if (sets.some((s) => s.size === canon.size && [...s].every((u) => canon.has(u)))) continue;
				sets.push(canon);
				out.push(entry);
			}
			return out;
		}
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarScale.ts
		/**
		* MotionTimelineBarScale — the bar's ABSOLUTE scale model (split from
		* MotionTimelineBar.tsx, pure move): measure-once pin, zoom,
		* playhead-anchored scroll, frame<->px. Bodies below are the bar's.
		*/
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/MotionTimelineBarDrag.ts
		/**
		* MotionTimelineBarDrag — the bar's one global pointer session (split
		* from MotionTimelineBar.tsx, pure move): scrub + clip drag/resize +
		* keyframe drag, the pose-studio pattern (window listeners + live-ref
		* drag state). Bodies below are the bar's.
		*/
		//#endregion
		//#region \0dsh-css:packages/web-kit/timeline/src/timeline/timeline.module.css.mjs
		const css$1 = ".t2WLSa_root{user-select:none;display:flex}.t2WLSa_gutter{border-right:1px solid var(--dsw-alias-border-l2);flex-direction:column;flex:none;display:flex}.t2WLSa_zoomRow{border-bottom:1px solid var(--dsw-alias-border-l2);justify-content:center;align-items:center;gap:2px;display:flex}.t2WLSa_zoomBtn{width:20px;height:20px;color:var(--dsw-alias-label-secondary);font-size:inherit;cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;line-height:1;display:inline-flex}.t2WLSa_zoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-brand-primary)}.t2WLSa_zoomBtn svg{width:14px;height:14px}.t2WLSa_zoomPct{min-width:32px;height:auto;color:var(--dsw-alias-label-secondary);text-align:center;font-variant-numeric:tabular-nums;cursor:pointer;background:0 0;border:none;border-radius:4px;padding:0 2px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px}.t2WLSa_zoomPct:hover{color:var(--dsw-alias-brand-primary)}.t2WLSa_laneHeadShell{border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);align-items:center;gap:6px;padding:0 8px;display:flex}.t2WLSa_laneHeadShell:last-child{border-bottom:0}.t2WLSa_laneHeadShell>svg{width:14px;height:14px;color:var(--dsw-alias-brand-primary);flex:none}.t2WLSa_laneHeadShell[data-lane-head=audio]>svg{width:12px;height:12px;color:var(--dsw-alias-state-business-primary)}.t2WLSa_gutterLabel{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:10px;font-weight:500;overflow:hidden}.t2WLSa_detachBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;margin-left:auto;padding:0;display:inline-flex}.t2WLSa_detachBtn:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_detachBtn svg{width:10px;height:10px}.t2WLSa_uploadBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.t2WLSa_uploadBtn:hover{background:color-mix(in srgb, var(--dsw-alias-label-tertiary) 14%, transparent);color:var(--dsw-alias-label-primary)}.t2WLSa_uploadBtn svg{width:10px;height:10px}.t2WLSa_laneDot{border-radius:9999px;flex:none;width:6px;height:6px}.t2WLSa_contentWrap{flex:1;min-width:0;position:relative}.t2WLSa_scroller{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l3) transparent;height:100%;overflow:auto hidden}.t2WLSa_scroller::-webkit-scrollbar{height:8px}.t2WLSa_scroller::-webkit-scrollbar-track{background:0 0}.t2WLSa_scroller::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:4px}.t2WLSa_content{position:relative}.t2WLSa_ruler{border-bottom:1px solid var(--dsw-alias-border-l2);position:relative}.t2WLSa_tick{position:absolute;top:0;bottom:0}.t2WLSa_tickLine{background:var(--dsw-alias-border-l2);width:1px;height:100%}.t2WLSa_tickLabel{color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;position:absolute;top:2px;left:4px}.t2WLSa_timecode{z-index:10;font-variant-numeric:tabular-nums;height:100%;color:var(--dsw-alias-brand-primary);align-items:center;padding-left:6px;padding-right:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;line-height:1;display:flex;position:sticky;left:0}.t2WLSa_promptsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_canAdd{cursor:copy}.t2WLSa_emptyCenter{justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.t2WLSa_emptyHint{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_promptClip{touch-action:none;cursor:grab;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_promptClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_clipSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);border-width:0}.t2WLSa_clipSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_clipMoving{z-index:30;cursor:grabbing;border:1px solid var(--dsw-alias-brand-primary);box-shadow:0 20px 25px -5px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 8px 10px -6px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent), 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent)}.t2WLSa_edgeL{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:0;bottom:0;left:0}.t2WLSa_edgeL:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeDead{cursor:default;opacity:.35}.t2WLSa_edgeDead:hover{background:0 0}.t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_promptClip:hover .t2WLSa_gripPill{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_seamDot{z-index:35;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:0;transform:translate(-50%,-50%)}.t2WLSa_edgeR{z-index:30;touch-action:none;cursor:ew-resize;justify-content:center;align-items:center;width:12px;display:flex;position:absolute;top:16px;bottom:0;right:0}.t2WLSa_edgeR:hover{background:var(--dsw-alias-interactive-bg-hover)}.t2WLSa_edgeWide{width:16px}.t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 25%, transparent);border-radius:9999px;width:3px;height:20px}.t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 45%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillR{background:color-mix(in srgb, var(--dsw-alias-label-primary) 60%, transparent)}.t2WLSa_promptClip:hover .t2WLSa_gripPillBright{background:color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent)}.t2WLSa_clipEditor{background:color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);height:24px;box-shadow:0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);pointer-events:auto;border:none;border-radius:4px;align-items:center;padding:0 6px;display:inline-flex;position:absolute;top:50%;left:8px;right:8px;transform:translateY(-50%)}.t2WLSa_clipEditor input{width:100%;min-width:0;height:100%;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;padding:0;font-size:11px;line-height:1.5}.t2WLSa_clipEditor input::placeholder{color:var(--dsw-alias-label-tertiary)}.t2WLSa_previewWrap{z-index:10;pointer-events:none;position:absolute;inset:0;overflow:hidden}.t2WLSa_previewVideo{object-fit:cover;opacity:.6;width:100%;height:100%;position:absolute;inset:0}.t2WLSa_scrim{background:linear-gradient(to top, color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent), color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent) 50%, color-mix(in srgb, var(--dsw-alias-bg-base) 10%, transparent));position:absolute;inset:0}.t2WLSa_clipTextCol{z-index:20;flex-direction:column;gap:2px;padding:0 12px 6px;display:flex;position:absolute;bottom:0;left:0;right:0}.t2WLSa_clipTextStack{z-index:10;pointer-events:none;flex-direction:column;justify-content:center;gap:2px;padding:0 12px;display:flex;position:absolute;inset:0}.t2WLSa_clipTitle{text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:500;overflow:hidden}.t2WLSa_clipEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_clipDur{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_knobDot{z-index:20;background:var(--dsw-alias-brand-primary);width:6px;height:6px;box-shadow:0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 80%, transparent);pointer-events:none;border-radius:9999px;position:absolute;top:4px;right:6px}.t2WLSa_refAudioBadge{z-index:20;width:10px;height:10px;color:var(--dsw-alias-state-business-primary);pointer-events:none;position:absolute;top:12px;right:4px}.t2WLSa_refBadge{z-index:20;pointer-events:none;align-items:center;gap:1px;display:flex;position:absolute;top:22px;right:2px}.t2WLSa_refBadge svg{width:8px;height:8px;color:var(--dsw-alias-state-success-primary)}.t2WLSa_refCount{color:var(--dsw-alias-state-success-primary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:8px;line-height:1}.t2WLSa_promptDelete{z-index:40;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:inline-flex;position:absolute;top:4px;right:4px}.t2WLSa_promptDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_promptClip:hover .t2WLSa_promptDelete{opacity:1}.t2WLSa_promptDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_beatsLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_beatsAdd{cursor:crosshair}.t2WLSa_beatsEmpty{align-items:center;padding-left:12px;display:flex;position:absolute;inset:0}.t2WLSa_hintLine{color:var(--dsw-alias-label-tertiary);font-size:10px}.t2WLSa_beatClip{border:1px solid var(--dsw-alias-border-l2);cursor:pointer;border-radius:6px;position:absolute;top:4px;bottom:4px;overflow:hidden}.t2WLSa_beatClip:hover{border-color:var(--dsw-alias-border-l4)}.t2WLSa_beatSelected{z-index:30;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent)}.t2WLSa_beatSelected:hover{border-color:var(--dsw-alias-brand-primary)}.t2WLSa_beatLabel{color:var(--dsw-alias-label-secondary);pointer-events:none;align-items:center;padding:0 6px;font-size:10px;line-height:1.25;display:flex;position:absolute;inset:0}.t2WLSa_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.t2WLSa_beatEmpty{color:var(--dsw-alias-label-tertiary);font-style:italic}.t2WLSa_audioLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_audioClip{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);cursor:grab;touch-action:none;border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_audioClip:active{cursor:grabbing}.t2WLSa_audioCard{border-radius:6px;top:3px;bottom:3px}.t2WLSa_audioCardIcon{pointer-events:none;display:flex;position:absolute;top:50%;left:5px;transform:translateY(-50%)}.t2WLSa_audioCardIcon svg{width:13px;height:13px}.t2WLSa_audioCard .t2WLSa_audioClipLabel{flex-direction:column;justify-content:center;align-items:flex-start;gap:1px;font-size:10px;display:flex;left:23px;right:4px}.t2WLSa_audioCard .t2WLSa_audioTime{margin-left:0}.t2WLSa_gainFill{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;position:absolute;bottom:0;left:0;right:0}.t2WLSa_audioClipLabel{text-overflow:ellipsis;white-space:nowrap;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));pointer-events:none;align-items:center;padding:0 4px;font-size:9px;line-height:1;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioName{text-overflow:ellipsis;white-space:nowrap;font-weight:500;overflow:hidden}.t2WLSa_audioTime{font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 50%, var(--dsw-alias-label-tertiary));flex:none;margin-left:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.t2WLSa_audioClipDelete{background:color-mix(in srgb, var(--dsw-alias-bg-base) 40%, transparent);width:14px;height:14px;color:var(--dsw-alias-label-tertiary);cursor:pointer;border:none;border-radius:0 0 0 4px;justify-content:center;align-items:center;padding:0;display:none;position:absolute;top:0;right:0}.t2WLSa_audioClipDelete:hover{background:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary)}.t2WLSa_audioClip:hover .t2WLSa_audioClipDelete{display:flex}.t2WLSa_audioClipDelete svg{width:8px;height:8px}.t2WLSa_audioSlice{border:1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 25%, transparent);background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);border-radius:2px;position:absolute;top:2px;bottom:2px;overflow:hidden}.t2WLSa_sliceLabel{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-secondary));pointer-events:none;justify-content:center;align-items:center;padding:0 4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;display:flex;position:absolute;inset:0;overflow:hidden}.t2WLSa_audioDrop{border:1px dashed color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.t2WLSa_dropHint{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);padding:0 8px;font-size:9px;overflow:hidden}.t2WLSa_kfLane{border-bottom:1px solid var(--dsw-alias-border-l1);position:relative}.t2WLSa_kfLane:last-child{border-bottom:0}.t2WLSa_kfLane[data-kf-cards=true]{background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 3%, transparent)}.t2WLSa_kfDropWell{border:1px dashed color-mix(in srgb, var(--dsw-alias-label-tertiary) 25%, transparent);pointer-events:none;border-radius:4px;justify-content:center;align-items:center;display:flex;position:absolute;inset:2px 4px}.t2WLSa_kfWrap{position:absolute;top:0;bottom:0}.t2WLSa_kfBtn{cursor:grab;background:0 0;border:none;justify-content:center;align-items:center;width:16px;height:16px;padding:0;display:flex;position:absolute;top:50%;left:0;transform:translate(-50%,-50%)}.t2WLSa_kfBtn:active{cursor:grabbing;transform:translate(-50%)}.t2WLSa_kfDiamond{width:10px;height:10px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4);border:1px solid;display:block;transform:rotate(45deg)}.t2WLSa_kfMoving{transform:rotate(45deg)scale(1.25)}.t2WLSa_kfDelete{z-index:10;background:var(--dsw-alias-state-error-primary);opacity:0;cursor:pointer;border:none;border-radius:9999px;justify-content:center;align-items:center;width:14px;height:14px;padding:0;display:inline-flex;position:absolute;top:0;left:6px}.t2WLSa_kfDelete:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))}.t2WLSa_kfWrap:hover .t2WLSa_kfDelete{opacity:1}.t2WLSa_kfDelete svg{width:8px;height:8px;color:var(--dsw-alias-label-primary)}.t2WLSa_playhead{z-index:40;pointer-events:none;position:absolute;top:0;bottom:0}.t2WLSa_playheadCap{border:1px solid var(--dsw-alias-border-l4);pointer-events:auto;cursor:grab;touch-action:none;border-radius:9999px;width:8px;height:8px;position:absolute;top:0;left:50%;transform:translate(-50%)}.t2WLSa_playheadCap:active{cursor:grabbing}.t2WLSa_playheadCap:before{content:\"\";border-radius:9999px;position:absolute;inset:-5px}.t2WLSa_miniBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);width:20px;height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0;font-size:13px;line-height:1;display:inline-flex}.t2WLSa_miniBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_miniFitBtn{border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);background:color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent);height:20px;color:var(--dsw-alias-brand-primary);cursor:pointer;border-radius:6px;flex:none;justify-content:center;align-items:center;padding:0 6px;font-size:10px;font-weight:600;display:inline-flex}.t2WLSa_miniFitBtn:hover{background:color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent)}.t2WLSa_scrubBar{align-items:center;gap:8px;width:100%;display:flex}.t2WLSa_scrubToggle{cursor:pointer;background:0 0;border:none;flex:none;padding:4px 2px;font-size:11px;line-height:1}.t2WLSa_scrubTrack{cursor:pointer;touch-action:none;flex:1;min-width:0;height:18px;position:relative}.t2WLSa_scrubFill{background:var(--dsw-alias-interactive-bg-active);border-radius:2px;height:4px;position:absolute;top:7px;left:0}.t2WLSa_scrubHead{background:var(--dsw-alias-label-primary);border-radius:1px;width:2px;height:10px;margin-left:-1px;position:absolute;top:4px}.t2WLSa_scrubReadout{color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;font-size:11px}";
		const tagId$1 = "@melite-plugin/dsh-card-view/timeline.module.css@f4be0c1d";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
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
		//#endregion
		//#region ../../web-kit/timeline/src/timeline/FilmPlayer.tsx
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
		//#region ../../web-kit/timeline/src/timeline/TimelineScrubBar.tsx
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
				return m > 0 ? m + ":" + String(Math.floor(s % 60)).padStart(2, "0") : s.toFixed(1) + timelineCopy.secondsUnit;
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
						"aria-label": playing ? timelineCopy.scrubPauseAria : timelineCopy.scrubPlayAria,
						onClick: onTogglePlay,
						"data-testid": "timeline-scrub-toggle",
						children: playing ? "❚❚" : "▶"
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: trackRef,
						className: timeline_module_css_default.scrubTrack,
						"data-testid": "timeline-scrub-track",
						role: "slider",
						"aria-label": timelineCopy.scrubAria,
						"aria-valuemin": 0,
						"aria-valuemax": Math.max(0, duration),
						"aria-valuenow": Math.max(0, current),
						"aria-valuetext": timelineCopy.scrubValuetext({
							current: fmt(current),
							duration: fmt(duration)
						}),
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
							fps !== void 0 && fps > 0 ? timelineCopy.scrubFramesSuffix({
								frame: Math.round(current * fps),
								total: Math.round(duration * fps)
							}) : null
						]
					})
				]
			});
		}
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
		//#region \0dsh-css:packages/web/melite-card-view/src/client/filmSeam.module.css.mjs
		const css = ".obTlHq_player{object-fit:contain;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;width:100%;min-width:0;max-width:100%;height:auto;max-height:100%;display:block}";
		const tagId = "@melite-plugin/dsh-card-view/filmSeam.module.css@970a0999";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@melite-plugin/dsh-card-view";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var filmSeam_module_css_default = { "player": "obTlHq_player" };
		//#endregion
		//#region src/client/filmSeam.tsx
		/**
		* filmSeam.tsx — THE FORM CARD'S OPTIONAL TIMELINE SEAM (the
		* form-seams stroke, 2026-09-17): "form cards can have an optional
		* SEAM for a timeline that stretches along the bottom".
		*
		* The shell's three-slot shape puts the PREVIEW in the right slot
		* and the TIMELINE in the bottom slot — two different slots, one
		* logical face (the bar scrubs the player). The seam object is the
		* bridge: the player writes (handle + clock), the bar reads. A
		* plain observable box — no store, no context, the smallest honest
		* straddle: createFilmSeam() once per stage view (a lazy
		* useState initializer in the owner), FilmSeamPlayer into the
		* preview slot, FilmSeamBar into the shell's bottom slot when the
		* card CLAIMS the seam (the served spec's preview.timeline) AND a
		* film artifact exists.
		*/
		function createFilmSeam(fps = 0) {
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const fn of [...listeners]) try {
					fn();
				} catch (e) {
					console.warn("[filmSeam] subscriber fault:", e);
				}
			};
			const seam = {
				handle: null,
				current: 0,
				duration: 0,
				playing: false,
				fps,
				subscribe(fn) {
					listeners.add(fn);
					return () => {
						listeners.delete(fn);
					};
				},
				bind(handle) {
					seam.handle = handle;
					notify();
				},
				report(partial) {
					Object.assign(seam, partial);
					notify();
				}
			};
			return seam;
		}
		/** THE PREVIEW SLOT FACE — the shared player, wired to the seam.
		* Carries the FIT LAW (one law per estate — .hero's own): the
		* shared player renders a bare <video>; without the class a
		* 1344px film overflows a narrow pane sideways (the operator's
		* tall-screen catch, 2026-09-23). */
		function FilmSeamPlayer(props) {
			const { seam, src } = props;
			const onTime = (0, react.useCallback)((sec) => {
				seam.report({ current: sec });
			}, [seam]);
			const onDuration = (0, react.useCallback)((sec) => {
				seam.report({ duration: sec });
			}, [seam]);
			const onPlayingChange = (0, react.useCallback)((playing) => {
				seam.report({ playing });
			}, [seam]);
			const ref = (handle) => {
				seam.bind(handle);
			};
			return (0, react.createElement)(FilmPlayer, {
				src,
				className: filmSeam_module_css_default.player,
				onTime,
				onDuration,
				onPlayingChange,
				ref,
				"data-testid": props["data-testid"] ?? "film-seam-player"
			});
		}
		/** THE BOTTOM SLOT FACE — the shared scrub bar, reading the seam */
		function FilmSeamBar(props) {
			const { seam } = props;
			const [, force] = (0, react.useState)(0);
			(0, react.useEffect)(() => seam.subscribe(() => {
				force((n) => n + 1);
			}), [seam]);
			const onSeek = (0, react.useCallback)((sec) => {
				seam.handle?.seekTo(sec);
				seam.report({ current: sec });
			}, [seam]);
			const onTogglePlay = (0, react.useCallback)(() => {
				seam.handle?.toggle();
			}, [seam]);
			return (0, react.createElement)(TimelineScrubBar, {
				current: seam.current,
				duration: seam.duration > 0 ? seam.duration : seam.handle?.duration() ?? 0,
				onSeek,
				onTogglePlay,
				playing: seam.playing,
				fps: seam.fps > 0 ? seam.fps : void 0,
				"data-testid": props["data-testid"] ?? "film-seam-bar"
			});
		}
		//#endregion
		//#region ../../image/mask-studio/src/paintInk.ts
		const PAINT_STROKE_INK = "rgba(255, 255, 255, 1)";
		//#endregion
		//#region ../../image/mask-studio/src/ui/paintCopy.ts
		/**
		* paintCopy.ts — THE PAINT LEAF COPY DICTIONARY. Client UI copy is locale-owned —
		* presentation code owns no copy literals; it consumes them here through the typed
		* seat. A second locale plugs into this dictionary without touching a single leaf
		* component.
		*
		* THE BOUND: static user-visible FACES of the paint + bbox leaf canvases live here
		* (labels, hints, aria names, clear actions, the bbox size readout). Canvas DATA —
		* the stroke ink (paintInk.ts), data-testid hooks, classNames, and numeric control
		* seats (min/max/step) — rides the components, never this dictionary.
		*/
		/** The typed dictionary. Keys are stable copy ids. */
		// v8 ignore next -- exercised key-by-key by the copy wall's census arm
		const paintCopy = {
			/** The brush-size slider's visible label. */
			brushLabel: "Brush",
			/** The brush-size slider's accessible name. */
			brushSizeAria: "Brush size",
			/** The paint hint once strokes landed (alpha = the mask). */
			strokesHint: "strokes paint the mask (alpha = the mask)",
			/** The paint hint before the first stroke. */
			paintHint: "drag on the image to paint the mask",
			/** The paint toolbar's clear action. */
			clearAction: "Clear",
			/** The bbox size readout in view pixels. */
			bboxSize: (p) => `box ${Math.round(p.w)}×${Math.round(p.h)} (view px)`,
			/** The bbox hint before a box is drawn. */
			bboxHint: "drag on the image to scope the selection",
			/** The bbox toolbar's clear action. */
			clearBoxAction: "Clear box"
		};
		//#endregion
		//#region ../../image/mask-studio/src/ui/PaintLeafCanvas.tsx
		const FIT$1 = 640;
		/** Load an image element from a URL (null while loading/failed —
		*  the canvas degrades to the blank 1024 fit, never a crash). */
		const loadImage$1 = (url) => new Promise((resolve) => {
			if (url === "") {
				resolve(null);
				return;
			}
			const img = new Image();
			img.onload = () => {
				resolve(img);
			};
			img.onerror = () => {
				resolve(null);
			};
			img.src = url;
		});
		function PaintLeafCanvas(props) {
			const { referenceUrl, value, onChange } = props;
			const viewRef = (0, react.useRef)(null);
			const paintRef = (0, react.useRef)(null);
			const imgRef = (0, react.useRef)(null);
			const drawingRef = (0, react.useRef)(false);
			const lastPtRef = (0, react.useRef)(null);
			const [brushSize, setBrushSize] = (0, react.useState)(28);
			const [hasStrokes, setHasStrokes] = (0, react.useState)(false);
			const hasStrokesRef = (0, react.useRef)(false);
			const [ready, setReady] = (0, react.useState)(false);
			const [viewSize, setViewSize] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				(async () => {
					const img = await loadImage$1(referenceUrl);
					const pay = value !== "" ? await loadImage$1(value) : null;
					if (!alive) return;
					imgRef.current = img;
					const w = img?.naturalWidth ?? pay?.naturalWidth ?? 1024;
					const h = img?.naturalHeight ?? pay?.naturalHeight ?? 1024;
					const scale = Math.min(FIT$1 / w, FIT$1 / h, 1);
					setViewSize({
						w: Math.max(1, Math.round(w * scale)),
						h: Math.max(1, Math.round(h * scale))
					});
					setReady(true);
					if (pay && paintRef.current) {
						const c = paintRef.current;
						c.width = w;
						c.height = h;
						const ctx = c.getContext("2d");
						if (ctx) {
							ctx.drawImage(pay, 0, 0);
							hasStrokesRef.current = true;
							setHasStrokes(true);
						}
					}
				})();
				return () => {
					alive = false;
				};
			}, [referenceUrl, value]);
			const redraw = (0, react.useCallback)(() => {
				const view = viewRef.current;
				const paint = paintRef.current;
				const vs = viewSize;
				if (!view || !paint || !vs) return;
				const img = imgRef.current;
				const w = img?.naturalWidth ?? paint.width;
				const h = img?.naturalHeight ?? paint.height;
				if (w === 0 || h === 0) return;
				view.width = vs.w;
				view.height = vs.h;
				const ctx = view.getContext("2d");
				if (!ctx) return;
				ctx.clearRect(0, 0, vs.w, vs.h);
				if (img) ctx.drawImage(img, 0, 0, vs.w, vs.h);
				ctx.drawImage(paint, 0, 0, vs.w, vs.h);
			}, [viewSize]);
			(0, react.useEffect)(() => {
				if (ready) redraw();
			}, [ready, redraw]);
			const toPoint = (e) => {
				const view = viewRef.current;
				const paint = paintRef.current;
				const vs = viewSize;
				if (!view || !paint || !vs) return null;
				const rect = view.getBoundingClientRect();
				const sx = vs.w / Math.max(1, rect.width);
				const sy = vs.h / Math.max(1, rect.height);
				const img = imgRef.current;
				const w = img?.naturalWidth ?? paint.width;
				const h = img?.naturalHeight ?? paint.height;
				return {
					x: (e.clientX - rect.left) * sx * (w / vs.w),
					y: (e.clientY - rect.top) * sy * (h / vs.h)
				};
			};
			const strokeTo = (a, b) => {
				const paint = paintRef.current;
				const img = imgRef.current;
				const w = img?.naturalWidth ?? paint.width;
				const h = img?.naturalHeight ?? paint.height;
				if (paint.width !== w || paint.height !== h) {
					const prior = paint.width > 0 ? paint.toDataURL() : "";
					paint.width = w;
					paint.height = h;
					if (prior !== "") {
						const restore = new Image();
						restore.onload = () => {
							paint.getContext("2d")?.drawImage(restore, 0, 0);
						};
						restore.src = prior;
					}
				}
				const ctx = paint.getContext("2d");
				if (!ctx) return;
				const scale = Math.max(w, h) / 1024;
				ctx.strokeStyle = PAINT_STROKE_INK;
				ctx.lineWidth = brushSize * Math.max(scale, .25);
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.stroke();
				hasStrokesRef.current = true;
				setHasStrokes(true);
				redraw();
			};
			const onPointerDown = (e) => {
				if (e.button !== 0) return;
				const p = toPoint(e);
				if (!p) return;
				drawingRef.current = true;
				lastPtRef.current = p;
				e.target.setPointerCapture?.(e.pointerId);
				strokeTo(p, {
					x: p.x + .01,
					y: p.y + .01
				});
			};
			const onPointerMove = (e) => {
				if (!drawingRef.current) return;
				const p = toPoint(e);
				const last = lastPtRef.current;
				strokeTo(last, p);
				lastPtRef.current = p;
			};
			const onPointerUp = () => {
				if (!drawingRef.current) return;
				drawingRef.current = false;
				lastPtRef.current = null;
				if (!hasStrokesRef.current) return;
				onChange(paintRef.current.toDataURL("image/png"));
			};
			const clearPaint = () => {
				const paint = paintRef.current;
				const ctx = paint.getContext("2d");
				if (ctx) ctx.clearRect(0, 0, paint.width, paint.height);
				hasStrokesRef.current = false;
				setHasStrokes(false);
				redraw();
				onChange("");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-paint-leaf-canvas": "embedded",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 8
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 12
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6
								},
								children: [
									paintCopy.brushLabel,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										type: "range",
										"aria-label": paintCopy.brushSizeAria,
										min: 4,
										max: 128,
										step: 2,
										value: String(brushSize),
										onChange: (e) => {
											setBrushSize(Number(e.target.value));
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											width: 28,
											textAlign: "right"
										},
										children: brushSize
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									opacity: .7,
									fontSize: 12,
									flex: 1
								},
								children: hasStrokes ? paintCopy.strokesHint : paintCopy.paintHint
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								onClick: clearPaint,
								children: paintCopy.clearAction
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
						ref: viewRef,
						"data-testid": "paint-leaf-view",
						style: {
							display: viewSize === null ? "none" : "block",
							maxWidth: "100%",
							border: "1px solid var(--dsw-alias-border-l2)",
							borderRadius: 4,
							cursor: "crosshair",
							touchAction: "none",
							backgroundColor: "var(--dsw-alias-bg-base)",
							background: "repeating-conic-gradient(color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent) 0% 25%, transparent 0% 50%) 50% / 24px 24px"
						},
						onPointerDown,
						onPointerMove,
						onPointerUp,
						onPointerCancel: onPointerUp,
						onPointerLeave: onPointerUp
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
						ref: paintRef,
						style: { display: "none" },
						"data-testid": "paint-leaf-layer"
					})
				]
			});
		}
		//#endregion
		//#region ../../image/mask-studio/src/ui/BboxLeafCanvas.tsx
		const FIT = 640;
		const loadImage = (url) => new Promise((resolve) => {
			if (url === "") {
				resolve(null);
				return;
			}
			const img = new Image();
			img.onload = () => {
				resolve(img);
			};
			img.onerror = () => {
				resolve(null);
			};
			img.src = url;
		});
		function BboxLeafCanvas(props) {
			const { referenceUrl, value, onChange } = props;
			const viewRef = (0, react.useRef)(null);
			const imgRef = (0, react.useRef)(null);
			const drawingRef = (0, react.useRef)(false);
			const anchorRef = (0, react.useRef)(null);
			const [rect, setRect] = (0, react.useState)(null);
			const rectRef = (0, react.useRef)(null);
			const liveRect = (r) => {
				rectRef.current = r;
				setRect(r);
			};
			const [ready, setReady] = (0, react.useState)(false);
			const [viewSize, setViewSize] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				(async () => {
					const img = await loadImage(referenceUrl);
					if (!alive) return;
					imgRef.current = img;
					const w = img?.naturalWidth ?? 1024;
					const h = img?.naturalHeight ?? 1024;
					const scale = Math.min(FIT / w, FIT / h, 1);
					setViewSize({
						w: Math.max(1, Math.round(w * scale)),
						h: Math.max(1, Math.round(h * scale))
					});
					setReady(true);
				})();
				return () => {
					alive = false;
				};
			}, [referenceUrl]);
			const imgDims = (0, react.useCallback)(() => {
				const img = imgRef.current;
				return {
					w: img?.naturalWidth ?? 1024,
					h: img?.naturalHeight ?? 1024
				};
			}, []);
			const viewToImage = (0, react.useCallback)(() => {
				const vs = viewSize;
				const d = imgDims();
				return {
					sx: d.w / vs.w,
					sy: d.h / vs.h
				};
			}, [viewSize, imgDims]);
			const seededForRef = (0, react.useRef)("");
			(0, react.useEffect)(() => {
				if (!ready || value === null) return;
				const key = JSON.stringify(value);
				if (seededForRef.current === key) return;
				seededForRef.current = key;
				const { sx, sy } = viewToImage();
				liveRect({
					x: value.x / sx,
					y: value.y / sy,
					w: value.width / sx,
					h: value.height / sy
				});
			}, [
				ready,
				value,
				viewToImage
			]);
			const redraw = (0, react.useCallback)(() => {
				const view = viewRef.current;
				const vs = viewSize;
				if (!view || !vs) return;
				view.width = vs.w;
				view.height = vs.h;
				const ctx = view.getContext("2d");
				if (!ctx) return;
				ctx.clearRect(0, 0, vs.w, vs.h);
				const img = imgRef.current;
				if (img) ctx.drawImage(img, 0, 0, vs.w, vs.h);
				if (rect !== null) {
					ctx.strokeStyle = PAINT_STROKE_INK;
					ctx.lineWidth = 2;
					ctx.setLineDash([6, 4]);
					ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
					ctx.setLineDash([]);
				}
			}, [viewSize, rect]);
			(0, react.useEffect)(() => {
				if (ready) redraw();
			}, [ready, redraw]);
			const toView = (e) => {
				const view = viewRef.current;
				if (!view || !viewSize) return null;
				const r = view.getBoundingClientRect();
				return {
					x: (e.clientX - r.left) * (view.width / Math.max(1, r.width)),
					y: (e.clientY - r.top) * (view.height / Math.max(1, r.height))
				};
			};
			const onDown = (e) => {
				const p = toView(e);
				if (!p) return;
				drawingRef.current = true;
				anchorRef.current = p;
				liveRect({
					x: p.x,
					y: p.y,
					w: 0,
					h: 0
				});
				e.target.setPointerCapture?.(e.pointerId);
			};
			const onMove = (e) => {
				if (!drawingRef.current) return;
				const p = toView(e);
				const a = anchorRef.current;
				liveRect({
					x: Math.min(a.x, p.x),
					y: Math.min(a.y, p.y),
					w: Math.abs(p.x - a.x),
					h: Math.abs(p.y - a.y)
				});
			};
			const onUp = () => {
				if (!drawingRef.current) return;
				drawingRef.current = false;
				const box = rectRef.current;
				if (box === null || box.w < 1 || box.h < 1) return;
				const { sx, sy } = viewToImage();
				onChange({
					x: Math.round(box.x * sx),
					y: Math.round(box.y * sy),
					width: Math.round(box.w * sx),
					height: Math.round(box.h * sy)
				});
			};
			const clear = () => {
				liveRect(null);
				redraw();
				onChange(null);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-bbox-leaf-canvas": "embedded",
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 8
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("canvas", {
					ref: viewRef,
					"data-testid": "bbox-leaf-view",
					"data-bbox-canvas": "view",
					style: {
						maxWidth: "100%",
						cursor: "crosshair",
						touchAction: "none",
						borderRadius: 4,
						display: "block"
					},
					onPointerDown: onDown,
					onPointerMove: onMove,
					onPointerUp: onUp,
					onPointerCancel: onUp
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 8,
						alignItems: "center"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							opacity: .7,
							fontSize: 12,
							flex: 1
						},
						children: rect !== null && rect.w >= 1 && rect.h >= 1 ? paintCopy.bboxSize({
							w: rect.w,
							h: rect.h
						}) : paintCopy.bboxHint
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "ghost",
						onClick: clear,
						children: paintCopy.clearBoxAction
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/forms-edge-meta.ts
		/** forms-edge-meta.ts — the /v1/forms edge-meta session cache
		* (extracted from CardsTab.tsx hour 15: one seam, one file). */
		/** The /v1/forms edge-meta cache (card id → declared input/output
		*  kinds) — ONE fetch per browser session; the picker's kind
		*  matching (THE EDGE LAW) reads it. A failed fetch leaves null and
		*  the picker falls to the unfiltered list (never blocks a pick). */
		let formsEdgeMetaPromise = null;
		function loadFormsEdgeMeta() {
			formsEdgeMetaPromise ??= (0, _melite_card_base_client.fetchFormsTable)().then((rows) => {
				const out = {};
				for (const [id, row] of Object.entries(rows)) out[id] = {
					inputs: row.inputs,
					outputs: row.outputs
				};
				return out;
			}).catch((e) => {
				formsEdgeMetaPromise = null;
				throw e;
			});
			return formsEdgeMetaPromise;
		}
		//#endregion
		//#region src/client/stage-drill.tsx
		/** stage-drill.tsx — THE SHARED DRILLDOWN: the spec-formatted stage
		* editor, the zoom face, the preview seam consult (extracted from
		* CardsTab.tsx hour 15 — the biggest seam). */
		/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
		*  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
		*  groups, defaults); the drill renders THAT, never a raw key/value
		*  dump. Params left, Run right; the patch carries only CHANGED keys
		*  (coerced once, at patch time — the editPatch law); then the run
		*  gesture (patch lands in the domain BEFORE the run reads it). */
		/**
		* THE SCROLL LOCK (2026-09-21, the operator's law: 'whenever
		* progress updates, it jerks the view up' — every per-tick layout
		* change moved the scroller WITHOUT the user: img swaps, textarea
		* autogrow, seat churn, collapse-clamps). The scroller's position
		* is USER-OWNED: wheel/touch/keys record it; a layout effect after
		* EVERY update restores it when anything else moved it. The law
		* kills the whole mechanism class at the container, not per child.
		*/
		/** THE WALK DEDUP LAW (the landing-archive era), run-aware (the
		*  trail-defect hunt §5): identity is the artifact's run_id first —
		*  the server trail carries it, and one run can ride two url
		*  spellings (the media route and the gallery proxy) — with the url
		*  seat as the fallback. One seat per RUN, first-wins; order kept.
		*  THE URL SEAT IS CANONICAL (the 2026-11-02 audit's F6): two
		*  spellings of one artifact with NO run_id must collapse on the
		*  walk too — the seat compares canonicalOutputUrl (trail.ts's own
		*  resolver, the same identity the rail dedups on), never the raw
		*  url string (a second local spelling is how the walk lied). */
		function dedupWalkSet(items) {
			const seen = /* @__PURE__ */ new Set();
			const seenRuns = /* @__PURE__ */ new Set();
			return items.filter((a) => {
				if (a.runId !== void 0 && seenRuns.has(a.runId)) return false;
				const seat = canonicalOutputUrl(a.url);
				if (seen.has(seat)) return false;
				if (a.runId !== void 0) seenRuns.add(a.runId);
				seen.add(seat);
				return true;
			});
		}
		function ScrollLockedDetail(props) {
			const elRef = (0, react.useRef)(null);
			const userTop = (0, react.useRef)(null);
			const userOwned = (0, react.useRef)(false);
			const bind = (0, react.useCallback)((el) => {
				elRef.current = el;
				if (el === null) {
					userTop.current = null;
					return;
				}
				const own = () => {
					userOwned.current = true;
				};
				el.addEventListener("wheel", own, {
					passive: true,
					capture: true
				});
				el.addEventListener("touchmove", own, {
					passive: true,
					capture: true
				});
				el.addEventListener("keydown", own);
				el.addEventListener("scroll", () => {
					if (userOwned.current) {
						userOwned.current = false;
						userTop.current = el.scrollTop;
						return;
					}
					if (userTop.current !== null && el.scrollTop !== userTop.current) {
						const held = userTop.current;
						requestAnimationFrame(() => {
							el.scrollTop = held;
						});
					}
				}, { passive: true });
			}, []);
			return (0, react.createElement)("div", {
				className: card_module_css_default.zoomDetail,
				...props.testid !== void 0 ? { "data-testid": props.testid } : {},
				ref: bind
			}, props.children);
		}
		/** THE COMPOSE GATE'S VOICE (2026-09-29, the operator's law: a card
		*  IS its contract — an invalid doc is refused at COMPOSITION, never
		*  shipped to the door to be refused after the wire). The message is
		*  the door's OWN law text; the prefix names the plane that caught
		*  it. The studio still shows the edit (the same hopeful-overlay
		*  semantics the door-refusal always had), but NO frame leaves and
		*  the bench never receives a doc it would refuse. */
		/** THE MOD-BAG KEYS THE SERVED KINDS NAME (the re-point rescope's
		*  mod-currency clause, 2026-11-06): the DECL's mod bags ride
		*  features.modifiers' param_key — the card schema never declares
		*  them (image-gen serves one array node, reference_images), so the
		*  bag law's schema walk (bagKeysOf, card-base) cannot see them. A
		*  cross-model switch nulls these too: mods are per model, "if I
		*  switch model, keeping the lora on makes zero sense" (operator,
		*  2026-10-16). */
		function modBagKeys(doc) {
			return (doc.features?.modifiers ?? []).map((k) => k.param_key);
		}
		function composeGateRefusal(spec, held, user, frame) {
			if (spec === null) return null;
			const first = (0, _melite_card_base_client.composeValidate)(spec, (0, _melite_card_base_client.composeCandidateDoc)(held ?? {}, user, frame))[0];
			if (first === void 0) return null;
			return "THE COMPOSE GATE REFUSED — " + first.message + " — the write never left the studio. Fix the stated value, or pick a different route.";
		}
		function StageDrill({ stage, bench, running, onRun, onStop, onClose, onRemoved, onResync, onPatchParams, renderStageView, renderPreview, onSurface, runId, canRemove, bindRun, bindEnhance }) {
			String(stage.title ?? stage.card ?? stage.id);
			const held = typeof stage.params === "object" && stage.params !== null ? stage.params : {};
			const [spec, setSpec] = (0, react.useState)(null);
			const [user, setUser] = (0, react.useState)({});
			const [drillItem, setDrillItem] = (0, react.useState)(null);
			const [drillWalk, setDrillWalk] = (0, react.useState)([]);
			const [filmSeam] = (0, react.useState)(() => createFilmSeam());
			const [enhancing, setEnhancing] = (0, react.useState)(false);
			const [enhanceNote, setEnhanceNote] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [writeFace, setWriteFace] = (0, react.useState)(null);
			const [loaded, setLoaded] = (0, react.useState)(false);
			const reportSurface = onSurface ?? (() => {});
			const [removing, setRemoving] = (0, react.useState)(false);
			const others = bench.stages.filter((s) => s.id !== stage.id);
			const candidates = others.flatMap((s) => {
				const res = typeof s.result === "object" && s.result !== null ? s.result : null;
				const url = res !== null && typeof res["url"] === "string" && res["url"] !== "" ? res["url"] : "";
				return url === "" ? [] : [{
					id: s.id,
					label: String(s.title ?? s.card ?? s.id),
					url
				}];
			});
			const heldModelRaw = typeof stage.params === "object" && stage.params !== null ? stage.params["model"] : void 0;
			const benchModel = typeof heldModelRaw === "string" && heldModelRaw !== "" ? heldModelRaw : "";
			const userModelRaw = user["model"];
			const userModel = typeof userModelRaw === "string" && userModelRaw !== "" ? userModelRaw : "";
			const modelKey = userModel !== "" ? userModel : benchModel;
			const lastStageRef = (0, react.useRef)("");
			const touchedRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			const droppedRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				touchedRef.current = /* @__PURE__ */ new Set();
				droppedRef.current = /* @__PURE__ */ new Set();
			}, [stage.id]);
			const enhanceAbort = (0, react.useRef)(null);
			(0, react.useEffect)(() => () => {
				enhanceAbort.current?.abort();
			}, []);
			const userRef = (0, react.useRef)(user);
			userRef.current = user;
			const specRef = (0, react.useRef)(null);
			specRef.current = spec;
			const specFetchSeqRef = (0, react.useRef)(0);
			const pendingSpecRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				const freshOpen = lastStageRef.current !== stage.id;
				lastStageRef.current = stage.id;
				const cardId = String(stage.card ?? "");
				const family = cardId !== "" ? modelKey !== "" ? modelKey : cardId : String(stage.engine ?? "");
				if (family === "") {
					setLoaded(true);
					return;
				}
				const fetchSeq = specFetchSeqRef.current += 1;
				pendingSpecRef.current = {
					family,
					seq: fetchSeq
				};
				(0, _melite_card_base_client.fetchFormSpec)(family).then((doc) => {
					if (!alive) return;
					if (pendingSpecRef.current?.seq === fetchSeq) pendingSpecRef.current = null;
					setError(null);
					setSpec(doc);
					const seedSource = freshOpen ? held : userRef.current;
					const departing = specRef.current;
					const arrival = typeof doc.model === "string" ? doc.model : "";
					let rescope = {};
					if (!freshOpen && departing !== null && arrival !== "" && departing.model !== arrival) {
						rescope = (0, _melite_card_base_client.modelSwitchPatch)(departing, arrival, seedSource, doc);
						for (const k of modBagKeys(departing)) if (!(k in rescope)) rescope[k] = null;
					}
					const seeded = (0, _melite_card_base_client.seedUser)(doc, {
						...seedSource,
						...rescope
					});
					if (!freshOpen && departing !== null && departing.model !== arrival) {
						const arrivalFields = new Set((0, _melite_card_base_client.fieldsOf)(doc).map((f) => f.name));
						const axisKeys = new Set((0, _melite_card_base_client.axisGroups)(departing).map((g) => (0, _melite_card_base_client.axisKey)(g)));
						for (const f of (0, _melite_card_base_client.fieldsOf)(departing)) {
							if (f.name === "model" || axisKeys.has(f.name) || arrivalFields.has(f.name)) continue;
							if (f.name in rescope) continue;
							delete seeded[f.name];
						}
					}
					setUser(freshOpen ? seeded : (0, _melite_card_base_client.reseatEnvelopeKeys)(doc, seeded));
					for (const k of Object.keys(seedSource)) if (!(k in seeded)) droppedRef.current.add(k);
					if (freshOpen) {
						setWriteFace(null);
						setError(null);
						reconcileStageWriteFailures(bench.draftId, stage.id, held, seeded, new Set((0, _melite_card_base_client.fieldsOf)(doc).map((f) => f.name)));
					}
					setLoaded(true);
					reportSurface(doc.size === "huge" ? "huge" : "");
				}).catch((e) => {
					if (!alive) return;
					if (pendingSpecRef.current?.seq === fetchSeq) pendingSpecRef.current = null;
					setError((0, _melite_card_base_client.rejectionVoice)(e));
					setLoaded(true);
				});
				return () => {
					alive = false;
				};
			}, [stage.id, modelKey]);
			const [edgeMeta, setEdgeMeta] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				loadFormsEdgeMeta().then((m) => {
					if (alive) setEdgeMeta(m);
				}).catch((e) => {
					console.warn("[stage-drill] forms-edge meta unavailable:", e);
				});
				return () => {
					alive = false;
				};
			}, []);
			const candidatesFor = (0, react.useCallback)((f) => {
				if (spec === null || edgeMeta === null) return candidates;
				const edge = (spec.inputs ?? []).find((e) => e.name === f.name);
				if (edge === void 0) return candidates;
				const kind = edge.kind;
				const accepts = (out) => out !== void 0 && (out === kind || out + "_list" === kind);
				return candidates.filter((c) => {
					const row = others.find((s) => s.id === c.id);
					const cardId = String(row?.card ?? "");
					const outs = edgeMeta[cardId]?.outputs;
					return outs !== void 0 && Object.values(outs).some(accepts);
				});
			}, [
				spec,
				edgeMeta,
				candidates,
				others
			]);
			const rePointFrame = (frame) => {
				const m = frame["model"];
				if (spec === null || String(stage.card ?? "") === "") return frame;
				if (typeof m !== "string" || m === "" || m === (spec.model ?? "")) return frame;
				const merged = (0, _melite_card_base_client.mergeSwitchFrame)((0, _melite_card_base_client.modelSwitchPatch)(spec, m, (0, _melite_card_base_client.composeCandidateDoc)(held, user, {})), frame);
				for (const k of modBagKeys(spec)) if (!(k in merged)) merged[k] = null;
				return merged;
			};
			const onSet = (0, react.useCallback)((name, v) => {
				if (name === "model" && spec !== null && String(stage.card ?? "") !== "" && typeof v === "string" && v !== "" && v !== (spec.model ?? "")) {
					const rescoped = rePointFrame({ [name]: v });
					const landedM = {};
					const nullsM = {};
					for (const [k, kv] of Object.entries(rescoped)) if ((0, _melite_card_base_client.axisUnset)(k, kv, spec)) nullsM[k] = null;
					else landedM[k] = kv;
					for (const k of Object.keys(landedM)) touchedRef.current.add(k);
					for (const k of Object.keys(nullsM)) touchedRef.current.add(k);
					setUser((m) => {
						const next = { ...m };
						for (const k of Object.keys(nullsM)) delete next[k];
						return {
							...next,
							...landedM
						};
					});
					const frameM = {
						...landedM,
						...nullsM
					};
					const refusedM = composeGateRefusal(spec, stage.params, user, frameM);
					/* istanbul ignore if -- defense arm, provably unfireable
					(coverage disposition 2026-11-06): composeGateRefusal
					refuses a model re-point only when the departing spec's
					model is absent/empty, and the form-spec door emits
					`model ?? null` — never ''. Kept so the re-point stays
					refusal-gated if the door's emission drifts. */
					if (refusedM !== null) {
						setWriteFace(refusedM);
						return;
					}
					const settleDraftId = bench.draftId;
					const settleStageId = stage.id;
					patchStageParams(settleDraftId, settleStageId, frameM, bench.rev).then(() => {
						if (lastStageRef.current !== settleStageId) return;
						setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0 ? unlandedWriteVoice(settleDraftId, settleStageId) : null);
					}, () => {
						if (lastStageRef.current !== settleStageId) return;
						setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId));
					});
					return;
				}
				if ((0, _melite_card_base_client.axisUnset)(name, v, spec)) {
					touchedRef.current.add(name);
					setUser((m) => {
						const next = {};
						for (const [k, val] of Object.entries(m)) if (k !== name) next[k] = val;
						return next;
					});
					const refused = composeGateRefusal(spec, stage.params, user, { [name]: null });
					if (refused !== null) {
						setWriteFace(refused);
						return;
					}
					const settleDraftId = bench.draftId;
					const settleStageId = stage.id;
					scheduleStageParam(settleDraftId, settleStageId, name, null, bench.rev).then(() => {
						if (lastStageRef.current !== settleStageId) return;
						setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0 ? unlandedWriteVoice(settleDraftId, settleStageId) : null);
					});
					return;
				}
				touchedRef.current.add(name);
				setUser((m) => ({
					...m,
					[name]: v
				}));
				/* v8 ignore next 1 -- single-render law: CardForm renders only when spec is non-null (probe 2026-09-19) */
				const shape2 = spec !== null ? (0, _melite_card_base_client.fieldsOf)(spec).find((f) => f.name === name)?.type : void 0;
				/* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19). image_list rides the slot flush below (THE STACK GESTURE LAW, 2026-10-13: an upload onto a stack is as discrete as a slot pick — the trailing write's delay let a close-before-flush drop it) */
				if (shape2 !== "image" && shape2 !== "file" && shape2 !== "mesh" && shape2 !== "image_list") {
					const refused = composeGateRefusal(spec, stage.params, user, { [name]: v });
					if (refused !== null) {
						setWriteFace(refused);
						return;
					}
					const settleDraftId = bench.draftId;
					const settleStageId = stage.id;
					scheduleStageParam(settleDraftId, settleStageId, name, v, bench.rev).then(() => {
						if (lastStageRef.current !== settleStageId) return;
						setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0 ? unlandedWriteVoice(settleDraftId, settleStageId) : null);
					});
				}
				/* v8 ignore next 1 -- single-render law: CardForm renders only when spec is non-null (probe 2026-09-19) */
				const shape = spec !== null ? (0, _melite_card_base_client.fieldsOf)(spec).find((f) => f.name === name)?.type : void 0;
				/* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19) */
				if (shape === "image" || shape === "file" || shape === "mesh" || shape === "image_list") {
					const slotEmpty = v === "" || Array.isArray(v) && v.length === 0;
					const slotFrame = slotEmpty ? { [name]: null } : { [name]: v };
					const refused = composeGateRefusal(spec, stage.params, user, slotFrame);
					if (refused !== null) {
						setWriteFace(refused);
						return;
					}
					const settleDraftId = bench.draftId;
					const settleStageId = stage.id;
					patchStageParams(settleDraftId, settleStageId, slotEmpty ? { [name]: null } : { [name]: v }, bench.rev).catch((e) => {
						if (lastStageRef.current !== settleStageId) return;
						setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId));
					});
				}
			}, [
				spec,
				user,
				bench.draftId,
				bench.rev,
				stage.id
			]);
			const onPick = (0, react.useCallback)((patch) => {
				const rescoped = rePointFrame(patch);
				const landed = {};
				const nulls = {};
				for (const [k, v] of Object.entries(rescoped)) if ((0, _melite_card_base_client.axisUnset)(k, v, spec)) nulls[k] = null;
				else landed[k] = v;
				setUser((m) => {
					const next = { ...m };
					for (const k of Object.keys(nulls)) delete next[k];
					return {
						...next,
						...landed
					};
				});
				for (const k of Object.keys(landed)) touchedRef.current.add(k);
				for (const k of Object.keys(nulls)) touchedRef.current.add(k);
				const frame = {
					...landed,
					...nulls
				};
				const refused = composeGateRefusal(spec, stage.params, user, frame);
				if (refused !== null) {
					setWriteFace(refused);
					return;
				}
				const settleDraftId = bench.draftId;
				const settleStageId = stage.id;
				patchStageParams(settleDraftId, settleStageId, frame, bench.rev).then(() => {
					if (lastStageRef.current !== settleStageId) return;
					setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0 ? unlandedWriteVoice(settleDraftId, settleStageId) : null);
				}, () => {
					if (lastStageRef.current !== settleStageId) return;
					setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId));
				});
			}, [
				spec,
				user,
				bench.draftId,
				bench.rev,
				stage.id
			]);
			const onUnset = (0, react.useCallback)((name) => {
				touchedRef.current.add(name);
				setUser((m) => {
					if (!Object.prototype.hasOwnProperty.call(m, name)) return m;
					const next = {};
					for (const [k, v] of Object.entries(m)) if (k !== name) next[k] = v;
					return next;
				});
				/* v8 ignore next 1 -- single-render law: CardForm renders only when spec is non-null (probe 2026-09-19) */
				const shape = spec !== null ? (0, _melite_card_base_client.fieldsOf)(spec).find((f) => f.name === name)?.type : void 0;
				/* v8 ignore next 4 -- the tri-state atoms unset only from slot shapes; these atoms are never slots (probe 2026-09-19) */
				if (shape === "image" || shape === "file" || shape === "mesh") {
					const refused = composeGateRefusal(spec, stage.params, user, { [name]: null });
					if (refused !== null) {
						setWriteFace(refused);
						return;
					}
					const settleDraftId = bench.draftId;
					const settleStageId = stage.id;
					patchStageParams(settleDraftId, settleStageId, { [name]: null }, bench.rev).catch((e) => {
						if (lastStageRef.current !== settleStageId) return;
						setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId));
					});
				}
			}, [
				spec,
				user,
				bench.draftId,
				bench.rev,
				stage.id
			]);
			const servedBase = typeof stage.resolved === "object" && stage.resolved !== null && !Array.isArray(stage.resolved) ? stage.resolved : void 0;
			const value = (0, _melite_card_base_client.resolveValue)(spec ?? { form: "" }, user, servedBase);
			const enhance = async () => {
				/* v8 ignore next 4 -- zoom.tsx serializes enhance to one flight (probe 2026-09-19): re-entry never observes enhancing=true */
				if (enhancing) {
					setEnhanceNote({
						err: true,
						text: chromeCopy.enhanceAlreadyRunning
					});
					return;
				}
				const current = String(value["prompt"] ?? "").trim();
				if (current === "") {
					setEnhanceNote({
						err: true,
						text: chromeCopy.enhanceEmptyPrompt
					});
					return;
				}
				const model = String(spec?.model ?? held["model"] ?? "");
				if (model === "") {
					setEnhanceNote({
						err: true,
						text: chromeCopy.enhanceNoModel
					});
					return;
				}
				setEnhancing(true);
				setEnhanceNote(null);
				enhanceAbort.current?.abort();
				const flight = new AbortController();
				enhanceAbort.current = flight;
				const callEnhance = async (llm) => {
					const res = await fetch("/melite-tools/enhance", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							model,
							prompt: current,
							...llm !== void 0 ? { llm } : {}
						}),
						signal: flight.signal
					});
					if (flight.signal.aborted) throw new DOMException("The enhance was aborted", "AbortError");
					const raw = await res.text();
					let doc = {};
					try {
						doc = JSON.parse(raw);
					} catch {}
					if (!res.ok || typeof doc.error === "string") throw new Error(typeof doc.error === "string" ? doc.error : "enhance failed (" + res.status + (raw.length > 0 && raw.length < 200 ? ": " + raw : "") + ")");
					return {
						res,
						raw,
						doc
					};
				};
				try {
					const llm = cardLlmArg();
					let answered;
					try {
						answered = await callEnhance(llm);
					} catch (e) {
						if (!(e instanceof Error && e.message.startsWith("enhance: unknown llm route") && llm !== void 0 && e.message.includes("\"" + llm + "\""))) throw e;
						setCardLlm(null);
						answered = await callEnhance(void 0);
					}
					const { doc } = answered;
					const results = doc.results ?? {};
					const declared = new Set(spec !== null ? (0, _melite_card_base_client.fieldsOf)(spec).map((f) => f.name) : []);
					const sweptPatch = {};
					const fieldByName = new Map(spec !== null ? (0, _melite_card_base_client.fieldsOf)(spec).map((f) => [f.name, f]) : []);
					for (const [field, r] of Object.entries(results)) {
						if (typeof r?.positive !== "string" || r.positive === "") continue;
						if (field === "prompt" || declared.has(field)) sweptPatch[field] = (0, _melite_card_base_client.coerceFieldEdit)(fieldByName.get(field), r.positive);
						if (field === "prompt" && declared.has("negative_prompt") && typeof r.negative === "string" && r.negative !== "") sweptPatch["negative_prompt"] = (0, _melite_card_base_client.coerceFieldEdit)(fieldByName.get("negative_prompt"), r.negative);
					}
					setUser((m) => ({
						...m,
						...sweptPatch
					}));
					if (Object.keys(sweptPatch).length > 0) {
						const refused = composeGateRefusal(spec, stage.params, user, sweptPatch);
						if (refused !== null) {
							setWriteFace(refused);
							return;
						}
						const settleDraftId = bench.draftId;
						const settleStageId = stage.id;
						patchStageParams(settleDraftId, settleStageId, sweptPatch, bench.rev).then(() => {
							if (lastStageRef.current !== settleStageId) return;
							setWriteFace(stageWriteState(settleDraftId, settleStageId).failedKeys.length > 0 ? unlandedWriteVoice(settleDraftId, settleStageId) : null);
						}).catch((e) => {
							if (lastStageRef.current !== settleStageId) return;
							setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId));
						});
					}
					const swept = Object.keys(sweptPatch).length;
					if (swept === 0) setEnhanceNote({
						err: true,
						text: chromeCopy.enhanceNoFields({ fields: Object.keys(results).join(", ") })
					});
					else {
						const via = Object.values(results)[0]?.via;
						setEnhanceNote({
							err: false,
							text: typeof via === "string" && via !== "" ? chromeCopy.enhancedVia({
								via,
								count: swept
							}) : chromeCopy.enhancedCount({ count: swept })
						});
					}
				} catch (e) {
					setEnhanceNote({
						err: true,
						text: (0, _melite_card_base_client.rejectionVoice)(e)
					});
				} finally {
					setEnhancing(false);
				}
			};
			const wire = {
				candidates,
				candidatesFor,
				loadMedia: _melite_card_base_client.fetchMediaLibrary
			};
			const run = async () => {
				setError(null);
				try {
					const pending = pendingSpecRef.current;
					if (pending !== null) {
						setError(`the ${pending.family} spec is still settling — press Run again once the form lands`);
						return;
					}
					const patch = {};
					const userKeys = new Set(Object.keys(user));
					const heldKeys = new Set(Object.keys(held));
					for (const k of userKeys) if (touchedRef.current.has(k)) patch[k] = user[k];
					for (const k of heldKeys) if (!userKeys.has(k) && (touchedRef.current.has(k) || droppedRef.current.has(k))) patch[k] = null;
					const sameAsHeld = Object.keys(patch).length > 0 && Object.entries(patch).every(([k, v]) => heldKeys.has(k) && Object.is(held[k], v));
					if (Object.keys(patch).length > 0 && !sameAsHeld) {
						const baseAfterSync = { ...held };
						for (const [k, v] of Object.entries(patch)) if (v === null) delete baseAfterSync[k];
						else baseAfterSync[k] = v;
						const refused = composeGateRefusal(spec, baseAfterSync, user, {});
						if (refused !== null) {
							setError(refused);
							return;
						}
						try {
							await patchStageParams(bench.draftId, stage.id, patch, bench.rev);
						} catch {
							setError(unlandedWriteVoice(bench.draftId, stage.id));
							onResync?.();
							return;
						}
					}
					const fence = await refuseForUnlandedWrite(bench.draftId, stage.id);
					if (fence !== null) {
						setError(fence);
						return;
					}
					onRun();
				} catch (e) {
					setError((0, _melite_card_base_client.rejectionVoice)(e));
					onResync?.();
				}
			};
			const runRef = (0, react.useRef)(run);
			runRef.current = run;
			(0, react.useEffect)(() => {
				bindRun?.(() => {
					runRef.current();
				});
			}, [bindRun]);
			const enhanceRef = (0, react.useRef)(enhance);
			enhanceRef.current = enhance;
			(0, react.useEffect)(() => {
				bindEnhance?.(() => enhanceRef.current());
			}, [bindEnhance]);
			const remove = async () => {
				setError(null);
				setRemoving(true);
				try {
					await removeStageWire({
						stage: stage.id,
						expect_rev: bench.rev
					}, bench.sessionKey);
					forgetStageWrites(bench.draftId, [stage.id]);
					onRemoved();
				} catch (e) {
					setError((0, _melite_card_base_client.rejectionVoice)(e));
					setRemoving(false);
					onResync?.();
				}
			};
			if (stage.card === "group") {
				const members = Array.isArray(stage.children) ? stage.children.filter((c) => typeof c === "object" && c !== null && typeof Reflect.get(c, "id") === "string") : [];
				const ungroup = async () => {
					setError(null);
					setRemoving(true);
					try {
						await ungroupStageWire({
							stage: stage.id,
							expect_rev: bench.rev
						}, bench.sessionKey);
						onRemoved();
					} catch (e) {
						setError((0, _melite_card_base_client.rejectionVoice)(e));
						setRemoving(false);
						onResync?.();
					}
				};
				return (0, react.createElement)(ScrollLockedDetail, null, (0, react.createElement)("p", { className: card_module_css_default.groupNote }, "A compound of " + String(members.length) + " stages. Ungroup restores them at this position."), (0, react.createElement)("ol", { className: card_module_css_default.memberList }, members.map((m, i) => (0, react.createElement)("li", {
					key: m.id,
					className: card_module_css_default.memberRow
				}, (0, react.createElement)("span", { className: card_module_css_default.memberIdx }, String(i + 1) + "."), (0, react.createElement)("span", { className: card_module_css_default.memberName }, String(m.title ?? m.card ?? m.id))))), (0, react.createElement)("div", { className: card_module_css_default.runRow }, error !== null ? (0, react.createElement)("span", { className: card_module_css_default.runError }, error, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "ghost",
					className: card_module_css_default.errorDismiss,
					"aria-label": chromeCopy.dismissError,
					onClick: () => {
						setError(null);
					}
				}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					disabled: removing,
					onClick: () => {
						ungroup();
					}
				}, removing ? chromeCopy.ungroupingWord : chromeCopy.ungroupWord)));
			}
			const stageArtifacts = () => {
				const rowArtifacts = previewArtifactsFor(stage);
				if (rowArtifacts.length > 0) return rowArtifacts;
				const head = (Array.isArray(stage.history) ? stage.history : [])[0];
				return head !== void 0 ? previewArtifactsFor({ result: head }) : [];
			};
			const drillItemOf = (a, kind) => ({
				kind: kind === "mesh" ? "model" : kind,
				url: a.url,
				/* v8 ignore next 1 -- split('/').pop() is never undefined on a non-empty url (probe 2026-09-19) */
				file: a.name !== "" && a.name !== "output" ? a.name : a.url.split("/").pop() ?? a.url,
				head: String(stage.title ?? stage.card ?? stage.id),
				time: ""
			});
			const stagePreview = () => {
				if (renderPreview === void 0) return null;
				const artifacts = stageArtifacts();
				const heroUrl = artifacts[0]?.url ?? "";
				const kind = primaryKindFor(spec, heroUrl);
				if (kind === null) return null;
				const historyRows = trailDedupe(Array.isArray(stage["history"]) ? stage["history"] : []);
				const liveParams = stage.params;
				const pairs = historyRows.map((e) => ({
					arts: previewArtifactsFor({ result: e }),
					note: paramsDiffKeys(e["params"], liveParams) ?? ""
				})).filter((p) => p.arts.length > 0);
				const history = pairs.map((p) => p.arts);
				const noteList = pairs.map((p) => p.note);
				const historyNotes = noteList.some((n) => n !== "") ? noteList : void 0;
				const owner = {
					kind,
					artifacts,
					runStatus: typeof stage.runStatus === "string" ? stage.runStatus : "",
					stageId: stage.id,
					runId: String(stage["result"]?.run_id ?? ""),
					...history.length > 0 ? { history } : {},
					...historyNotes !== void 0 ? { historyNotes } : {},
					...spec?.preview?.historyStrip === false ? { historyStrip: false } : {},
					...spec?.preview?.figure !== void 0 ? { figure: {
						identityModel: spec.preview.figure.identityModel,
						...(0, _melite_card_base_client.figureCoeffsOf)(spec, value) !== null ? { identityCoeffs: (0, _melite_card_base_client.figureCoeffsOf)(spec, value) } : {},
						...(0, _melite_card_base_client.figureLocalChangesOf)(spec, value) !== null ? { localChanges: (0, _melite_card_base_client.figureLocalChangesOf)(spec, value) } : {},
						...(0, _melite_card_base_client.figureCameraOf)(spec, value)
					} } : {},
					...(0, _melite_card_base_client.attachedMeshOf)(spec, value) !== null ? { attachedMesh: (0, _melite_card_base_client.attachedMeshOf)(spec, value) } : {},
					...(0, _melite_card_base_client.attachedImageOf)(spec, value) !== null ? { attachedImage: (0, _melite_card_base_client.attachedImageOf)(spec, value) } : {}
				};
				const fallback = kind === "video" && seamFilmUrl !== null ? (0, react.createElement)(FilmSeamPlayer, {
					seam: filmSeam,
					src: seamFilmUrl
				}) : kind === "video" ? (0, react.createElement)(_melite_card_base_client.VideoStagePreview, owner) : kind === "audio" ? (0, react.createElement)(_melite_card_base_client.AudioStagePreview, owner) : kind === "mesh" ? (0, react.createElement)(_melite_card_base_client.MeshStagePreview, owner) : kind === "text" ? (0, react.createElement)(_melite_card_base_client.TextStagePreview, owner) : (0, react.createElement)(_melite_card_base_client.ImageStagePreview, owner);
				if ((owner.figure !== void 0 || owner.attachedMesh !== void 0 || owner.attachedImage !== void 0) && artifacts.length === 0) return renderPreview(owner, (0, react.createElement)(_melite_card_base_client.MeshStagePreview, owner));
				return renderPreview(owner, fallback);
			};
			const activity = typeof stage.activity === "string" ? stage.activity : "";
			const progress = stage.progress ?? null;
			const pct = progress !== null && progress.max > 0 ? Math.floor(100 * progress.value / progress.max) : null;
			const webhookFeed = (0, react.createElement)("div", {
				className: card_module_css_default.runRow,
				"data-testid": "drill-webhooks"
			}, activity !== "" ? (0, react.createElement)("span", {
				className: card_module_css_default.tilePct,
				"aria-label": chromeCopy.engineActivity
			}, activity) : null, progress !== null && pct !== null ? (0, react.createElement)("span", {
				className: card_module_css_default.tilePct,
				"data-testid": "drill-progress",
				"aria-label": chromeCopy.progressPercent
			}, pct + "% (" + String(progress.value) + "/" + String(progress.max) + ")") : null);
			const seamFilmUrl = spec?.preview?.timeline === true ? previewArtifactsFor(stage).find((a) => primaryKindFor(spec, a.url) === "video")?.url ?? null : null;
			const genericDetail = () => (0, react.createElement)(ScrollLockedDetail, null, webhookFeed, (0, react.createElement)(_melite_card_base_client.StudioShell, {
				bottom: seamFilmUrl !== null ? (0, react.createElement)(ScrollLockedDetail, { testid: "timeline-seam-bottom" }, (0, react.createElement)(FilmSeamBar, { seam: filmSeam })) : void 0,
				params: (0, react.createElement)("div", { className: card_module_css_default.paramsCol }, enhanceNote !== null ? (0, react.createElement)("div", {
					className: card_module_css_default.enhanceRow,
					"data-testid": "enhance-note"
				}, (0, react.createElement)("span", { className: enhanceNote.err ? card_module_css_default.runError : card_module_css_default.enhanceNote }, enhanceNote.text, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "ghost",
					className: card_module_css_default.errorDismiss,
					"aria-label": chromeCopy.dismissError,
					onClick: () => {
						setEnhanceNote(null);
					}
				}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })))) : null, (0, react.createElement)("div", { className: card_module_css_default.params }, !loaded ? (0, react.createElement)("div", { className: card_module_css_default.load }, "form…") : spec !== null ? (0, react.createElement)(_melite_card_base_client.CardForm, {
					spec,
					user,
					base: servedBase,
					onSet,
					onPick,
					onUnset,
					wire,
					onPatch: onPatchParams,
					onDownloadModel: (id) => (0, _melite_card_base_client.postManageAction)("provision_model", { model: id }).then((r) => r.ok),
					onInstallPack: (id) => (0, _melite_card_base_client.postManageAction)("install_extension", { nodes: [id] }).then((r) => r.ok),
					paintFace: PaintLeafCanvas,
					bboxFace: BboxLeafCanvas,
					paintReference: "input_image"
				}) : (0, react.createElement)("pre", { className: card_module_css_default.mono }, JSON.stringify(held, null, 2))), error !== null ? (0, react.createElement)("div", { className: card_module_css_default.drillRunRow }, (0, react.createElement)("span", { className: card_module_css_default.runError }, error, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "ghost",
					className: card_module_css_default.errorDismiss,
					"aria-label": chromeCopy.dismissError,
					onClick: () => {
						setError(null);
					}
				}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })))) : null, writeFace !== null ? (0, react.createElement)("div", { className: card_module_css_default.drillRunRow }, (0, react.createElement)("span", {
					className: card_module_css_default.runError,
					"data-testid": "stage-write-face"
				}, writeFace, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "ghost",
					className: card_module_css_default.errorDismiss,
					"aria-label": chromeCopy.dismissError,
					onClick: () => {
						setWriteFace(null);
					}
				}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 })))) : null),
				preview: (0, react.createElement)("div", { className: card_module_css_default.outputs }, (0, react.createElement)("div", {
					className: card_module_css_default.outputsPreview + " " + card_module_css_default.previewClickable,
					"data-testid": "stage-preview-seat",
					role: "button",
					tabIndex: 0,
					"aria-label": chromeCopy.openMediaDrilldown,
					onClick: () => {
						const artifacts = stageArtifacts();
						const hero = artifacts[0];
						if (hero === void 0) return;
						const kind = primaryKindFor(spec, hero.url);
						if (kind === null) return;
						const past = (Array.isArray(stage["history"]) ? stage["history"] : []).flatMap((e) => {
							const row = e;
							const runId = typeof row?.["run_id"] === "string" ? row["run_id"] : void 0;
							return previewArtifactsFor({ result: e }).map((a) => ({
								...a,
								runId
							}));
						});
						const walk = dedupWalkSet([...artifacts, ...past]).map((a) => drillItemOf(a, kind));
						setDrillWalk(walk);
						setDrillItem(drillItemOf(hero, kind));
					},
					onKeyDown: (e) => {
						const ke = e;
						if (ke.key === "Enter" || ke.key === " ") {
							ke.stopPropagation();
							e.target.click();
						}
					}
				}, stagePreview() ?? (0, react.createElement)("div", { className: card_module_css_default.outputsHint }, running ? "rendering… the preview lands here" : "run lands the preview here")), drillItem !== null ? (0, react.createElement)(MediaDrilldown, {
					item: drillItem,
					onClose: () => {
						setDrillItem(null);
						setDrillWalk([]);
					},
					siblings: drillWalk,
					onNavigate: (next) => {
						setDrillItem(next);
					}
				}) : null, (() => {
					const reports = previewReportsFor(stage);
					return reports.length > 0 ? (0, react.createElement)("div", {
						className: card_module_css_default.reportList,
						"data-testid": "stage-reports"
					}, reports.map(({ name, report }) => (0, react.createElement)(_melite_card_base_client.ReportView, {
						key: name,
						name,
						report
					}))) : null;
				})())
			}));
			const currentStageIndex = bench.stages.findIndex((candidate) => candidate.id === stage.id);
			const priorStageIds = currentStageIndex < 0 ? [] : bench.stages.slice(0, currentStageIndex).map((candidate) => candidate.id);
			return renderStageView({
				stageId: stage.id,
				hasUnsettledWrites: () => {
					const writeState = stageWriteState(bench.draftId, stage.id);
					return writeState.pending > 0 || writeState.failedKeys.length > 0;
				},
				cardName: String(stage.card ?? ""),
				row: stage,
				runStatus: typeof stage.runStatus === "string" ? stage.runStatus : "",
				onPatch: onPatchParams,
				onWireSlot: (slotKey, upstreamId) => {
					const candidate = upstreamId === null ? void 0 : candidates.find((entry) => entry.id === upstreamId);
					if (upstreamId !== null && candidate === void 0) {
						setError(`wire source is no longer on the bench: ${upstreamId}`);
						return;
					}
					const settleDraftId = bench.draftId;
					const settleStageId = stage.id;
					patchStageParams(settleDraftId, settleStageId, { [slotKey]: candidate !== void 0 ? candidate.url : null }, bench.rev).catch((wireError) => {
						if (lastStageRef.current !== settleStageId) return;
						setWriteFace(unlandedWriteVoice(settleDraftId, settleStageId));
					});
				},
				onRun,
				onStop,
				bindRun: (r) => {
					bindRun?.(r);
				},
				onRemove: () => {
					remove();
				},
				onSurface: reportSurface,
				upstream: candidates.map((c) => ({
					id: c.id,
					title: c.label,
					url: c.url
				})),
				runId: runId ?? null,
				effective: {
					model: modelKey !== "" ? modelKey : String(stage.card ?? stage.engine ?? ""),
					params: {
						...held,
						...user
					},
					inputSlots: (spec?.inputs ?? []).map((input) => input.name)
				},
				priorStageIds
			}, genericDetail());
		}
		//#endregion
		//#region src/client/add-card-door.tsx
		/** add-card-door.tsx — THE PLAIN DOOR: the picker whose pick IS the
		* add (extracted from CardsTab.tsx hour 15). */
		/** THE ADD-CARD DOOR (the old system's power, DSH-native): the trailing
		*  + tile → the picker (the catalog's action cards, search + genre
		*  groups) → the card's DECLARED form (defaults seeded) → bench/add-stage
		*  as the user (CAS-chained). ONE surface: action cards; models are not
		*  entries (the model select lives ON the card's form). */
		function AddCardDoor({ bench, sessionKey, onAdded, onClose, onAddedRow }) {
			const [cards, setCards] = (0, react.useState)(null);
			const [catalogError, setCatalogError] = (0, react.useState)(null);
			const [query, setQuery] = (0, react.useState)("");
			const [busyId, setBusyId] = (0, react.useState)(null);
			const [addError, setAddError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				(0, _melite_card_base_client.fetchCardCatalog)().then((list) => {
					if (alive) setCards(list);
				}).catch((e) => {
					if (alive) setCatalogError((0, _melite_card_base_client.rejectionVoice)(e));
				});
				return () => {
					alive = false;
				};
			}, []);
			const pick = (card) => {
				if (busyId !== null) return;
				setBusyId(card.id);
				setAddError(null);
				const family = card.families[0] ?? card.id;
				(0, _melite_card_base_client.fetchFormSpec)(family).then((doc) => add(card, doc), (e) => {
					setBusyId(null);
					setAddError(card.label + ": " + (0, _melite_card_base_client.rejectionVoice)(e));
				});
			};
			const add = async (picked, spec) => {
				try {
					const doc = {
						card: picked.id,
						author: "user",
						expect_rev: bench.rev
					};
					const seeds = (0, _melite_card_base_client.seedRecipeStamp)(spec, (0, _melite_card_base_client.seedUser)(spec, {}));
					if (Object.keys(seeds).length > 0) doc["params"] = { ...seeds };
					await addStageWire(doc, sessionKey);
					setBusyId(null);
					try {
						const before = new Set(bench.stages.map((r) => r.id));
						const fresh = (await fetchBench(sessionKey)).stages.find((r) => !before.has(r.id)) ?? null;
						if (fresh !== null && onAddedRow !== void 0) onAddedRow(fresh);
						else onAdded();
					} catch {
						onAdded();
					}
				} catch (e) {
					setBusyId(null);
					setAddError(picked.label + ": " + (0, _melite_card_base_client.rejectionVoice)(e));
				}
			};
			const filtered = (cards ?? []).filter((c) => {
				if (query === "") return true;
				const q = query.toLowerCase();
				return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q);
			});
			const genres = [];
			for (const c of filtered) {
				const g0 = c.genre !== "" ? c.genre : "other";
				const g = g0 === "motion" ? "3d" : g0;
				const known = genres.find((x) => x[0] === g);
				if (known === void 0) genres.push([g, [c]]);
				else known[1].push(c);
			}
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: chromeCopy.addCard,
				closeLabel: chromeCopy.closePicker,
				className: card_module_css_default.drill
			}, (0, react.createElement)("div", { className: card_module_css_default.picker }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: query,
				placeholder: chromeCopy.searchPlaceholder,
				onChange: (e) => setQuery(e.target.value),
				"aria-label": chromeCopy.searchAria
			}), catalogError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, catalogError) : null, addError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, addError) : null, cards === null && catalogError === null ? (0, react.createElement)("div", { className: card_module_css_default.load }, "cards…") : null, genres.map(([g, list]) => (0, react.createElement)("section", {
				key: g,
				className: card_module_css_default.pickerGenre
			}, (0, react.createElement)("h4", { className: card_module_css_default.pickerGenreTitle }, (0, _melite_card_base_client.titleCaseId)(g)), list.map((c) => (0, react.createElement)("button", {
				key: c.id,
				type: "button",
				className: card_module_css_default.pickerCard,
				disabled: busyId !== null,
				title: c.description !== "" ? c.label + " — " + c.description : c.label,
				onClick: () => pick(c)
			}, (0, react.createElement)("span", { className: card_module_css_default.pickerCardLabel }, busyId === c.id ? "adding…" : c.label)))))));
		}
		//#endregion
		//#region src/client/bench-view.tsx
		/** bench-view.tsx — the bench user plane: the grouped tiles, the
		* reorder/group gestures, the drop zones (extracted from CardsTab.tsx
		* hour 15). */
		/** THE SAVE DIAL (audit V-E7): the ensure door wait is bounded —
		*  a hung bench door releases the busy fence instead of holding the
		*  save spinner forever. */
		const SAVE_DIAL_MS = 2e4;
		function BenchView({ bench, sessionKey, onRun, onRunStage, onStopStage, onRemoveStage, stageRuns, running, onPatchParams, renderStageView, renderPreview, runId, refreshTick, startError, onDrillClose }) {
			const [live, setLive] = (0, react.useState)(bench);
			(0, react.useEffect)(() => {
				setLive(bench);
			}, [bench.draftId, bench.rev]);
			const knownIds = (0, react.useRef)(new Set(bench.stages.map((s) => s.id)));
			const [entered, setEntered] = (0, react.useState)(/* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				const fresh = [];
				for (const s of live.stages) if (!knownIds.current.has(s.id)) {
					knownIds.current.add(s.id);
					fresh.push(s.id);
				}
				if (fresh.length > 0) setEntered((prev) => {
					const next = new Set(prev);
					for (const id of fresh) next.add(id);
					return next;
				});
			}, [live.stages]);
			const [open, setOpen] = (0, react.useState)(null);
			const [adding, setAdding] = (0, react.useState)(false);
			const labelOf = useCardLabels();
			const [reloadError, setReloadError] = (0, react.useState)(null);
			const mountAbort = (0, react.useRef)(null);
			if (mountAbort.current === null) mountAbort.current = new AbortController();
			(0, react.useEffect)(() => () => {
				mountAbort.current?.abort();
			}, []);
			const attachingRef = (0, react.useRef)(false);
			const saveBusyRef = (0, react.useRef)(false);
			const [clearing, setClearing] = (0, react.useState)(false);
			const clearFlight = (0, react.useRef)(false);
			const onOpen = (0, react.useCallback)((stage) => setOpen(stage), []);
			const onDrillCloseRef = (0, react.useRef)(onDrillClose);
			onDrillCloseRef.current = onDrillClose;
			const closeDrill = (0, react.useCallback)(() => {
				setOpen(null);
				onDrillCloseRef.current?.();
			}, []);
			const onClose = closeDrill;
			const onAddCard = (0, react.useCallback)(() => setAdding(true), []);
			(0, react.useEffect)(() => {
				if (refreshTick !== void 0 && refreshTick > 0) reload({ keepOpen: true });
			}, [refreshTick]);
			const reload = (0, react.useCallback)((opts) => {
				setReloadError(null);
				fetchBench(sessionKey, mountAbort.current?.signal).then((next) => {
					setLive(next);
					if (opts?.keepOpen === true) setOpen((cur) => cur === null ? null : next.stages.find((s) => s.id === cur.id) ?? null);
					else closeDrill();
				}).catch((e) => {
					if (mountAbort.current?.signal.aborted === true) return;
					setReloadError((0, _melite_card_base_client.rejectionVoice)(e));
				});
			}, [sessionKey]);
			const onClear = (0, react.useCallback)(() => {
				if (clearFlight.current) return;
				if (!clearing) {
					setClearing(true);
					return;
				}
				setClearing(false);
				clearFlight.current = true;
				setReloadError(null);
				clearBenchWire({ expect_rev: live.rev }, sessionKey).then(() => {
					forgetDraftWrites(live.draftId);
					closeDrill();
					reload();
				}).catch((e) => {
					setReloadError("clear refused — " + (0, _melite_card_base_client.rejectionVoice)(e));
				}).finally(() => {
					clearFlight.current = false;
				});
			}, [
				clearing,
				live.rev,
				live.draftId,
				sessionKey,
				reload
			]);
			const canUndo = live.log.some((e) => typeof e.kind === "string" && e.kind !== "undo");
			const [undoing, setUndoing] = (0, react.useState)(false);
			const onUndo = (0, react.useCallback)(() => {
				if (undoing) return;
				setUndoing(true);
				setReloadError(null);
				undoBenchWire({ expect_rev: live.rev }, sessionKey).then(() => {
					forgetDraftWrites(live.draftId);
					closeDrill();
					reload();
				}).catch((e) => {
					setReloadError("undo refused — " + (0, _melite_card_base_client.rejectionVoice)(e));
				}).finally(() => {
					setUndoing(false);
				});
			}, [
				undoing,
				live.rev,
				live.draftId,
				sessionKey,
				reload
			]);
			const onAdded = (0, react.useCallback)(() => {
				setAdding(false);
				reload();
			}, [reload]);
			const [dragId, setDragId] = (0, react.useState)(null);
			const [overId, setOverId] = (0, react.useState)(null);
			const onReorderStart = (0, react.useCallback)((id) => {
				setDragId(id);
				if (id === null) setOverId(null);
			}, []);
			const onReorderOver = (0, react.useCallback)((id) => {
				setOverId(id);
			}, []);
			const onReorderDrop = (0, react.useCallback)((active, over) => {
				setDragId(null);
				setOverId(null);
				if (over === active || over === "add") return;
				const from = live.stages.findIndex((s) => s.id === active);
				const to = live.stages.findIndex((s) => s.id === over);
				if (from < 0 || to < 0) return;
				const next = live.stages.slice();
				const [moved] = next.splice(from, 1);
				next.splice(to, 0, moved);
				const beforeRev = live.rev;
				setLive((cur) => ({
					...cur,
					stages: next
				}));
				reorderStageWire({
					stage: active,
					to,
					after: over,
					expect_rev: beforeRev
				}, sessionKey).then((row) => {
					/* v8 ignore next 1 -- rebase answers always carry a numeric rev (probe 2026-09-19) — the +1 arm is the transport fence */
					const rev = typeof row["rev"] === "number" ? row["rev"] : beforeRev + 1;
					/* v8 ignore next 1 -- reorder answers always carry the clamped `to` (probe 2026-10-10) — the fallback arm is the transport fence */
					const wireTo = typeof row["to"] === "number" ? row["to"] : to;
					setLive((cur) => {
						const stages = cur.stages.slice();
						const at = stages.findIndex((s) => s.id === active);
						if (at < 0) return {
							...cur,
							rev
						};
						const [moved] = stages.splice(at, 1);
						if (moved === void 0) return {
							...cur,
							rev
						};
						stages.splice(Math.max(0, Math.min(wireTo, stages.length)), 0, moved);
						return {
							...cur,
							stages,
							rev
						};
					});
				}).catch((err) => {
					setReloadError((0, _melite_card_base_client.rejectionVoice)(err));
					reload();
				});
			}, [live, reload]);
			const [capOver, setCapOver] = (0, react.useState)(false);
			const dropInterested = (e) => e.dataTransfer.types.includes(_melite_card_base_client.CAPABILITY_DRAG_MIME) || e.dataTransfer.types.includes(_melite_card_base_client.ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files");
			const onGridDragOver = (0, react.useCallback)((e) => {
				if (!dropInterested(e)) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = "copy";
				setCapOver(true);
			}, []);
			const onGridDragLeave = (0, react.useCallback)((e) => {
				if (e.relatedTarget === null) setCapOver(false);
			}, []);
			const onGridDrop = (0, react.useCallback)((e) => {
				if (!dropInterested(e)) return;
				e.preventDefault();
				setCapOver(false);
				if (e.dataTransfer.types.includes(_melite_card_base_client.CAPABILITY_DRAG_MIME)) {
					const raw = e.dataTransfer.getData(_melite_card_base_client.CAPABILITY_DRAG_MIME);
					const cap = (0, _melite_card_base_client.parseCapabilityDrop)(raw);
					if (cap === null) {
						if ((0, _melite_card_base_client.isMalformedCapabilityDrop)(raw)) setReloadError("That capability drag is malformed — reload the tab and drag the tile again");
						return;
					}
					addStageWire({
						card: cap.service,
						...cap.params !== void 0 && Object.keys(cap.params).length > 0 ? { params: cap.params } : {},
						expect_rev: live.rev
					}, sessionKey).then(() => {
						reload();
					}).catch((err) => {
						setReloadError((0, _melite_card_base_client.rejectionVoice)(err));
					});
					return;
				}
				if (e.dataTransfer.types.includes(_melite_card_base_client.ASSET_DRAG_MIME)) {
					const payload = (0, _melite_card_base_client.parseAssetDrop)(e.dataTransfer.getData(_melite_card_base_client.ASSET_DRAG_MIME));
					if ((payload.url ?? "") === "") return;
					const t = payload.type ?? "";
					if (!(t.startsWith("image/") || t.startsWith("audio/"))) {
						setReloadError(t !== "" ? "Input cards don’t accept " + t + " assets" : "That asset isn’t supported — drop an image or audio asset");
						return;
					}
					addStageWire({
						card: "input-prep",
						params: { source: payload.url },
						expect_rev: live.rev
					}, sessionKey).then(() => {
						reload();
					}).catch((err) => {
						setReloadError((0, _melite_card_base_client.rejectionVoice)(err));
					});
					return;
				}
				if (e.dataTransfer.files.length > 0) {
					const file = e.dataTransfer.files[0];
					if (file === void 0) return;
					(0, _melite_card_base_client.uploadInputFile)(file, mountAbort.current?.signal).then(({ name }) => addStageWire({
						card: "input-prep",
						params: { source: name },
						expect_rev: live.rev
					}, sessionKey)).then(() => {
						reload();
					}).catch((err) => {
						setReloadError((0, _melite_card_base_client.rejectionVoice)(err));
					});
				}
			}, [live, reload]);
			const [grouping, setGrouping] = (0, react.useState)(false);
			const [selectedIds, setSelectedIds] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			/* v8 ignore next 9 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
			const onToggleSelect = (0, react.useCallback)((id) => {
				setSelectedIds((prev) => {
					const next = new Set(prev);
					if (next.has(id)) next.delete(id);
					else next.add(id);
					return next;
				});
			}, []);
			/* v8 ignore next 5 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
			const exitGrouping = (0, react.useCallback)(() => {
				setGrouping(false);
				setSelectedIds(/* @__PURE__ */ new Set());
			}, []);
			/* v8 ignore next 12 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
			(0, react.useEffect)(() => {
				if (!grouping) return;
				const onKey = (e) => {
					if (e.key !== "Escape") return;
					const t = e.target;
					if (t !== null && typeof t.closest === "function" && t.closest("input, textarea, select, [contenteditable]") !== null) return;
					exitGrouping();
				};
				window.addEventListener("keydown", onKey);
				return () => {
					window.removeEventListener("keydown", onKey);
				};
			}, [grouping, exitGrouping]);
			/* v8 ignore next 11 -- GROUPING SUB-VIEW: setGrouping(true) has no caller (the header's Group action never shipped — probe 2026-09-19); the whole selection mode is unreachable until an entry UI lands */
			(0, react.useEffect)(() => {
				if (selectedIds.size === 0) return;
				const present = new Set(live.stages.map((s) => s.id));
				const stale = [...selectedIds].filter((id) => !present.has(id));
				if (stale.length === 0) return;
				setSelectedIds((prev) => {
					const next = new Set(prev);
					for (const id of stale) next.delete(id);
					return next;
				});
			}, [live.stages, selectedIds]);
			(0, react.useCallback)(() => {
				const ordered = live.stages.map((s) => s.id).filter((id) => selectedIds.has(id));
				if (ordered.length < 2) return;
				groupStagesWire({
					stages: ordered,
					expect_rev: live.rev
				}, sessionKey).then(() => {
					exitGrouping();
					reload();
				}).catch((err) => {
					setReloadError((0, _melite_card_base_client.rejectionVoice)(err));
				});
			}, [
				live,
				selectedIds,
				exitGrouping,
				reload
			]);
			const onAssetAttach = (0, react.useCallback)((target, source, kind) => {
				/* v8 ignore next 1 -- attach targets are always live tile ids (the drop lane resolves them — probe 2026-09-19) */
				const row = live.stages.find((s) => s.id === target);
				/* v8 ignore next 3 -- attach targets are always live tile ids: SortableTile passes its own row.id from the same live.stages render (probe 2026-09-19); the dead-id arm is the stale-render fence */
				if (row === void 0) return;
				if (mountAbort.current?.signal.aborted === true || attachingRef.current) return;
				attachingRef.current = true;
				/* v8 ignore next 1 -- attach targets are always live tile ids (probe 2026-09-19) */
				(0, _melite_card_base_client.fetchFormSpec)(String(row.card)).then((spec) => {
					const field = (0, _melite_card_base_client.fieldsOf)(spec).find((f) => f.type === kind);
					if (field === void 0) throw new Error("the " + String(row.card) + " card has no " + kind + " slot");
					return field.name;
				}).then((field) => typeof source === "string" ? Promise.resolve([field, source]) : (0, _melite_card_base_client.uploadInputFile)(source, mountAbort.current?.signal).then(({ name }) => [field, name])).then(async ([field, src]) => {
					const fresh = await fetchBench(sessionKey, mountAbort.current?.signal);
					if (!fresh.stages.some((s) => s.id === target)) throw new Error("the stage the file was dropped on is gone — attach again");
					return patchStageParams(fresh.draftId, target, { [field]: src });
				}).then(() => {
					attachingRef.current = false;
					reload({ keepOpen: true });
				}).catch((err) => {
					attachingRef.current = false;
					if (mountAbort.current?.signal.aborted === true) return;
					setReloadError((0, _melite_card_base_client.rejectionVoice)(err));
				});
			}, [live, reload]);
			const benchRev = live.rev;
			const [saving, setSaving] = (0, react.useState)(false);
			const [saveName, setSaveName] = (0, react.useState)("");
			const [saveError, setSaveError] = (0, react.useState)(null);
			const onSave = (0, react.useCallback)(() => {
				const name = saveName.trim();
				if (bench.kind !== "bench" || name === "") return;
				if (saveBusyRef.current) return;
				saveBusyRef.current = true;
				const slug = "saved-" + name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
				setSaveError(null);
				const stages = bench.stages.map((st) => {
					const row = { ...st };
					for (const key of BIRTH_STRIP_KEYS) delete row[key];
					delete row["provenance"];
					return row;
				});
				const attempt = (expectRev, signal) => fetch("/v1/bench/ensure", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						session: slug,
						author: "user",
						intent: name,
						stages,
						overwrite: true,
						...expectRev === null ? {} : { expect_rev: expectRev }
					}),
					signal
				});
				const run = async () => {
					const dial = AbortSignal.timeout(SAVE_DIAL_MS);
					try {
						let res = await attempt(null, dial);
						if (!res.ok) {
							const raw = await res.text();
							let body = {};
							try {
								const parsed = JSON.parse(raw);
								if (typeof parsed === "object" && parsed !== null) body = parsed;
							} catch (syntaxError) {}
							if (body["code"] !== _melite_card_base_client.CAS_CONFLICT_CODE || typeof body["current_rev"] !== "number") {
								saveBusyRef.current = false;
								const voice = typeof body["error"] === "string" ? body["error"] : "HTTP " + String(res.status) + ": " + raw;
								setSaveError("save refused (" + voice + ")");
								return;
							}
							res = await attempt(body["current_rev"], dial);
						}
						saveBusyRef.current = false;
						if (!res.ok) {
							setSaveError("save refused (" + await refusalVoice(res) + ")");
							return;
						}
						setSaving(false);
						setSaveName("");
					} catch (e) {
						saveBusyRef.current = false;
						setSaveError("save failed — " + (0, _melite_card_base_client.rejectionVoice)(e));
					}
				};
				run();
			}, [bench, saveName]);
			return (0, react.createElement)("section", {
				className: card_module_css_default.cardsBench,
				"data-cards-bench": benchRev
			}, (0, react.createElement)("header", { className: card_module_css_default.benchHead }, (0, react.createElement)("span", { className: card_module_css_default.revTag }, "rev " + benchRev), (0, react.createElement)("span", { className: card_module_css_default.groupBar }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				disabled: running || live.stages.length === 0,
				title: running ? chromeCopy.passRunning : chromeCopy.runAllHint,
				onClick: onRun
			}, running ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutlineRegular, { size: 14 }) : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutlineRegular, { size: 14 }), chromeCopy.playLabel), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				disabled: running || live.stages.length === 0,
				"data-bench-clear": clearing ? "confirm" : "idle",
				title: clearing ? chromeCopy.clearConfirm : chromeCopy.clearHint,
				onClick: onClear
			}, clearing ? "Confirm clear" : "Clear"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				disabled: running || !canUndo,
				"data-bench-undo": "1",
				title: canUndo ? chromeCopy.undoHint : chromeCopy.nothingToUndo,
				onClick: onUndo
			}, undoing ? "Undoing…" : "Undo"), saving ? (0, react.createElement)("span", { className: card_module_css_default.groupBar }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				value: saveName,
				placeholder: chromeCopy.flowNamePlaceholder,
				onChange: (e) => {
					setSaveName(e.target.value);
				}
			}), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				disabled: saveName.trim() === "",
				onClick: onSave
			}, chromeCopy.saveButton), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				onClick: () => {
					setSaving(false);
					setSaveError(null);
				}
			}, chromeCopy.cancelButton)) : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				disabled: live.stages.length === 0,
				title: chromeCopy.saveFlowHint,
				onClick: () => {
					setSaving(true);
				}
			}, chromeCopy.saveButton))), saveError !== null ? (0, react.createElement)("p", {
				className: card_module_css_default.runError,
				"data-testid": "bench-save-error"
			}, saveError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: () => {
					setSaveError(null);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, reloadError !== null ? (0, react.createElement)("p", {
				className: card_module_css_default.runError,
				"data-testid": "bench-reload-error"
			}, reloadError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: () => {
					setReloadError(null);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, (0, react.createElement)("ol", {
				className: card_module_css_default.tileGrid + (capOver ? " " + card_module_css_default.capOver : ""),
				onDragOver: onGridDragOver,
				onDragLeave: onGridDragLeave,
				onDrop: onGridDrop,
				"data-drop-surface": "cards"
			}, live.stages.map((s) => {
				const row = benchRow(s, live, labelOf);
				return (0, react.createElement)(SortableTile, {
					key: s.id,
					row,
					entered: entered.has(s.id),
					onOpen: (r) => onOpen(r.stage),
					grouping,
					selected: selectedIds.has(s.id),
					onToggleSelect,
					onAssetAttach,
					dragging: dragId === s.id,
					dragOver: overId === s.id && dragId !== null && dragId !== s.id,
					onReorderStart,
					onReorderOver,
					onReorderDrop,
					onRun: (r) => onRunStage(r.stage),
					onStop: (r) => onStopStage(r.stage),
					onRemove: (r) => onRemoveStage(r.stage),
					activeRunId: stageRuns[s.id] ?? null
				});
			}), (0, react.createElement)("li", { className: card_module_css_default.tile + " " + card_module_css_default.tileAdd }, (0, react.createElement)("button", {
				type: "button",
				className: card_module_css_default.tileInner,
				"aria-label": chromeCopy.addCard,
				onClick: onAddCard
			}, (0, react.createElement)("span", { className: card_module_css_default.tilePreview + " " + card_module_css_default.addFace }, "+"), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, chromeCopy.addCard))))), open !== null ? (0, react.createElement)(CardZoomOverlay, {
				key: "zoom",
				stage: open,
				bench: live,
				startError,
				running,
				cardLabel: labelOf(String(open.card)),
				onRun: () => {
					onRunStage(open);
				},
				onStop: () => {
					onStopStage(open);
				},
				onClose,
				onRemoved: () => {
					closeDrill();
					reload();
				},
				onPatchParams: (patch) => onPatchParams(open, patch),
				renderStageView,
				renderPreview,
				runId,
				detail: StageDrill
			}) : null, adding ? (0, react.createElement)(AddCardDoor, {
				sessionKey,
				bench: live,
				onAdded,
				onClose: () => {
					setAdding(false);
				},
				onAddedRow: (row) => {
					setAdding(false);
					setOpen(row);
				}
			}) : null);
		}
		//#endregion
		//#region src/client/draft-run-views.tsx
		/** draft-run-views.tsx — the draft authoring face and the run's live
		* status view (extracted from CardsTab.tsx hour 15). */
		/**
		* THE DRAFT VIEW (the conversation card's target, 2026-09-12 — the
		* old embed's law restored): one flow draft's stage on the authoring
		* surface. The studio claims `cards.stage.view` exactly as the bench's
		* zoom does — same slot, same owner currency, same run/patch doors —
		* so the chat card opens the timeline/video/splits/audio surface, and
		* a card with no registered studio falls back to the generic zoom
		* card (params + Run), the bench's own fallback.
		*
		* Removal is NOT offered (the draft's shape belongs to its authoring
		* surface — the bench CAS door has no business here); the back affordance
		* returns to the shared bench, the tab's home address.
		*/
		function DraftView({ value, running, onRun, onStop, onBack, onPatchParams, renderStageView, renderPreview, runId, bindRun }) {
			const found = value.stages.find((s) => s.id === value.stageId) ?? null;
			if (found === null) return (0, react.createElement)(ScrollLockedDetail, null, (0, react.createElement)("p", { className: card_module_css_default.groupNote }, "Stage " + value.stageId + " is no longer on draft " + value.draftId + "."), (0, react.createElement)("div", { className: card_module_css_default.runRow }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				onClick: onBack
			}, chromeCopy.backToBench)));
			let stage = found;
			if ((stage["card"] === void 0 || stage["card"] === "") && value.intent !== "" && value.stages.length === 1) stage = {
				...found,
				card: value.intent
			};
			const bench = {
				kind: "bench",
				draftId: value.draftId,
				rev: -1,
				stages: value.stages,
				log: [],
				sessionKey: benchSessionOf(void 0)
			};
			return (0, react.createElement)(StageDrill, {
				stage,
				bench,
				running,
				onRun,
				onStop,
				onClose: onBack,
				onRemoved: onBack,
				onPatchParams,
				renderStageView,
				renderPreview,
				runId,
				canRemove: false,
				bindRun
			});
		}
		function RunView({ run, sessionKey, onBack, onRestored, onStop }) {
			const [restoring, setRestoring] = (0, react.useState)(false);
			const [note, setNote] = (0, react.useState)(null);
			const [stopping, setStopping] = (0, react.useState)(false);
			const [dismissedStageError, setDismissedStageError] = (0, react.useState)(null);
			const live = isLiveRunStatus(run.status);
			const stageError = terminalRunStageErrorOf(run.stages, run.error);
			const shownStageError = stageError !== null && stageError !== dismissedStageError ? stageError : null;
			/* v8 ignore next 3 -- the cancel button renders only when onStop is defined (line above — probe 2026-09-19): the undefined arm is a single-render-law contradiction; prod always passes onStop */
			const onCancel = () => {
				if (onStop === void 0) return;
				setStopping(true);
				setNote(null);
				onStop(run.runId).then(() => {
					setStopping(false);
				}).catch((e) => {
					setStopping(false);
					setNote((0, _melite_card_base_client.rejectionVoice)(e));
				});
			};
			const onRestore = (0, react.useCallback)(() => {
				setRestoring(true);
				setNote(null);
				restoreRunToBench(run, sessionKey).then((report) => {
					const extra = report.notes.length > 0 ? " (" + report.notes.join("; ") + ")" : "";
					const skipped = report.skipped > 0 ? ", " + String(report.skipped) + " skipped" : "";
					const carried = report.carried > 0 ? ", " + String(report.carried) + " outcome(s) carried" : "";
					setNote("restored " + String(report.added) + " stage(s) to the bench" + skipped + carried + extra);
					setRestoring(false);
					onRestored();
				}).catch((e) => {
					setNote((0, _melite_card_base_client.rejectionVoice)(e));
					setRestoring(false);
				});
			}, [
				run,
				onRestored,
				sessionKey
			]);
			const receiptChip = run.graphReceipt === void 0 ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Pill, { className: run.graphReceipt.verdict === "complete" ? card_module_css_default.graphReceiptOk : card_module_css_default.graphReceiptPartial }, run.graphReceipt.verdict === "complete" ? chromeCopy.graphReceiptCarried({
				nodes: run.graphReceipt.nodes,
				promptId: run.graphReceipt.prompt_id
			}) : chromeCopy.graphReceiptDropped({
				dropped: run.graphReceipt.dropped,
				promptId: run.graphReceipt.prompt_id
			}));
			return (0, react.createElement)("section", {
				className: card_module_css_default.runView,
				"data-run-status": run.status
			}, (0, react.createElement)("header", { className: card_module_css_default.runHead }, (0, react.createElement)("span", { className: card_module_css_default.runId }, run.runId), (0, react.createElement)("span", { className: card_module_css_default.runStatus }, (0, _melite_card_base_client.titleCaseId)(run.status)), receiptChip), shownStageError !== null ? (0, react.createElement)("p", {
				className: card_module_css_default.runError,
				"data-testid": "run-stage-error"
			}, shownStageError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: () => {
					setDismissedStageError(shownStageError);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, (0, react.createElement)("div", { className: card_module_css_default.runActions }, onBack !== void 0 ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				onClick: onBack
			}, chromeCopy.backToBenchRun) : null, live && onStop !== void 0 ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				className: card_module_css_default.dangerVerb,
				disabled: stopping,
				onClick: onCancel
			}, stopping ? chromeCopy.cancellingWord : chromeCopy.cancelRunWord) : null, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				disabled: restoring || run.draftId === null,
				title: run.draftId === null ? chromeCopy.restoreNoDraft : chromeCopy.restoreHint,
				onClick: onRestore
			}, restoring ? chromeCopy.restoringWord : chromeCopy.restoreToBench)), note !== null ? (0, react.createElement)("p", {
				className: card_module_css_default.restoreNote,
				"data-testid": "run-note"
			}, note, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: () => {
					setNote(null);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, (0, react.createElement)("ol", { className: card_module_css_default.tileGrid }, run.stages.map((s) => {
				const thumb = s.url !== void 0 ? toRunMediaUrl(run.runId, s.url) : null;
				const word = typeof s.status === "string" ? s.status.toLowerCase() : "";
				const dot = RUN_STATUS_WORDS.has(word) ? STATUS_DOT[statusOf(word)] : null;
				const face = thumb !== null ? (0, react.createElement)("a", {
					href: thumb,
					target: "_blank",
					rel: "noreferrer",
					className: card_module_css_default.tileImgLink
				}, (0, react.createElement)("img", {
					className: card_module_css_default.tileImg,
					src: thumb,
					alt: s.id,
					loading: "lazy"
				})) : (0, react.createElement)("span", {
					className: card_module_css_default.kindFace,
					"data-kind": s.id
				}, (0, react.createElement)("span", { className: card_module_css_default.kindInitial }, s.id.slice(0, 1).toUpperCase()), (0, react.createElement)("span", { className: card_module_css_default.kindName }, s.id));
				return (0, react.createElement)("li", {
					key: s.id,
					className: card_module_css_default.tile,
					"data-stage-status": s.status
				}, (0, react.createElement)("div", {
					className: card_module_css_default.tileInner,
					"data-status": s.status
				}, (0, react.createElement)("span", { className: card_module_css_default.tilePreview }, face, dot !== null ? (0, react.createElement)("span", { className: card_module_css_default.tileDot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dot })) : null), (0, react.createElement)("span", { className: card_module_css_default.tileCaption }, (0, react.createElement)("span", { className: card_module_css_default.tileTitle }, s.id), (0, react.createElement)("span", { className: card_module_css_default.tileMeta }, s.status))));
			})));
		}
		//#endregion
		//#region src/client/cards-tab-body.tsx
		/** cards-tab-body.tsx — CardsTab + the address law (extracted from
		* CardsTab.tsx hour 15; the tab body's own composition — the bench,
		* draft, and run views ride their own seam files). */
		/**
		* The Cards tab body — the bench's user plane (plan §5: "the user
		* browses visually in the tab").
		*
		* Bench view (`dsh-resource://cards/bench`): the stage rows GROUPED BY
		* CARD (the categories — each card's stages under its own header with
		* a count), each row opening a DSH Modal drilldown (id/card/engine/
		* params — the chat tile's drilldown pattern, primitives Modal), the
		* revision trail's head, and the Run gesture — which projects the
		* stages onto the flow_inline wire and starts them under the bench's
		* own draft_id, EXACTLY what melite_flow's bench verb does (one
		* truth, two planes; the model's plane is per-call reads, never this
		* component's frames).
		*
		* Run view (`dsh-resource://cards/run/<runId>`): live status + stage
		* rows + artifacts, riding the resource provider's frames — plus the
		* way back: "Back to bench" navigates home, and "Restore to bench"
		* turns the card BACK INTO A FLOW (drafts/get on the run's draft_id
		* + per-stage bench/add-stage as the user, CAS-chained).
		*
		* ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
		* the shell's navigation address is the SHELL's (guide clicks arrive
		* as the tab id's own address, not a cards address). An address that
		* does not parse as a cards address serves the BENCH — the tab never
		* sits on a resource no provider claims.
		*
		* The body is dispatched by the keyed `sidebar.right.pane.tab` seat
		* under the type's id; the address arrives through the standard
		* `useTabInfo` hook, the value through the standard `useResource`
		* hook. Local prop typings (the package's local-spelling pattern —
		* see index.ts) keep this package off sibling runtime imports.
		*/
		/** ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
		*  the shell's navigation address is the SHELL's (guide clicks arrive
		*  as the tab id's own address, not a cards address). An address that
		*  does not parse as a cards address serves the BENCH — the tab never
		*  sits on a resource no provider claims. */
		function resolveCardsAddress(rawAddress) {
			return parseCardsAddress(rawAddress) !== null ? rawAddress : CARDS_BENCH_ADDRESS;
		}
		const verbClaim = (verb, text) => ({
			text,
			kind: "verb",
			verb,
			rowLanded: false
		});
		const startClaim = (text, rescue) => ({
			text,
			kind: "start",
			rowLanded: true,
			...rescue !== void 0 ? { rescue } : {}
		});
		/** a verb's SUCCESS clears only its own claim — never a start
		*  claim, never another verb's (W6: an unrelated success eating an
		*  unanswered refusal is information loss) */
		const clearVerb = (verb) => (claim) => claim !== null && claim.kind === "verb" && claim.verb === verb ? null : claim;
		function CardsTab(props) {
			(0, react.useEffect)(() => {
				markCardsSurface(true);
				return () => {
					markCardsSurface(false);
				};
			}, []);
			const renderStageView = (owner, fallback) => {
				if (props.renderSlot === void 0) return fallback;
				return props.renderSlot("cards.stage.view", owner, {
					entryKey: owner.cardName,
					fallback
				}) ?? fallback;
			};
			const renderPreview = (owner, fallback) => {
				if (props.renderSlot === void 0) return fallback;
				return props.renderSlot("cards.stage.preview", owner, {
					entryKey: owner.kind,
					fallback
				}) ?? fallback;
			};
			const info = typeof props.useTabInfo === "function" ? props.useTabInfo() : void 0;
			const rawAddress = info?.tab.navigation.address ?? info?.tab.contentId ?? "dsh-resource://cards/bench";
			const benchKey = benchSessionOf(props.sessionId ?? benchSessionOfAddress(resolveCardsAddress(rawAddress)));
			const benchAddress = benchAddressOf(benchKey);
			const resolved = resolveCardsAddress(rawAddress);
			const parsed = parseCardsAddress(resolved);
			const address = parsed !== null && ("run" in parsed || "draft" in parsed) ? resolved : benchAddress;
			const openResource = info?.tab.actions.openResource;
			const snapshot = typeof props.useResource === "function" ? props.useResource(address) : void 0;
			const [running, setRunning] = (0, react.useState)(false);
			const runningRef = (0, react.useRef)(false);
			const [lastRunId, setLastRunId] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (lastRunId !== null) return;
				if (snapshot?.value?.kind !== "bench" && snapshot?.value?.kind !== "draft") return;
				const draftId = snapshot.value.draftId;
				if (draftId === "") return;
				let alive = true;
				(0, _melite_card_base_client.fetchLatestRunForDraft)(draftId).then((rid) => {
					if (alive && rid !== null) setLastRunId(rid);
				}).catch(() => {});
				return () => {
					alive = false;
				};
			}, [lastRunId, snapshot?.value]);
			const [localRunError, setLocalRunError] = (0, react.useState)(null);
			const [silencedError, setSilencedError] = (0, react.useState)(null);
			const snapshotStageError = snapshot?.value !== void 0 && snapshot.value.kind !== "run" ? terminalStageErrorOf(snapshot.value.stages) : null;
			const dismissRunError = (0, react.useCallback)(() => {
				setLocalRunError(null);
				if (snapshotStageError !== null) setSilencedError(snapshotStageError);
			}, [snapshotStageError]);
			(0, react.useEffect)(() => {
				if (snapshotStageError === null) setSilencedError(null);
			}, [snapshotStageError]);
			const retireStartClaim = (0, react.useCallback)(() => {
				setLocalRunError(null);
			}, []);
			const terminalSeen = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const value = snapshot?.value;
				if (value === void 0 || value.kind === "run") return;
				const cur = /* @__PURE__ */ new Map();
				for (const s of value.stages) cur.set(s.id, typeof s.runStatus === "string" ? s.runStatus : "");
				const prev = terminalSeen.current;
				terminalSeen.current = cur;
				if (prev === null) return;
				for (const [id, status] of cur) if (statusOrPendingOf(status) === "done" && statusOrPendingOf(prev.get(id) ?? "") !== "done") {
					setLocalRunError((claim) => claim !== null && claim.kind === "start" && claim.rowLanded ? null : claim);
					return;
				}
			}, [snapshot?.value]);
			const outcomeAbort = (0, react.useRef)(null);
			const setRunningLive = (0, react.useCallback)((v) => {
				runningRef.current = v;
				setRunning(v);
			}, []);
			const [benchTick, setBenchTick] = (0, react.useState)(0);
			(0, react.useEffect)(() => () => {
				outcomeAbort.current?.abort();
			}, []);
			const touchBench = (0, react.useCallback)(() => {
				setBenchTick((t) => t + 1);
			}, []);
			const reconcileArmed = (0, react.useRef)(/* @__PURE__ */ new Set());
			const reconcileCtrl = (0, react.useRef)(null);
			if (reconcileCtrl.current === null) reconcileCtrl.current = new AbortController();
			(0, react.useEffect)(() => () => {
				reconcileCtrl.current?.abort();
			}, []);
			const benchValue = snapshot?.value?.kind === "bench" ? snapshot.value : null;
			(0, react.useEffect)(() => {
				if (benchValue === null) return;
				reconcileBenchRuns(benchValue, {
					signal: reconcileCtrl.current?.signal,
					onTouched: touchBench,
					armed: reconcileArmed.current
				});
			}, [benchValue, touchBench]);
			const [stageRuns, setStageRuns] = (0, react.useState)({});
			const stageRunsRef = (0, react.useRef)({});
			const setStageRun = (0, react.useCallback)((stageId, runId) => {
				stageRunsRef.current = {
					...stageRunsRef.current,
					[stageId]: runId
				};
				setStageRuns(stageRunsRef.current);
			}, []);
			const clearStageRun = (0, react.useCallback)((stageId, runId) => {
				stageRunsRef.current = { ...stageRunsRef.current };
				console.log("PROBE clearStageRun:", stageId, runId, JSON.stringify(stageRunsRef.current));
				if (runId !== void 0 && stageRunsRef.current[stageId] !== runId) return;
				delete stageRunsRef.current[stageId];
				setStageRuns(stageRunsRef.current);
			}, []);
			const onStarted = (0, react.useCallback)((runId, ran) => {
				setRunningLive(false);
				setLastRunId(runId);
				/* v8 ignore next 1 -- every run answer carries its started stage (probe 2026-09-19) */
				if (ran === void 0) return;
				setStageRun(ran.stageId, runId);
				if (outcomeAbort.current === null) outcomeAbort.current = new AbortController();
				observeRunOutcome(ran.draftId, ran.stageId, runId, outcomeAbort.current.signal, touchBench).then(() => {
					clearStageRun(ran.stageId, runId);
				}).catch(() => {
					clearStageRun(ran.stageId, runId);
				});
			}, [
				touchBench,
				clearStageRun,
				setStageRun
			]);
			const runAllAbort = (0, react.useRef)(null);
			/* v8 ignore next 4 -- BenchView is only ever mounted with kind bench (single-render law — probe 2026-09-19) */
			const onRun = (0, react.useCallback)(() => {
				if (snapshot?.value?.kind !== "bench") return;
				if (snapshot.status === "failed") {
					setLocalRunError(verbClaim("refresh", "refresh failed — showing the last good state, not composing from it (" + (snapshot.failure?.message ?? "cards resource failed") + ")"));
					return;
				}
				if (runningRef.current) {
					setLocalRunError(verbClaim("run", "a run pass is already going — stop it or wait for it to settle"));
					return;
				}
				setRunningLive(true);
				setLocalRunError(null);
				runAllAbort.current?.abort();
				const ctrl = new AbortController();
				runAllAbort.current = ctrl;
				const bench = snapshot.value;
				runBenchSequential(bench, {
					signal: ctrl.signal,
					onCardStarted: (runId, ran) => {
						setLastRunId(runId);
						setStageRun(ran.stageId, runId);
					},
					onCardSettled: (runId, ran) => {
						clearStageRun(ran.stageId, runId);
					},
					onTouched: touchBench
				}).then((res) => {
					setRunningLive(false);
					if (res.refused !== null) setLocalRunError(startClaim(res.refused, rescueOfLaneDetails(res.refusedDetails) ?? void 0));
					if (res.refused !== null && res.stoppedAt !== null && res.refusedCode === _melite_card_base_client.WIRE_CARD_COMPOSE_INCOMPLETE) {
						const stageId = res.stoppedAt;
						/* v8 ignore next 2 -- the heal tail rides the covered observe lane (probe 2026-09-19) */
						patchStageOutcome(bench.draftId, stageId, {
							runStatus: "",
							result: {}
						}).then(() => {
							touchBench();
						}).catch(() => {});
					}
				}, (e) => {
					setRunningLive(false);
					setLocalRunError(verbClaim("run", (0, _melite_card_base_client.rejectionVoice)(e)));
				});
			}, [
				snapshot,
				touchBench,
				setStageRun,
				clearStageRun
			]);
			const onRunStage = (0, react.useCallback)((stage) => {
				/* v8 ignore next 4 -- single-render law: BenchView mounts only with kind bench (probe 2026-09-19); the loud voice fences a shape the harness never produces */
				if (snapshot?.value?.kind !== "bench") {
					setLocalRunError(startClaim("the bench is not ready to run from — reopen the Media Flow tab (snapshot kind: " + String(snapshot?.value?.kind ?? "none") + ")"));
					return;
				}
				if (runningRef.current || stageRunsRef.current[stage.id] !== void 0) {
					setLocalRunError(startClaim("this stage already has a run going — stop it or wait for it to settle"));
					return;
				}
				setRunningLive(true);
				setLocalRunError(null);
				const draftId = snapshot.value.draftId;
				const rev = snapshot.value.rev;
				const stageId = stage.id;
				const carryFailure = (error, refusedCode, refusedDetails) => {
					setRunningLive(false);
					setLocalRunError(startClaim(error, rescueOfLaneDetails(refusedDetails) ?? void 0));
					if (refusedCode === _melite_card_base_client.WIRE_CARD_COMPOSE_INCOMPLETE) {
						/* v8 ignore next 2 -- the heal tail rides the covered observe lane (probe 2026-09-19) */
						patchStageOutcome(draftId, stageId, {
							runStatus: "",
							result: {}
						}, rev).then(() => {
							touchBench();
						}).catch(() => {});
						return;
					}
					if (refusedCode === _melite_card_base_client.WIRE_LIFECYCLE_INFLIGHT) return;
					/* v8 ignore next 2 -- the outcome-patch tail rides the covered observe lane (probe 2026-09-19) */
					patchStageOutcome(draftId, stageId, {
						runStatus: "failed",
						result: { error }
					}, rev).then(() => {
						touchBench();
					}).catch(() => {
						setLocalRunError((claim) => claim !== null && claim.kind === "start" ? {
							...claim,
							rowLanded: false
						} : claim);
					});
				};
				runCardStage(draftId, stage).then((res) => {
					if ("runId" in res) onStarted(res.runId, {
						draftId,
						stageId
					});
					else carryFailure(res.refused, res.refusedCode, res.refusedDetails);
				}, (e) => {
					carryFailure((0, _melite_card_base_client.rejectionVoice)(e));
				});
			}, [
				snapshot,
				onStarted,
				touchBench
			]);
			const onStopStage = (0, react.useCallback)((stage) => {
				const rid = stageRunsRef.current[stage.id];
				if (rid === void 0) return;
				(0, _melite_card_base_client.stopRun)(rid).then(() => {
					setLocalRunError(clearVerb("stop"));
				}).catch((e) => {
					setLocalRunError(verbClaim("stop", (0, _melite_card_base_client.rejectionVoice)(e)));
				});
			}, [_melite_card_base_client.stopRun]);
			/* v8 ignore next 3 -- single-render law: the bench rows ride a bench-kind snapshot (probe 2026-09-19) */
			const removeInFlight = (0, react.useRef)(/* @__PURE__ */ new Set());
			const onRemoveStage = (0, react.useCallback)((stage) => {
				const value = snapshot?.value;
				if (value?.kind !== "bench") return;
				if (removeInFlight.current.has(stage.id)) return;
				removeInFlight.current.add(stage.id);
				const { rev, sessionKey, draftId } = value;
				removeStageWire({
					stage: stage.id,
					expect_rev: rev
				}, sessionKey).then(() => {
					if (draftId !== null) forgetStageWrites(draftId, [stage.id]);
					setLocalRunError(clearVerb("remove"));
					touchBench();
				}).catch((e) => {
					setLocalRunError(verbClaim("remove", (0, _melite_card_base_client.rejectionVoice)(e)));
				}).finally(() => {
					removeInFlight.current.delete(stage.id);
				});
			}, [snapshot, touchBench]);
			/* v8 ignore next 2 -- single-render law: internal callers always satisfy the kind (probe 2026-09-19) */
			const onPatchParamsStage = (0, react.useCallback)((stage, patch) => {
				if (snapshot?.value?.kind !== "bench" && snapshot?.value?.kind !== "draft") return Promise.resolve(false);
				const draftId = snapshot.value.draftId;
				const stageId = stage.id;
				return scheduleStagePatch(draftId, stageId, patch, snapshot.value.rev).then((landed) => {
					if (landed) setLocalRunError(clearVerb("patch"));
					else setLocalRunError(verbClaim("patch", unlandedWriteVoice(draftId, stageId)));
					touchBench();
					return landed;
				});
			}, [snapshot, touchBench]);
			/* v8 ignore next 3 -- the draft-stage editor only mounts on a draft-kind snapshot (probe 2026-09-19) */
			const onRunDraftStage = (0, react.useCallback)(() => {
				const value = snapshot?.value;
				if (value?.kind !== "draft") return;
				const target = value.stages.find((s) => s.id === value.stageId);
				if (target === void 0) return;
				if (runningRef.current || stageRunsRef.current[target.id] !== void 0) {
					setLocalRunError(startClaim("this stage already has a run going — stop it or wait for it to settle"));
					return;
				}
				setRunningLive(true);
				setLocalRunError(null);
				runCardStage(value.draftId, target).then((res) => {
					if ("runId" in res) onStarted(res.runId, {
						draftId: value.draftId,
						stageId: target.id
					});
					else {
						setRunningLive(false);
						setLocalRunError(startClaim(res.refused, rescueOfLaneDetails(res.refusedDetails) ?? void 0));
						const draftId = value.draftId;
						const stageId = target.id;
						const error = res.refused;
						const incomplete = res.refusedCode === _melite_card_base_client.WIRE_CARD_COMPOSE_INCOMPLETE;
						/* v8 ignore next 1 -- the enclosing callback already returned on non-draft (probe 2026-09-19) */
						const rev = value.kind === "draft" ? value.rev : void 0;
						patchStageOutcome(draftId, stageId, incomplete ? {
							runStatus: "",
							result: {}
						} : {
							runStatus: "failed",
							result: { error }
						}, rev).catch(() => {
							if (!incomplete) setLocalRunError((claim) => claim !== null && claim.kind === "start" ? {
								...claim,
								rowLanded: false
							} : claim);
						});
					}
				});
			}, [snapshot, onStarted]);
			/* v8 ignore next 2 -- the draft editor only mounts on a draft-kind snapshot (probe 2026-09-19) */
			const onPatchParamsDraft = (0, react.useCallback)((patch) => {
				const value = snapshot?.value;
				if (value?.kind !== "draft") return Promise.resolve(false);
				const draftId = value.draftId;
				const stageId = value.stageId;
				return scheduleStagePatch(draftId, stageId, patch, value.rev).then((landed) => {
					if (landed) setLocalRunError(clearVerb("patch"));
					else setLocalRunError(verbClaim("patch", unlandedWriteVoice(draftId, stageId)));
					touchBench();
					return landed;
				});
			}, [snapshot, touchBench]);
			const onStop = (0, react.useCallback)((runId) => {
				return (0, _melite_card_base_client.stopRun)(runId).then(() => {
					setLocalRunError(clearVerb("cancel"));
				}).catch((e) => {
					setLocalRunError(verbClaim("cancel", (0, _melite_card_base_client.rejectionVoice)(e)));
					throw e;
				});
			}, []);
			const onBack = (0, react.useCallback)(() => {
				if (openResource !== void 0) openResource(benchAddress);
			}, [openResource, benchAddress]);
			const draftBack = (0, react.useCallback)(() => {
				retireStartClaim();
				onBack();
			}, [retireStartClaim, onBack]);
			const withTabScroll = (...children) => (0, react.createElement)("div", {
				className: card_module_css_default.tabScroll,
				"data-testid": "cards-tab-scroll"
			}, ...children);
			if (snapshot === void 0) return withTabScroll((0, react.createElement)("p", { className: card_module_css_default.missing }, chromeCopy.cardsHookUnavailable));
			const value = snapshot.value;
			const failedLine = snapshot.status === "failed" && value !== void 0 ? (0, react.createElement)("p", {
				className: card_module_css_default.failed,
				"data-testid": "cards-refresh-failed"
			}, snapshot.failure?.message ?? "cards resource failed — showing the last good state") : null;
			if (value === void 0) {
				if (snapshot.status === "live") return withTabScroll((0, react.createElement)("p", { className: card_module_css_default.failed }, chromeCopy.cardsNoValue));
				if (snapshot.status === "failed") return withTabScroll((0, react.createElement)("p", { className: card_module_css_default.failed }, snapshot.failure?.message ?? "cards resource failed"));
				return withTabScroll((0, react.createElement)("p", { className: card_module_css_default.loading }, "loading " + address + "…"));
			}
			const stageError = value.kind === "run" ? null : terminalStageErrorOf(value.stages);
			const runError = localRunError !== null ? localRunError.text : stageError !== null && stageError !== silencedError ? stageError : null;
			return value.kind === "bench" ? withTabScroll(failedLine, runError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, runError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: dismissRunError
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, runError !== null ? (0, react.createElement)(RunRescue, {
				error: runError,
				stages: value.stages,
				onRun,
				...localRunError?.rescue !== void 0 ? { rescue: localRunError.rescue } : {}
			}) : null, (0, react.createElement)(_melite_card_base_client.ToastViewport), (0, react.createElement)(BenchView, {
				sessionKey: benchKey,
				bench: value,
				onRun,
				onRunStage,
				onStopStage,
				onRemoveStage,
				stageRuns,
				running,
				onPatchParams: onPatchParamsStage,
				renderStageView,
				renderPreview,
				runId: lastRunId,
				refreshTick: benchTick,
				startError: localRunError !== null ? localRunError.text : null,
				onDrillClose: retireStartClaim
			})) : value.kind === "draft" ? withTabScroll(failedLine, runError !== null ? (0, react.createElement)("p", { className: card_module_css_default.runError }, runError, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "ghost",
				className: card_module_css_default.errorDismiss,
				"aria-label": chromeCopy.dismissError,
				onClick: dismissRunError
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineRegular, { size: 12 }))) : null, runError !== null ? (0, react.createElement)(RunRescue, {
				error: runError,
				stages: value.stages,
				onRun: onRunDraftStage
			}) : null, (0, react.createElement)(DraftView, {
				value,
				running,
				onRun: onRunDraftStage,
				onStop: lastRunId !== null && onStop !== void 0 ? () => {
					onStop(lastRunId).catch(() => {});
				} : () => {},
				onBack: draftBack,
				onPatchParams: onPatchParamsDraft,
				renderStageView,
				renderPreview,
				runId: lastRunId
			})) : withTabScroll(failedLine, (0, react.createElement)(RunView, {
				run: value,
				sessionKey: benchKey,
				onBack: openResource !== void 0 ? onBack : void 0,
				onRestored: onBack,
				onStop
			}));
		}
		//#endregion
		//#region src/client/index.ts
		(0, _melite_card_base_client.wireContractToastToRowStore)();
		/** The tab type's identity (the key its body registers under). */
		const CARDS_TAB_ID = "@melite-plugin/dsh-card-view";
		/** Required services (fiber inject waiting — the registries must be up
		*  first: the native sidebar subsystem + the resource model + the
		*  sidebar's navigation face, which the conversation card's rows ride
		*  to open the Cards tab at a draft stage — the old embed's law — the
		*  gateway client's remote service, which carries the mounted estate
		*  namespaces the bench tail consumes, and the Session Controller
		*  adapter whose selection the bench spotlight follows). */
		const inject = [
			"slots",
			"sidebarRightTabs",
			"resources",
			"sidebarRight",
			"remote",
			"uiConversation",
			"uiSession"
		];
		/**
		* Register both planes: the toolview keys for every card tool, and the
		* cards tab (type + body + resource provider).
		* @param ctx - client root context.
		*/
		async function apply(ctx) {
			try {
				const dispose = await ctx.remote.$mount(TYPERT_REMOTE$3);
				ctx.effect(() => dispose, "melite-card-view: estate remote contribution");
			} catch (error) {
				console.error("[melite-card-view] estate remote contribution failed to mount:", error);
			}
			try {
				const disposeRuns = await ctx.remote.$mount(TYPERT_REMOTE$2);
				ctx.effect(() => disposeRuns, "melite-card-view: runs remote contribution");
			} catch (error) {
				console.error("[melite-card-view] runs remote contribution failed to mount:", error);
			}
			try {
				const disposeMedia = await ctx.remote.$mount(TYPERT_REMOTE$1);
				ctx.effect(() => disposeMedia, "melite-card-view: media remote contribution");
			} catch (error) {
				console.error("[melite-card-view] media remote contribution failed to mount:", error);
			}
			try {
				const disposeManage = await ctx.remote.$mount(TYPERT_REMOTE);
				ctx.effect(() => disposeManage, "melite-card-view: manage remote contribution");
			} catch (error) {
				console.error("[melite-card-view] manage remote contribution failed to mount:", error);
			}
			let benchNs;
			try {
				benchNs = (0, _melite_card_base_client.bindEstateRemoteFromRemote)({
					bench: ctx.get("remote.bench"),
					drafts: ctx.get("remote.drafts"),
					runs: ctx.get("remote.runs"),
					media: ctx.get("remote.media"),
					manage: ctx.get("remote.manage")
				}).bench;
			} catch (error) {
				console.error("[melite-card-view] estate direct bind failed:", error);
			}
			bindRunFramesRemote(ctx.remote);
			for (const tool of CARD_TOOLS) try {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: tool,
					inject: () => ({
						openSurface: (address) => {
							try {
								ctx.sidebarRight.openResource(address);
								return true;
							} catch {
								return false;
							}
						},
						openMedia: () => {
							try {
								ctx.sidebarRight.openTab("media");
								return true;
							} catch {
								return false;
							}
						}
					})
				}, FlowCards));
			} catch (error) {
				console.error(`[melite-card-view] toolview registration failed for ${tool}:`, error);
			}
			for (const tool of FLOW_TOOLS) try {
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key: tool,
					inject: () => ({
						openSurface: (address) => {
							try {
								ctx.sidebarRight.openResource(address);
								return true;
							} catch {
								return false;
							}
						},
						openMedia: () => {
							try {
								ctx.sidebarRight.openTab("media");
								return true;
							} catch {
								return false;
							}
						}
					})
				}, ConstructCard));
			} catch (error) {
				console.error(`[melite-card-view] toolview registration failed for ${tool}:`, error);
			}
			try {
				ctx.effect(() => ctx.uiConversation.events.register(meliteCardsTurnDefinition), "melite-card-view: meliteCards turn fold");
			} catch (error) {
				console.error("[melite-card-view] meliteCards turn fold registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.provide("chatFileMentions", buildChatFileMentions(() => {
					try {
						ctx.sidebarRight.openTab("media");
					} catch {}
				})), "melite-card-view: chat file mentions");
			} catch (error) {
				if ((0, _melite_card_base_client.isDuplicateServiceSeat)(error, "chatFileMentions")) console.info("[melite-card-view] chat file mentions: already seated — nothing to do");
				else console.error("[melite-card-view] chat file mentions registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.sidebarRightTabs.register({
					id: CARDS_TAB_ID,
					kind: "cards",
					patterns: ["dsh-resource://cards/**"],
					title: (address) => {
						const resolved = resolveCardsAddress(address);
						if (resolved.startsWith("dsh-resource://cards/bench")) return chromeCopy.cardsTabTitle;
						return resolved.replace(/^dsh-resource:\/\/cards\//, "");
					},
					guide: [{
						id: "cards-tab-guide",
						order: 50,
						title: () => chromeCopy.cardsTabTitle,
						description: () => chromeCopy.cardsTabGuide
					}]
				}), "melite-card-view: cards tab type");
			} catch (error) {
				console.error("[melite-card-view] cards tab type registration failed:", error);
			}
			try {
				ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: CARDS_TAB_ID,
					children: {
						"cards.stage.view": {
							kind: "keyed",
							scope: "session"
						},
						"cards.stage.preview": {
							kind: "keyed",
							scope: "session"
						}
					}
				}, CardsTab));
			} catch (error) {
				console.error("[melite-card-view] cards tab body registration failed:", error);
			}
			try {
				ctx.effect(() => ctx.resources.register({
					protocol: "cards",
					open: (address, rctx) => openCardsResource(address, rctx, ctx.remote, benchNs)
				}), "melite-card-view: cards resource provider");
			} catch (error) {
				console.error("[melite-card-view] cards resource provider registration failed:", error);
			}
			try {
				const activeBenchSession = () => {
					try {
						const sid = ctx.uiSession.adapter.current.getSnapshot().props["sessionId"];
						return benchSessionOf(typeof sid === "string" ? sid : void 0);
					} catch {
						return benchSessionOf(void 0);
					}
				};
				const subscribeBenchSession = (fn) => {
					try {
						return ctx.uiSession.adapter.current.subscribe(fn);
					} catch {
						return () => {};
					}
				};
				ctx.effect(() => watchBenchLands(activeBenchSession, (sessionKey) => {
					try {
						if (shouldSpotlight(ctx.sidebarRight.isExpanded())) ctx.sidebarRight.openResource(benchAddressOf(sessionKey));
					} catch (error) {
						console.error("[melite-card-view] bench spotlight reveal failed:", error);
					}
				}, void 0, ctx.remote, benchNs, subscribeBenchSession), "melite-card-view: bench spotlight");
			} catch (error) {
				console.error("[melite-card-view] bench spotlight registration failed:", error);
			}
		}
		//#endregion
		exports.CARD_TOOLS = CARD_TOOLS;
		exports.FLOW_TOOLS = FLOW_TOOLS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
