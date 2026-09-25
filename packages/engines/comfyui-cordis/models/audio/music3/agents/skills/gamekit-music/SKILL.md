---
name: gamekit-music
description: Gameplay music through the declared Music3 card and shared bench
---

# gamekit-music

## Provisioning

Use the current provisioning/management contract for declared resources. The
skill does not own a downloader, a `sync.sh`, or a separate Manager client.

## Compose and run

Use `melite_discover` → `melite_load` → `melite_construct`. Add the Music3
card with the loaded caption and preset fields. Browser sessions stop at the
user's Run press; a sanctioned headless commission may use `melite_flow` and
`run_status`.

The caption remains the primary creative control. Use the loaded schema for
section structure, preset names, seeds, and duration. Do not infer a missing
preset or silently substitute another music lane.

## Gate and delivery

Verify the returned audio artifact through the run/media surface and report
its name, seed, and duration. An external game-kit copy/manifest step is
separate and must have its own verification receipt.
