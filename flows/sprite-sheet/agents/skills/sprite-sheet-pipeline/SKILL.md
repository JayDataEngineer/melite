# sprite-sheet pipeline — current authoring guidance

Status: **CURRENT authoring guidance**. Use the live sprite-sheet/image cards
and the shared bench.

## Agent loop

```text
melite_discover → melite_load → melite_construct
```

Use `melite_construct` to author frame generation, background edit, and sheet
assembly stages declared by the loaded flow. Browser sessions stop at the
user's Run press. A sanctioned headless commission may use `melite_flow` and
`run_status`.

## Verification

Give each frame an explicit pose/order identity. Confirm every input artifact
before assembly, then inspect the final sheet's dimensions, transparency, and
frame order. Do not call raw estate HTTP, use a retired YAML lane, or invent
an assembly script path.
