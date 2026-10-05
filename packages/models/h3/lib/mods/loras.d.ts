import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
export declare const H3_LORA_ROWS: readonly [{
    readonly id: "h3_lightx2v_dareties";
    readonly filename: "h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors";
    readonly source_url: "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors";
    readonly label: "LightX2V dareties v4";
    readonly category: "distill";
    readonly default_strength: 0.8;
    readonly steps: 4;
}, {
    readonly id: "h3_lightx2v_turbo";
    readonly filename: "h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors";
    readonly source_url: "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors";
    readonly label: "LightX2V Turbo 4-8 step";
    readonly category: "distill";
    readonly default_strength: 0.6;
    readonly steps: 8;
    readonly steps_min: 4;
    readonly steps_max: 8;
}, {
    readonly id: "h3_turbo4_v1";
    readonly filename: "h3/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors";
    readonly source_url: "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors";
    readonly label: "LightX2V Turbo 4-Step v1.0 (768p)";
    readonly category: "distill";
    readonly default_strength: 1;
    readonly steps: 4;
}, {
    readonly id: "h3_turbo8_v1";
    readonly filename: "h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors";
    readonly source_url: "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors";
    readonly label: "LightX2V Turbo 8-Step v1.0";
    readonly category: "distill";
    readonly default_strength: 1;
    readonly steps: 8;
}, {
    readonly id: "h3_ref2v_turbo4";
    readonly filename: "h3/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors";
    readonly source_url: "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors";
    readonly label: "LightX2V Ref Turbo 4-Step v0.1";
    readonly category: "distill";
    readonly default_strength: 1;
    readonly steps: 4;
}, {
    readonly id: "h3_acc8_fl2va";
    readonly filename: "h3/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors";
    readonly source_url: "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors";
    readonly label: "Kijai FL2VA Acc 8-Step";
    readonly category: "distill";
    readonly default_strength: 1;
    readonly steps: 8;
}, {
    readonly id: "h3_acc8_ref2va";
    readonly filename: "h3/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors";
    readonly source_url: "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors";
    readonly label: "Kijai Ref2VA Acc 8-Step";
    readonly category: "distill";
    readonly default_strength: 1;
    readonly steps: 8;
}, {
    readonly id: "h3_larryvrh_v4_ema";
    readonly filename: "h3/minimax_h3_turbo_v4_step600_ema.safetensors";
    readonly source_url: "https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors";
    readonly label: "Larryvrh Turbo v4-600 EMA";
    readonly category: "distill";
    readonly default_strength: 1;
    readonly steps: 6;
    readonly steps_min: 4;
    readonly steps_max: 8;
}, {
    readonly id: "h3_pk_parasyte";
    readonly filename: "h3/H3-PK-Parasyte-Turbo.safetensors";
    readonly source_url: "https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors";
    readonly label: "PK Parasyte Turbo";
    readonly category: "distill";
    readonly default_strength: 1.5;
    readonly steps: 8;
    readonly steps_min: 6;
    readonly steps_max: 8;
}, {
    readonly id: "h3_taomate_3step";
    readonly filename: "h3/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors";
    readonly source_url: "https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors";
    readonly label: "TaoMate 3-Step (refiner)";
    readonly category: "distill";
    readonly default_strength: 0.7;
    readonly steps: 3;
}];
export declare function apply(ctx: Context): void;
