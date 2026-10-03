# Melite — license scope and notices

## Code license

The source code of Melite is licensed under the GNU Affero General Public
License v3.0 or later (AGPL-3.0-or-later); see [LICENSE](LICENSE). Two
consequences are worth naming plainly:

- **Modified network service = share source.** If you modify Melite and
  offer it to users over a network — commercially or not — AGPL §13
  requires you to offer those users the Corresponding Source of your
  modified version, including your changes. Business use of modified
  code is permitted only on these terms.
- **No proprietary forks.** Conveying Melite, in whole or in part,
  cannot strip or further restrict these terms (AGPL §10).

## Model and asset licenses take precedence for models and assets

The AGPL above governs **this repository's code**. It does not relicense
model weights, checkpoints, LoRAs, control nets, datasets, or other
third-party artifacts that Melite downloads, provisions, or references:

- Every provisioned artifact carries **its own upstream license**
  (declared by its provider — e.g. Hugging Face model cards, ComfyUI
  pack manifests, or vendor release pages). Where that license is more
  restrictive than AGPL — for example non-commercial research-only
  weights — **the upstream license prevails** for that artifact.
- Downloading an artifact through Melite grants no rights beyond the
  artifact's own license. Commercial use of a model is cleared, or
  refused, by that model's license, never by this repository's.
- Nothing in AGPL §7 widens or narrows any artifact license.

## Vendored code keeps its upstream license

Third-party code vendored under `vendor/` retains its upstream license
and copyright notice (each pack carries its own LICENSE file). It is
distributed here in compliance with those licenses; the AGPL terms
apply to the combined work as distributed from this repository.

## Trademark

The name "Melite" and project branding are not licensed for promotional
or endorsement use by redistributors under the code license.
