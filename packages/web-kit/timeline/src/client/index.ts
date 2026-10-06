/**
 * timeline client entry — the package's browser face. Its src
 * components import the row door (`@melite/card-base/client` —
 * Tip, the drag mime, the icon set), so the browser require needs
 * this package to ship the face the loader serves
 * (exports['./client'] → lib/client/index.js; the card-one-row
 * wall "a phantom require loads nothing", cure 2026-10-13).
 * The surface is the UI kit itself: the three doors the studio
 * tenants consume, re-exported from their one home — plus the
 * door primitives the kit serves onward (icons.tsx re-exports
 * the icon set to the components; the entry re-states them so
 * the face's bundle carries the door require the external
 * declaration promises — same symbols, one door).
 */
export { ASSET_DRAG_MIME, Film, Image, Tip, Upload, X } from '@melite/card-base/client'
export * from '../timeline/index.ts'
export * from '../store/index.ts'
export * from '../playback/index.ts'
