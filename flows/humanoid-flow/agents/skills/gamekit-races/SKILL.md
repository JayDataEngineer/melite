# gamekit-races — external delivery guidance

Status: **EXTERNAL/LEGACY DELIVERY**. The historical recipe references old
flow files, gateway routes, and machine-local delivery scripts. It is retained
for provenance only.

Current Melite composition is `melite_discover` → `melite_load` →
`melite_construct`; the user starts browser runs, and a sanctioned headless
commission may use `melite_flow`/`run_status`.

Do not use the old raw HTTP or YAML instructions in this file. If the separate
game-kit delivery workflow is explicitly enabled, follow that repository's
own current manifest, verification, and delivery gates and record its result
as an external receipt.
