import type { ModFields } from './service-faces.ts';
import z from '@deepseek-ai/schemastery';
import type Schema from '@deepseek-ai/schemastery';
export interface LorasShape {
    loras: Array<{
        name: string;
        strength: number;
        steps: number;
    }>;
}
export declare const LorasFields: Schema<LorasShape>;
export interface ControlNetShape {
    controlnets: Array<{
        type: string;
        image_b64: string;
        artifact: string;
        strength: number;
        start_percent: number;
        end_percent: number;
        enabled: boolean;
        clip: string;
        mask: string;
    }>;
    controlnet_strength_floor: number;
}
export declare const ControlNetFields: Schema<ControlNetShape>;
export interface IPAdapterShape {
    ip_adapters: Array<{
        image: string;
        kind: string;
        weight: number;
    }>;
}
export declare const IPAdapterFields: Schema<IPAdapterShape>;
export declare const MASK_DENOISE_DEFAULT = 1;
export declare const MaskFields: z<Schemastery.ObjectS<NoInfer<{
    mask: z<any, any, "plain">;
    input_image: z<string, string, "plain">;
    input_mask: z<string, string, "plain">;
    mask_mode: z<"auto" | "crop_stitch" | "full_frame", "auto" | "crop_stitch" | "full_frame", "defined">;
    mask_detector: z<"person" | "face" | "hand" | "off", "person" | "face" | "hand" | "off", "defined">;
    mask_context_pad: z<number, number, "defined">;
    mask_grow: z<number, number, "defined">;
    mask_feather: z<number, number, "defined">;
    mask_threshold: z<number, number, "defined">;
    mask_invert: z<boolean, boolean, "defined">;
    mask_detail_size: z<number, number, "defined">;
    mask_denoise: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    mask: z<any, any, "plain">;
    input_image: z<string, string, "plain">;
    input_mask: z<string, string, "plain">;
    mask_mode: z<"auto" | "crop_stitch" | "full_frame", "auto" | "crop_stitch" | "full_frame", "defined">;
    mask_detector: z<"person" | "face" | "hand" | "off", "person" | "face" | "hand" | "off", "defined">;
    mask_context_pad: z<number, number, "defined">;
    mask_grow: z<number, number, "defined">;
    mask_feather: z<number, number, "defined">;
    mask_threshold: z<number, number, "defined">;
    mask_invert: z<boolean, boolean, "defined">;
    mask_detail_size: z<number, number, "defined">;
    mask_denoise: z<number, number, "defined">;
}>>, "plain">;
export declare const QvoiceFields: z<Schemastery.ObjectS<NoInfer<{
    qvoice: z<string, string, "plain">;
    voice_strength: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    qvoice: z<string, string, "plain">;
    voice_strength: z<number, number, "defined">;
}>>, "plain">;
export declare const QvoiceSaveFields: z<Schemastery.ObjectS<NoInfer<{
    save_qvoice: z<boolean, boolean, "plain">;
    voice_name: z<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    save_qvoice: z<boolean, boolean, "plain">;
    voice_name: z<string, string, "plain">;
}>>, "plain">;
/** The loras pack's rider keys (every card boarding a lora family). */
export declare const LORAS_RIDERS: readonly string[];
/** The mask pack's rider keys (region-modality lanes). */
export declare const MASK_RIDERS: readonly string[];
/** THE REGION ENTRY VOCABULARY (the D11 burn's silent-drop cure):
 *  the keys ONE mask-bag entry may lawfully carry — every declared
 *  mask_* knob plus the painted-mask seat, plus mask_detector_
 *  threshold (image-edit's own rider beside MASK_RIDERS). The bag
 *  key 'mask' itself is NOT entry vocabulary (it declares the bag,
 *  never a field inside an entry); refuseRegionEntryFields (lanes-
 *  image) refuses every other key loud, so a stated field that
 *  reaches no node can never compose silently again. */
export declare const REGION_ENTRY_FIELDS: readonly string[];
/** The qvoice pack's rider keys (voice-lock load lanes). */
export declare const QVOICE_RIDERS: readonly string[];
/** The qvoice_save pack's rider keys (voice export lanes). */
export declare const QVOICE_SAVE_RIDERS: readonly string[];
/** A pack contract — the CATEGORY (the Mod parent: LorasMod,
 *  ControlNetMod, MaskMod, the qvoice pack). Fields
 *  are the pack's knob block, inherited by every boarding family.
 *  (Moved from comfyui-cordis/serviceMods.ts — the pack vocabulary
 *  is kit-side DECL; the engine's registrar implements it.) */
export interface PackContract {
    readonly pack: string;
    readonly fields: ModFields;
}
//# sourceMappingURL=pack-fields.d.ts.map