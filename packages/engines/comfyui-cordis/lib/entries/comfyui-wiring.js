// entries/comfyui-wiring.ts — the wiring doc service's provider
// address (the second wiringWall reseat): engine state two seats
// must share is a CONTEXT SERVICE under its own name, not module
// state. Mount BEFORE the host and the engines adapter (the
// estate bundle's row order) so the compose seat, the run seat's
// fence, and the adapter's post-splice walk all read the same doc
// from first submit; a composition without this row reads
// undefined and every wall stands down (the documented law).
export { comfyuiWiringProvider as default } from "../wiringWall.js";
//# sourceMappingURL=comfyui-wiring.js.map
