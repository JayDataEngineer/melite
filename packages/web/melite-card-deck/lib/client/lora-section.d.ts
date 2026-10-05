/**
 * lora-section.tsx — THE LORA BLOCK for the ComfyUI Manager sidebar
 * (the operator's 2026-09-26 order: "custom LoRAs should be in the
 * ComfyUI manager sidebar").
 *
 * It speaks the manage plane's own two doors — `lora_list` and
 * `lora_install` — so this is the same vocabulary every other sidebar
 * action uses, and the same refusal envelope on a refusal. The block
 * states the two facts a user cannot see otherwise:
 *
 * - what the ENGINE will accept (its own `LoraLoaderModelOnly` combo —
 *   a name outside it is a 400 at /prompt, after the money is spent),
 *   with the rows the engine does NOT have named here;
 * - the user's own rows, and the honest boundary: a copied file only
 *   enters the combo after a RESTART (core enumerates folder_paths at
 *   import — the only refresh primitive this repo owns).
 *
 * The install is a COPY of a file the operator already has — never a
 * fetch ("THERE SHOULD NOT BE A LORAS REMOTE / IT'S ALL BUILT IN").
 */
import * as React from 'react';
export interface LoraListData {
    engine_loras?: string[];
    user_rows?: Array<{
        id?: string;
        filename?: string;
        label?: string;
        families?: string[];
        default_strength?: number;
    }>;
    user_rows_path?: string;
    user_rows_present?: boolean;
    user_row_problems?: string[];
    unboarded?: string[];
    install_dir?: string;
}
export interface LoraInstallData {
    filename?: string;
    bytes?: number;
    in_combo_now?: boolean;
    restart_required?: boolean;
    row_suggestion?: Record<string, unknown>;
}
declare function LoraBlock(): ReturnType<typeof React.createElement>;
export default LoraBlock;
//# sourceMappingURL=lora-section.d.ts.map
