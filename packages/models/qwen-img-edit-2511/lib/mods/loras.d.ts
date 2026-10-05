import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
export declare const QWEN_EDIT_ROWS: ({
    id: string;
    filename: string;
    source_url: string;
    label: string;
    category: string;
    default_strength: number;
    steps: number;
    tooltip?: undefined;
} | {
    id: string;
    filename: string;
    source_url: string;
    label: string;
    category: string;
    default_strength: number;
    tooltip: string;
    steps?: undefined;
} | {
    id: string;
    filename: string;
    source_url: string;
    label: string;
    category: string;
    default_strength: number;
    steps?: undefined;
    tooltip?: undefined;
})[];
export declare function apply(ctx: Context): void;
