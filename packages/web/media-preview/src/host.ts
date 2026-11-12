// host.ts — @melite/media-preview: the HOST half (the composition
// marker, the card-base law).
//
// THE SHARE DOOR (operator 2026-11-12: "Look up in dsh, this already
// exists for images. The agent can already make a toolcall to show
// images in the chat window via explicit tool call. We just need to
// use this, and extend it for video and audio."): in-thread media
// sharing rides the HARNESS `present` toolcall — the delivery cards
// and the right-sidebar document seat it opens (DSH's
// dsh-client-ui-deliverables + dsh-client-ui-sidebar-documentpreview)
// — never a melite verb (the share-verb design is void; the run's
// own presentation stays banned by cards-chat-no-media). DSH's
// builtin renderer already covers images; THIS package extends the
// same seat for the estate's VIDEO and AUDIO vocabulary through the
// public renderer seam (ctx.documentPreviews.register +
// the sidebar.right.tab.document keyed slot).
//
// This face is ROW-MOUNTED in the web profile so the module table
// materializes the package for the browser graph; it registers
// NOTHING node-side. The client face (src/client/index.ts →
// lib/client.js) owns both registrations.
import type { Context } from '@deepseek-ai/cordis'

export const name = '@melite/media-preview'

export const inject: string[] = []

export function apply(_ctx: Context): void {
  /* the preview registrations ride the client face (lib/client.js) */
}
