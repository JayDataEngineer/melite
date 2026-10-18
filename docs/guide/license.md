# License

Melite's code is licensed under the GNU Affero General Public License
v3.0 or later (**AGPL-3.0-or-later**) — see `LICENSE` in the repository
root.

- **Modified network service = share source.** If you modify Melite and
  offer it to users over a network — commercially or not — AGPL §13
  requires you to offer those users the Corresponding Source of your
  modified version, including your changes.
- **No proprietary forks.** Conveying Melite, in whole or in part,
  cannot strip or further restrict these terms.

## Models and assets keep their own licenses

The AGPL governs **this repository's code**. It does not relicense model
weights, checkpoints, LoRAs, control nets, datasets, or other
third-party artifacts that Melite downloads, provisions, or references.
Every provisioned artifact carries its own upstream license, and where
that license is more restrictive than AGPL — for example
non-commercial research-only weights — the upstream license prevails
for that artifact. Commercial use of a model is cleared, or refused, by
that model's license, never by this repository's.

Vendored code under `vendor/` retains its upstream licenses. Full scope
and carve-outs: `NOTICE.md` in the repository root.
