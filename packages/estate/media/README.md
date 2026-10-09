---
description: The runs media route — serves run artifacts same-origin under the DSH origin with realpath containment, plus its Typert remote.
kind: package-library
---

# @melite/estate-media

`@melite/estate-media` serves run artifacts to web surfaces. It registers
`GET /melite-media/runs/<runId>/<rel>` on the host webServer seat and reads
the runs output tree directly — the same tree the queue seat owns, with
roots from the seat's `stateRoot`/`stateRoots` manifest, never a hardcoded
path. No injected service is required: on a headless mount the route simply
does not mount, loud; an absent queue seat at use time is a loud 502. The
package also carries the media Typert remote.

## Contract

- Grammar: `GET /melite-media/runs/<runId>/<rel>`; `rel` is confined (no
  `..`, no leading `/`, no empty segments), and the resolved file must stay
  inside the run dir by realpath, not regex trust. GET/HEAD only, else 405;
  a miss is a loud 404.
- Root order is the contract's cross-root order, own root first: a run id
  present in two trees resolves first-root-wins, the same bytes for every
  reader.
- Range requests ride the shared media-range parser; content types come
  from the shared media-kind vocabulary.
- Declared exports: `.` (route + remote plugin), `./types` (shared types),
  `./typert` (generated host-face declaration), `./remote` (generated
  browser client), `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — artifacts become model-visible only when another surface (a tool
result or an attachment) reads them; the route itself serves bytes to
browsers.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **Same-origin only** — the route serves under the DSH origin; there is no
  signed-URL or cross-origin face.
- **First-root-wins on run-id collision** — cross-root resolution is order,
  not content; a duplicated run id shadows its twin.
