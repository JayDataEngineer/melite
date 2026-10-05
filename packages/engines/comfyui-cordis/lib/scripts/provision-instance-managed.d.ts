import type { EndpointConfig } from "./provision-config.js";
export declare function cmdSync(cfg: EndpointConfig): void;
export declare const MANAGER_PIN_F: string;
/** Pin text from infra/comfyui/manager.pin (comments stripped). */
export declare function managerPin(): string;
/** THE AUTO-BUILD (the no-external-python stroke, 2026-09-10): the
 *  vendor ComfyUI-Manager rides ComfyUI's own port as a custom node
 *  — cloned at the pinned ref into custom_nodes/, its requirements
 *  installed into the serving venv, and its config pinned under
 *  user/__manager/ (security_level=normal-, both allow flags) so
 *  the loopback-listen engine admits installs. Users start the
 *  engine; the manager is already in it (the estate never spawns a
 *  separate manager process). */
export declare function vendorManager(): void;
/** Write/verify the manager config pins. The vendor reads this file
 *  ONCE at ComfyUI startup — drift is warned, never silently
 *  rewritten (a running engine would not see the write). */
export declare function pinManagerConfig(runtime?: string): void;
export declare function cmdManifest(): void;
export declare function cmdBootCmd(cfg: EndpointConfig): void;
export declare function cmdVerify(cfg: EndpointConfig): Promise<void>;
