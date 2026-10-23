import type { EstateCall } from '@melite/estate-call';
import type { Context } from '@melite/comfyui-card-kit/card-definition';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "@melite/audio/tts";
export declare const inject: string[];
/** The documented Config idiom (tutorial ch.5): the interface is
 *  the type, the const is the runtime schema, one name. The env
 *  var resolves INSIDE the schema default — a schema-side
 *  .default() would otherwise mask it at every use site. */
export interface Config {
    /** The lane seam (R2b law): threaded by the registrar, never configured. */
    call: EstateCall;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map