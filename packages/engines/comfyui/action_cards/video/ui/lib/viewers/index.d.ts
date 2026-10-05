/**
 * video ui/viewers — the VIDEO VIEWER ELEMENT (§16.9 tenant
 * library). Public surface: "@melite-plugin/video/ui/viewers".
 *
 * VideoPlayer (the hover-scrub transport) — moved out of
 * web/editor surfaces/assets 2026-08-21: video playback is video
 * domain; kernel AssetMedia consumes it through the declared workspace
 * edge (editor → video, already law).
 */
export * from "./VideoPlayer.js";
