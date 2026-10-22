import type { ModFields } from './service-faces.js';
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
export declare const LanpaintFields: z<Schemastery.ObjectS<NoInfer<{
    image1: z<string, string, "plain">;
    lanpaint_enabled: z<boolean, boolean, "defined">;
    lanpaint_num_steps: z<number, number, "defined">;
    lanpaint_step_size: z<number, number, "defined">;
    lanpaint_lambda: z<number, number, "defined">;
    lanpaint_beta: z<number, number, "defined">;
    lanpaint_friction: z<number, number, "defined">;
    lanpaint_prompt_mode: z<"positive" | "negative", "positive" | "negative", "defined">;
    outpaint_top: z<number, number, "defined">;
    outpaint_right: z<number, number, "defined">;
    outpaint_bottom: z<number, number, "defined">;
    outpaint_left: z<number, number, "defined">;
    outpaint_overlap: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    image1: z<string, string, "plain">;
    lanpaint_enabled: z<boolean, boolean, "defined">;
    lanpaint_num_steps: z<number, number, "defined">;
    lanpaint_step_size: z<number, number, "defined">;
    lanpaint_lambda: z<number, number, "defined">;
    lanpaint_beta: z<number, number, "defined">;
    lanpaint_friction: z<number, number, "defined">;
    lanpaint_prompt_mode: z<"positive" | "negative", "positive" | "negative", "defined">;
    outpaint_top: z<number, number, "defined">;
    outpaint_right: z<number, number, "defined">;
    outpaint_bottom: z<number, number, "defined">;
    outpaint_left: z<number, number, "defined">;
    outpaint_overlap: z<number, number, "defined">;
}>>, "plain">;
export declare const MaskFields: z<Schemastery.ObjectS<NoInfer<{
    mask: z<any, any, "plain">;
    input_mask: z<string, string, "plain">;
    mask_mode: z<"auto" | "full_frame" | "crop_stitch", "auto" | "full_frame" | "crop_stitch", "defined">;
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
    input_mask: z<string, string, "plain">;
    mask_mode: z<"auto" | "full_frame" | "crop_stitch", "auto" | "full_frame" | "crop_stitch", "defined">;
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
/** The lanpaint pack's rider keys (region-inpaint lanes). */
export declare const LANPAINT_RIDERS: readonly string[];
/** The mask pack's rider keys (region-modality lanes). */
export declare const MASK_RIDERS: readonly string[];
/** The qvoice pack's rider keys (voice-lock load lanes). */
export declare const QVOICE_RIDERS: readonly string[];
/** The qvoice_save pack's rider keys (voice export lanes). */
export declare const QVOICE_SAVE_RIDERS: readonly string[];
/** A pack contract — the CATEGORY (the Mod parent: LorasMod,
 *  ControlNetMod, LanPaintMod, MaskMod, the qvoice pack). Fields
 *  are the pack's knob block, inherited by every boarding family.
 *  (Moved from comfyui-cordis/serviceMods.ts — the pack vocabulary
 *  is kit-side DECL; the engine's registrar implements it.) */
export interface PackContract {
    readonly pack: string;
    readonly fields: ModFields;
}
//# sourceMappingURL=pack-fields.d.ts.map