export declare const HERE: string;
/** The melite workspace root, derived from the pnpm-workspace.yaml
 * marker at first call (memoized). Throws when called outside the
 * checkout — a CLI entry error, never an import error.
 * @returns absolute path to the workspace root */
export declare function repo(): string;
/** The engine package's own data/ (comfyui-cordis since the models-
* plane reversal, 91532243 — the old engines/comfyui anchor was a
* stale name that left every config-less CLI call fatal).
* The F1 chain (the cold-start r10 burn): COMFYUI_ENDPOINT_CONFIG
* env path first, else the repo's untracked STATE HOME
* `<repo>/data/comfyui_endpoint.json` when present, else the
* package seed. Before this, the provisioner read the SEED while
* the estate's legs (acquire, census) read the state home — a
* machine statement pinned into the state home (url, model bases)
* reached the download leg but never the paths leg, so the engine's
* extra_model_paths.yaml composed a base the acquire never wrote
* to (the weights landed at the store root, the engine enumerated
* the lane subtree, and every UNETLoader combo served 0 values).
* One spelling of the endpoint law for every reader (src/
* comfyui-config.ts loadEndpointConfig is the service-side twin).
* @returns absolute path to the default endpoint config */
export declare function defaultConfig(): string;
/** @returns absolute path to the repo's inference.config.json */
export declare function rootConfig(): string;
/** @returns absolute path to the comfyui runtime tree
 * (data/runtime/comfyui) */
export declare function runtime(): string;
/** @returns absolute path to the comfyui project (infra/comfyui) */
export declare function comfyProject(): string;
/** Python executable inside a uv venv: `Scripts/python.exe` on
 * Windows, `bin/python` everywhere else. Every venv spawn and every
 * printed launch command resolves through this — the provisioning
 * CLI runs on Windows, macOS, and Linux unchanged (operator law,
 * 2026-10-12: the product is pnpm + ComfyUI, no POSIX-only paths).
 * @param venvRoot absolute path to the venv directory
 * @returns absolute path to the venv's python executable */
export declare function venvPython(venvRoot: string): string;
export declare let DRY: boolean;
export declare const FAILS: string[];
/** Set the dry-run flag (assigned once by the entry CLI parse). */
export declare function setDry(v: boolean): void;
export declare function info(msg: string): void;
export declare function warn(msg: string): void;
export declare function fail(msg: string): never;
export declare function die(msg: string): never;
export declare function check(name: string, ok: boolean, note?: string): boolean;
