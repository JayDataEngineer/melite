/** THE LORA EXTENSION SSOT — the one allowlist's tier-agnostic home.
 *
 *  History: the list lived in @melite/comfyui-cordis/user-loras and the
 *  engine seats consumed it from there (lora audit F1, commit
 *  038fd6a40). The browser seats could not: that module reads node:fs,
 *  and a client bundle may not inline it. @melite/contracts is a
 *  declared dependency of card-base, melite-card-deck AND
 *  comfyui-cordis, so the literal moved here — one initializer on the
 *  tree — and the engine seam re-exports it verbatim (userLoras.ts),
 *  keeping the F1 law: the rows-file validator, the tray scan, the OS
 *  file dialogs and the field copy all judge the same file universe
 *  (lora audit F2, 2026-11-15). */
export const LORA_EXTENSIONS = ['.safetensors', '.ckpt', '.pt', '.bin', '.gguf'];
/** The OS file-dialog accept value, DERIVED from the list — the two
 *  upload seats (card-base's upload square, the Manager sidebar's
 *  copy-in row) consume this instead of spelling the list a second
 *  time. */
export const LORA_ACCEPT = LORA_EXTENSIONS.join(',');
/** The filename-suffix strip regex, DERIVED from the list — the label
 *  helper strips every extension the roster registers, never a
 *  hand-picked subset (lora audit F3: the legacy
 *  `\.(safetensors|pt|ckpt)$` spelling kept the extension on `.bin`
 *  and `.gguf` labels). */
export const LORA_EXTENSION_SUFFIX_RE = new RegExp('\\.(?:' + LORA_EXTENSIONS.map((e) => e.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')$');
//# sourceMappingURL=loraExtensions.js.map