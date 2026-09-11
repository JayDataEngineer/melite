import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
/** One lora row as the mods tree declares it (LoraRowDecl,
 *  structural — the engine seat's shape). */
export interface LoraRow {
    readonly id: string;
    readonly filename: string;
    readonly source_url: string;
    readonly label?: string;
    readonly category?: string;
    readonly default_strength?: number;
}
/** `loras/list`'s answer — the picker's exact consumption shape
 *  (the old /v1/loras lane's row, kept verbatim so the UI logic is
 *  untouched): filenames plus meta keyed by filename stem. */
export interface LoraCatalogRow {
    readonly model: string;
    readonly loras: readonly string[];
    readonly meta: Readonly<Record<string, LoraMetaRow>>;
    readonly note: string | null;
}
/** Catalog-declared per-LoRA metadata (keyed by filename stem). */
export interface LoraMetaRow {
    readonly label?: string;
    readonly category?: string;
    readonly default_strength?: number;
}
/** The remote's failure codes, merged into the protocol's ONE
 *  vocabulary (cookbook §2: declaration merging, next to the throw). */
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** The model argument is not a non-empty family id. */
        "loras/invalid-request": {
            readonly loc: string;
            readonly got: unknown;
        };
    }
}
/** The comfyui seat's adapter-facing surface (structural — the
 *  implementation is ComfyUIService in @melite/comfyui-cordis; the
 *  wall pins the delegation). */
interface ComfySeat {
    modCatalog(pack: string, family: string): {
        rows: readonly LoraRow[];
        shared: boolean;
    };
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        lorasRemote: LorasRemoteService;
        /** The engine seat (@melite/comfyui-cordis's ComfyUIService —
         *  structural here, per the header). */
        comfyui: ComfySeat;
    }
}
/** The loras remote: one list over the seat's mod catalog. */
export declare class LorasRemoteService extends TypertRemoteService {
    static inject: string[];
    constructor(ctx: Context);
    /** Endpoint `loras/list` — one family's pick catalog (the
     *  runtime catalog law rides the seat: family rows win over the
     *  union; a family with no lora flavor answers empty, honestly —
     *  an empty catalog is DATA, never an error). */
    remoteExportList(model: string, signal: AbortSignal): Promise<LoraCatalogRow>;
}
/** The loras remote row (the estate mounts it after the seat). */
export declare const lorasRemotePlugin: {
    name: string;
    inject: readonly ["comfyui"];
    apply(ctx: Context): void;
};
export {};
//# sourceMappingURL=index.d.ts.map
