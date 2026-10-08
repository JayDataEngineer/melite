import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { type ActionBinding as Binding } from '@melite/comfyui-card-kit';
import type { ComfyUIService } from '@melite/comfyui-cordis/service';
export declare const schema: z<Schemastery.ObjectS<NoInfer<{
    prompt: z<string, string, "plain">;
    seed: z<number, number, "defined">;
    duration_sec: z<number, number, "defined">;
    diffusion_steps: z<number, number, "defined">;
    num_samples: z<number, number, "defined">;
    num_transition_frames: z<number, number, "defined">;
    cfg_type: z<string, string, "defined">;
    cfg_weight_a: z<number, number, "defined">;
    cfg_weight_b: z<number, number, "defined">;
    motion_npz: z<string, string, "plain">;
    motion_prompts: z<string, string, "plain">;
    motion_constraints: z<string, string, "plain">;
    preview_glb: z<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    prompt: z<string, string, "plain">;
    seed: z<number, number, "defined">;
    duration_sec: z<number, number, "defined">;
    diffusion_steps: z<number, number, "defined">;
    num_samples: z<number, number, "defined">;
    num_transition_frames: z<number, number, "defined">;
    cfg_type: z<string, string, "defined">;
    cfg_weight_a: z<number, number, "defined">;
    cfg_weight_b: z<number, number, "defined">;
    motion_npz: z<string, string, "plain">;
    motion_prompts: z<string, string, "plain">;
    motion_constraints: z<string, string, "plain">;
    preview_glb: z<string, string, "plain">;
}>>, "plain">;
export declare const BOARDED: string[];
export declare const ACTION_BINDINGS: Record<string, Binding>;
/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export declare const identity: {
    label: string;
    description: string;
    genre: string;
    icon: string;
};
/** The CARD face's plugin apply (the dual-face law, 2026-09-12):
 * the cardPackages SSOT composes THIS subpath in the engine plane —
 * '@melite/motion-motion/card' — where the registry seat lives. The
 * package root is the web profile's row-mount marker (the tool ride
 * is melite-tools', the studio ride is the client face's). */
export declare const inject: string[];
export declare function apply(ctx: Context): void;
export declare function registerCard(ctx: Context, comfy: ComfyUIService): void;
//# sourceMappingURL=card.d.ts.map
