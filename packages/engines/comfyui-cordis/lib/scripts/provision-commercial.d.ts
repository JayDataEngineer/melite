export declare const SOMAX_REF = "d29dbe5a3f5a";
export declare const S3DB_REF = "b5c765a0d89d";
export declare const COM_DEPS: readonly string[];
export declare const COM_NVIDIA_LIB = "lib/python3.11/site-packages/nvidia/cu13/lib";
export interface SomaxPatch {
    rel: string;
    bad: string;
    good: string;
}
export declare const SOMAX_PATCHES: readonly SomaxPatch[];
export declare function sha16File(p: string): string;
export declare function patchSomax(checkout: string): void;
export declare function cmdCommercial(warmup: boolean): void;
