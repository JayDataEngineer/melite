// Type declaration for copilotkit-vite-plugin.mjs (2026-08-08).
//
// The plugin is plain JS (.mjs) — no declarations shipped. Without this
// file, `tsc -b` (the `npm run build` typecheck) fails with TS7016
// "Could not find a declaration file for module './copilotkit-vite-plugin.mjs'"
// and the production bundle can never be built. TypeScript resolves
// ./copilotkit-vite-plugin.mjs → this sibling .d.mts automatically.
import type { Plugin } from "vite"

declare const copilotkitPlugin: () => Plugin
export default copilotkitPlugin
