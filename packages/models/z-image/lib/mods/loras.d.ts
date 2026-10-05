import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
export declare const ZIMAGE_ROWS: {
    id: string;
    filename: string;
    source_url: string;
    label: string;
    category: string;
    default_strength: number;
}[];
export declare function apply(ctx: Context): void;
