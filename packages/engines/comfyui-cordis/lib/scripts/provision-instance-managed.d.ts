import type { EndpointConfig } from "./provision-config.ts";
/** Core-pin drift status (audit 005 E0's closing leg): compares the
 * runtime clone's HEAD to the project's core.pin. Pure seam — takes
 * the dirs, owns no globals — so the wall (core-pin-proof.spec.ts's
 * drift arm) can drive real git repos in temp dirs.
 * @param projectDir the infra/comfyui project holding core.pin
 * @param runtimeDir the engine clone whose HEAD is judged
 * @returns ok=false with a named message for every failure class:
 * missing pin, missing clone, drift; ok=true carries both shas. */
export declare function corePinStatus(projectDir: string, runtimeDir: string): {
    ok: boolean;
    message: string;
    head: string;
    pin: string;
};
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
export declare function pinManagerConfig(rt?: string): void;
export declare function cmdManifest(): void;
export declare function cmdBootCmd(cfg: EndpointConfig): void;
export declare function cmdVerify(cfg: EndpointConfig): Promise<void>;
