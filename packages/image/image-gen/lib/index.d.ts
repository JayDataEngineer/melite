import type { EstateCall } from '@melite/estate-call';
import type { Context } from '@melite/comfyui-card-kit/card-definition';
import Schema from '@deepseek-ai/schemastery';
export declare const name = "@melite/image-gen";
export declare const inject: string[];
/** The documented Config idiom (tutorial ch.5): the interface is
 *  the type, the const is the runtime schema, one name. The env
 *  var resolves INSIDE the schema default — a schema-side
 *  .default() would otherwise mask it at every use site. */
export interface Config {
    /** The lane seam (R2b law): the registrar (melite-tools) hands the
     *  call shape; the card never owns transport. The schema keeps the
     *  idiom for structure while the seam itself is threaded, not
     *  configured — Schema.any() admits the injected function. */
    call: EstateCall;
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map
