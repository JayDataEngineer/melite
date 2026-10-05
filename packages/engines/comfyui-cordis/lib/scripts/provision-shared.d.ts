export declare const HERE: string;
export declare const REPO: string;
export declare const DEFAULT_CONFIG: string;
export declare const ROOT_CONFIG: string;
export declare const RUNTIME: string;
export declare const COMFY_PROJECT: string;
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
