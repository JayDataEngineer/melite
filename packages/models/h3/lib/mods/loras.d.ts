import type { Context } from '@melite/comfyui-card-kit/card-definition';
export declare const inject: string[];
/** One catalog row's shape — the married columns are OPTIONAL by
 * law (a row without shift_video declares no shift opinion; the
 * schema's declared default owns), and the compose-side marriage
 * reads both knobs through one dynamic key, so the table's row
 * type names them. */
export interface H3LoraRow {
    readonly id: string;
    readonly filename: string;
    readonly source_url: string;
    readonly label: string;
    readonly category: string;
    readonly default_strength: number;
    readonly steps: number;
    readonly steps_min?: number;
    readonly steps_max?: number;
    readonly shift_video?: number;
}
export declare const H3_LORA_ROWS: readonly H3LoraRow[];
export declare function apply(ctx: Context): void;
