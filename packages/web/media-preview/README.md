---
description: The share door's preview face — the estate's video and audio vocabulary registered into the GUI's sidebar document seat, so a presented artifact previews where a presented image already does.
kind: package-bundle
---

# media-preview

`@melite/media-preview` is the melite half of the share door (operator 2026-11-12: "Look up in dsh, this already exists for images. The agent can already make a toolcall to show images in the chat window via explicit tool call. We just need to use this, and extend it for video and audio."). In-thread media sharing rides the harness `present` toolcall — DSH's explicit delivery declaration, its delivery cards, and the right-sidebar document seat a card opens. Melite adds no verb; this package extends the seat's renderer vocabulary so the estate's video and audio artifacts preview instead of hitting the tab's unsupported-preview dead end ("a known binary container suffix without a registered renderer").

## Contract

The manifest declares `dsh.bundle.patch: ./cordis.patch.yml`, inserting the `media-preview` row (a web-surface row: the root render disables it when the composition carries no web app).

- `.` — the host marker (`name`, `inject`, `apply`); registers nothing node-side and stays node-safe (the card-base law).
- `./client` — the registrations: two `ctx.documentPreviews` definitions derived from `@melite/contracts` `mediaVocab` (`video`: mp4 webm mkv mov m4v avi; `audio`: wav flac mp3 ogg m4a aac qvoice — qvoice included so the tab opens the embedding face), each `binaryExtensions`-whole, `priority: 'extension'`, `loading: 'bytes-complete'`; and their bodies in the keyed `sidebar.right.tab.document` slot under the same ids. The video body mounts a native controls player from the shared bytes reader; the audio body mounts one for every playable name and renders the qvoice embedding note otherwise (`isPlayableAudioName` — the no-play-button law). Blob URLs mint with `contentTypeForArtifact` and revoke on change and unmount.

The seam is DSH's public extension point (the documentpreview package's registration API); nothing here touches the Sidebar's store, panes, or sequence, and no run presentation gains a face in the thread (cards-chat-no-media holds).

## Model Experience

### Request context and condition

#### What the model sees

Nothing directly. The plugin changes what the user's sidebar shows after the agent calls the harness `present` tool on an estate artifact; run results point the agent at that door (`melite-flow`'s host-paths arm).

#### Token effect

Zero — a client plugin with no tool schema.
