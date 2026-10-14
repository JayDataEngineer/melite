import type { Context } from '@melite/comfyui-card-kit/card-definition';
export declare const inject: string[];
export declare const ZIMAGE_CONTROLNET_ROWS: {
    id: string;
    filename: string;
    source_url: string;
    label: string;
    category: string;
    default_strength: number;
    tooltip: string;
    preprocessor: string;
}[];
export declare function apply(ctx: Context): void;
