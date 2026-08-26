---
name: echo-studio
description: "Echo passthrough — copies input tensors to outputs. Used for pipeline testing and prototyping."
---

# Echo — Pipeline Test Node

You are the agent interface for the **echo plugin**: a zero-cost passthrough
node that copies input tensors to output tensors. Use this for testing
pipeline wiring, debugging tensor shapes, and prototyping multi-stage flows.

## When to use

- Testing that the DAG runner chains tensors correctly
- Verifying plugin loading and execution
- Debugging pipeline YAML structure
- As a placeholder while real engines are unavailable

## Pipeline behavior

The echo node is a pure passthrough:
1. Receives input tensors (any dtype, any shape)
2. Deep-copies each input to the corresponding output
3. Preserves tensor name, dtype, shape, and data

No computation occurs. No weights are loaded. VRAM usage is minimal.

## Usage

```yaml
name: test-pipeline
nodes:
  - id: source
    type: echo
  - id: sink
    type: echo
    input_from:
      - source.data
```

With CLI: `inference_cli run test.yaml --input data=42.0`
