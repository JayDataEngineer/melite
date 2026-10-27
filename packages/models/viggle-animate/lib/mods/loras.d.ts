import type { Context } from '@melite/comfyui-card-kit/card-definition';
export declare const inject: string[];
/** One catalog row's shape — the married steps column is OPTIONAL
 *  by law (a row without it declares no step opinion; the schema's
 *  declared default owns). */
export interface ViggleLoraRow {
    readonly id: string;
    readonly filename: string;
    readonly source_url: string;
    readonly label: string;
    readonly category: string;
    readonly default_strength: number;
    readonly steps?: number;
    readonly steps_min?: number;
    readonly steps_max?: number;
}
export declare const VIGGLE_LORA_ROWS: readonly ViggleLoraRow[];
export declare function apply(ctx: Context): void;
