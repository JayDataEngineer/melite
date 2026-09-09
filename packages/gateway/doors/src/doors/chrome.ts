// FROZEN by packages/gateway/shell/scripts/capture_chrome.py — DO
// NOT EDIT the frozen constants. Generator RETIRED 2026-09-08 with
// the py oracle (capture_chrome.py deleted — hygiene sweep; the
// constants below are the frozen contract). Each constant holds
// the EXACT json.dumps(payload, indent=2, default=str) bytes the
// retired py oracle's _adapt sent (frozen at capture — the oracle
// died 2026-09-08, these bytes are the contract); the doors serve
// them verbatim (parse+reserialize would drift: ensure_ascii
// \uXXXX vs raw UTF-8, py float 1.0 vs number 1).
//
// 2026-09-09 (M1): TOOLS_JSON is DELETED — the card emits the
// tool. /v1/tools serves entirely from the primed card registry
// (doors/toolsEmit.ts over toolProjection.ts); no frozen base doc
// remains. The /v1/tools row in CHROME_PATHS stays (the door
// exists, live); its CHROME_BODIES row is gone (the live branch
// in chromeDoors.ts fires first and owns the path).
//
// Erasable-syntax TS only (node --experimental-strip-types):
// plain string constants, no enums.

// J door: GET /v1/health
export const HEALTH_JSON: string = "{\n  \"status\": \"ok\",\n  \"version\": \"0.1.0\"\n}";

// J door: GET /v1/themes
export const THEMES_JSON: string = "{\n  \"themes\": []\n}";

// J door: GET /v1/tags
export const TAGS_JSON: string = "{\n  \"tags\": []\n}";

// J door: GET /v1/services
export const SERVICES_JSON: string = "{\n  \"services\": []\n}";

// J door: GET /v1/right-panes
export const RIGHT_PANES_JSON: string = "{\n  \"panes\": []\n}";

// J door: GET /v1/ui-slots
export const UI_SLOTS_JSON: string = "{\n  \"uiSlots\": [\n    {\n      \"plugin\": \"3d\",\n      \"id\": \"mesh-viewer\",\n      \"slot\": \"mesh-viewer\",\n      \"precedence\": 10,\n      \"title\": \"GLB mesh viewer (3d default)\"\n    },\n    {\n      \"plugin\": \"audio\",\n      \"id\": \"audio-viewer\",\n      \"slot\": \"audio-viewer\",\n      \"precedence\": 10,\n      \"title\": \"Audio viewer (audio default)\"\n    },\n    {\n      \"plugin\": \"motion\",\n      \"id\": \"motion-viewer\",\n      \"slot\": \"motion-viewer\",\n      \"precedence\": 10,\n      \"title\": \"Motion NPZ viewer (motion default)\"\n    },\n    {\n      \"plugin\": \"video\",\n      \"id\": \"video-viewer\",\n      \"slot\": \"video-viewer\",\n      \"precedence\": 10,\n      \"title\": \"Video player (video default)\"\n    }\n  ]\n}";

// J door: GET /v1/shell
export const SHELL_JSON: string = "{\n  \"entries\": []\n}";

// J door: GET /v1/plugins
export const PLUGINS_JSON: string = "{\n  \"plugins\": []\n}";

// J door: GET /v1/models
export const MODELS_JSON: string = "{\n  \"object\": \"list\",\n  \"data\": []\n}";

// Path -> exact wire bytes (status 200, application/json).
export const CHROME_BODIES: Record<string, string> = {
  "/v1/health": HEALTH_JSON,
  "/v1/themes": THEMES_JSON,
  "/v1/tags": TAGS_JSON,
  "/v1/services": SERVICES_JSON,
  "/v1/right-panes": RIGHT_PANES_JSON,
  "/v1/ui-slots": UI_SLOTS_JSON,
  "/v1/shell": SHELL_JSON,
  "/v1/plugins": PLUGINS_JSON,
  "/v1/models": MODELS_JSON,
};

// The ten Phase-1 doors in J1-J10 order.
export const CHROME_PATHS: readonly string[] = [
  "/v1/health",
  "/v1/themes",
  "/v1/tags",
  "/v1/services",
  "/v1/right-panes",
  "/v1/ui-slots",
  "/v1/tools",
  "/v1/shell",
  "/v1/plugins",
  "/v1/models",
];
