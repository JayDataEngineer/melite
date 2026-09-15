import { t as LlmStreamSeam } from "./llm-complete-BR2qfbp4.mjs";
//#region src/doors.d.ts
declare const inject: string[];
/** Door config — same spelling as the tool plane's. */
interface Config {
  /**
   * The card LLM preference (operator order: "muse-spark-1.3-contributor
   * i want to use over glm-5v-turbo"): the route the ✦ enhance door
   * prefers BETWEEN the caller's explicit llm and the host default
   * model. An ordered candidate, never a contract — a name absent
   * from the live list falls to the default arm (llm-complete's
   * resolution law). An explicit empty string disables the arm.
   */
  enhancePreference?: string;
}
/** The shipped default: the operator's named card model. */
declare const DEFAULT_ENHANCE_PREFERENCE = "muse-spark-1.3-contributor";
/** Minimal structural view of the services the doors touch. */
interface CtxView {
  effect(effect: () => void, label?: string): unknown;
  llm: LlmStreamSeam;
  tools: {
    schemas(): Array<{
      name: string;
      description?: string;
      parameters?: unknown;
    }>;
  };
  webServer: {
    /** The host's bound port (the own-origin seam reads it live). */
    port: number;
    register(route: {
      kind: 'exact' | 'prefix';
      path: string;
      handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void;
    }): () => void;
  };
}
declare function apply(c: CtxView, config?: Config): void;
//#endregion
export { Config, DEFAULT_ENHANCE_PREFERENCE, apply, inject };