import { t as LlmStreamSeam } from "./llm-complete-CXD7-zEN.mjs";
//#region src/doors.d.ts
declare const inject: string[];
/** Door config — same spelling as the tool plane's. */
interface Config {}
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
export { Config, apply, inject };