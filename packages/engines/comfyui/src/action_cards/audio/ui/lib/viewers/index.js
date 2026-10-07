/**
 * audio ui/viewers — the AUDIO VIEWER ELEMENTS (§16.9 tenant
 * library). Public surface: "@melite-plugin/audio/ui/viewers".
 *
 * AudioPlayer (WaveSurfer transport) + AudioWaveform (the read-only
 * peaks cell) — moved out of web/editor surfaces/assets + components
 * 2026-08-21: audio playback is audio domain, and the kernel
 * AssetMedia dispatcher / card preview cells consume them through the
 * declared workspace edge, same as any curated-tier tenant.
 */
export * from "./AudioPlayer.js";
export * from "./AudioWaveform.js";
//# sourceMappingURL=index.js.map
