import type { Context } from '@melite/comfyui-card-kit/card-definition';
import z from '@deepseek-ai/schemastery';
export declare const FPS = 24;
export declare const SAM3_CKPT = "sam3.1_multiplex_fp16.safetensors";
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    clip: z<string, string, "plain">;
    prompt: z<string, string, "defined">;
    face_prompt: z<string, string, "defined">;
    detection_threshold: z<number, number, "defined">;
    headroom: z<number, number, "defined">;
    hold_frames: z<number, number, "defined">;
    max_people: z<number, number, "defined">;
    mask_expand: z<number, number, "defined">;
    mannequin_blur: z<number, number, "defined">;
    mannequin_face_blur: z<number, number, "defined">;
    frame_load_cap: z<number, number, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    clip: z<string, string, "plain">;
    prompt: z<string, string, "defined">;
    face_prompt: z<string, string, "defined">;
    detection_threshold: z<number, number, "defined">;
    headroom: z<number, number, "defined">;
    hold_frames: z<number, number, "defined">;
    max_people: z<number, number, "defined">;
    mask_expand: z<number, number, "defined">;
    mannequin_blur: z<number, number, "defined">;
    mannequin_face_blur: z<number, number, "defined">;
    frame_load_cap: z<number, number, "defined">;
}>>, "plain">;
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
    principles: string[];
};
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=card.d.ts.map
