# garment-asset — current authoring guidance

Status: **CURRENT authoring guidance**. The loaded garment/equipment card is
the source of truth for its stage list and parameters.

## Agent loop

```text
melite_discover → melite_load → melite_construct
```

Compose the garment on the shared bench. In browser mode the user presses Run;
in a sanctioned headless commission, use `melite_flow` and `run_status`.

Describe the garment as a standalone product/asset when the loaded contract
requires it. Use only declared concept, mesh, texture, rig, and review
parameters. Do not send retired YAML fields, raw graph rows, script paths, or
an undeclared identity/model knob.

## Gates

Verify the actual run artifacts and the declared review views. If a required
pack/model is absent, report the provisioning refusal. Do not hide a failed
texture, rig, render, or delivery step behind a different lane.

A separate Unity delivery script may consume a verified GLB, but it is an
external post-processing step and is not part of the card's execution
contract.
