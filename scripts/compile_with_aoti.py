#!/usr/bin/env python3
"""
compile_with_aoti.py — Compile PyTorch models to C++ via AOTInductor.

Produces a .pt2 package (weights + compiled C++ code) that can be loaded
in inference.cpp via libtorch with zero Python at runtime.

Usage:
    python3 scripts/compile_with_aoti.py --model-dir models/sd-unet/ --output sd-unet.pt2
    python3 scripts/compile_with_aoti.py --model-dir models/clip/ --output clip.pt2 --dynamic-batch
"""

import argparse
import json
import os
import sys
from pathlib import Path


def export_model(model_dir: str, output_path: str, dynamic_batch: bool = False):
    """Export a PyTorch model via AOTInductor."""
    import torch
    from torch.export import export, Dim

    model_path = Path(model_dir)

    # Detect model type and prepare inputs
    print(f"Scanning {model_dir}...")

    # Try to load model config
    config = {}
    config_file = model_path / "config.json"
    if config_file.exists():
        with open(config_file) as f:
            config = json.load(f)
        print(f"  Found config.json: {config.get('model_type', 'unknown')}")

    # Detect architecture from files
    arch = detect_architecture(model_path, config)
    print(f"  Detected architecture: {arch}")

    # Load model
    print(f"  Loading model weights...")
    model = load_model_for_export(model_path, arch, config)

    # Create example inputs
    example_inputs = create_example_inputs(arch, config, dynamic_batch)

    # Export
    print(f"  Exporting with torch.export...")
    dynamic_shapes = None
    if dynamic_batch:
        batch_dim = Dim("batch", min=1, max=32)
        dynamic_shapes = create_dynamic_shapes(arch, batch_dim)

    exported = export(model, example_inputs, dynamic_shapes=dynamic_shapes)
    print(f"  Exported graph has {len(list(exported.graph.nodes))} nodes")

    # Compile with AOTInductor
    print(f"  Compiling with AOTInductor...")
    from torch._inductor.aoti_compile_and_package import aoti_compile_and_package

    aoti_compile_and_package(
        exported,
        package_path=output_path,
    )

    # Report results
    output_size = os.path.getsize(output_path) / 1024 / 1024
    print(f"\nCompilation complete!")
    print(f"  Output: {output_path}")
    print(f"  Size: {output_size:.1f} MB")
    print(f"  Architecture: {arch}")
    print(f"  Dynamic batch: {dynamic_batch}")

    # Also generate the C header
    header_path = output_path.replace(".pt2", ".h")
    generate_c_header(arch, header_path)
    print(f"  Header: {header_path}")


def detect_architecture(model_path: Path, config: dict) -> str:
    """Detect model architecture from files."""
    model_type = config.get("model_type", "")

    if model_type in ("sd", "stable-diffusion", "sdxl", "flux"):
        return "unet"
    if model_type in ("clip", "text-encoder"):
        return "clip"
    if model_type in ("vae",):
        return "vae"
    if model_type in ("llama", "mistral", "qwen"):
        return "llm"
    if model_type in ("whisper",):
        return "whisper"

    # Check file patterns
    safetensors = list(model_path.glob("*.safetensors"))
    if safetensors:
        names = [s.stem for s in safetensors]
        if any("unet" in n.lower() for n in names):
            return "unet"
        if any("clip" in n.lower() or "text_encoder" in n.lower() for n in names):
            return "clip"
        if any("vae" in n.lower() for n in names):
            return "vae"

    return "generic"


def load_model_for_export(model_path: Path, arch: str, config: dict):
    """Load model ready for export."""
    import torch

    # This is a template — real implementation depends on model architecture
    if arch == "unet":
        from diffusers import UNet2DConditionModel
        model = UNet2DConditionModel.from_pretrained(
            str(model_path), subfolder="unet"
        )
    elif arch == "clip":
        from transformers import CLIPTextModel
        model = CLIPTextModel.from_pretrained(str(model_path))
    elif arch == "vae":
        from diffusers import AutoencoderKL
        model = AutoencoderKL.from_pretrained(str(model_path))
    elif arch == "llm":
        from transformers import AutoModelForCausalLM
        model = AutoModelForCausalLM.from_pretrained(str(model_path))
    else:
        raise ValueError(f"Unknown architecture: {arch}. "
                         "Please provide a custom model loader.")

    model.eval()
    return model


def create_example_inputs(arch: str, config: dict, dynamic_batch: bool):
    """Create example input tensors for export."""
    import torch

    batch = 1
    if arch == "unet":
        return (
            torch.randn(batch, 4, 64, 64),           # latent
            torch.tensor([0.0]),                       # timestep
            torch.randn(batch, 77, 768),               # CLIP context
        )
    elif arch == "clip":
        return (
            torch.randint(0, 49408, (batch, 77)),     # input_ids
        )
    elif arch == "vae":
        return (
            torch.randn(batch, 4, 64, 64),            # latent
        )
    elif arch == "llm":
        seq_len = config.get("max_seq_len", 2048)
        return (
            torch.randint(0, 32000, (batch, seq_len)), # input_ids
        )
    else:
        return (torch.randn(1, 3, 224, 224),)


def create_dynamic_shapes(arch: str, batch_dim):
    """Create dynamic shape specifications."""
    from torch.export import Dim

    if arch == "unet":
        return {
            0: {0: batch_dim},  # latent batch
            2: {0: batch_dim},  # context batch
        }
    elif arch == "clip":
        return {0: {0: batch_dim}}
    elif arch == "llm":
        seq_dim = Dim("seq", min=1, max=8192)
        return {0: {0: batch_dim, 1: seq_dim}}
    return None


def generate_c_header(arch: str, header_path: str):
    """Generate a C header for the compiled model."""
    with open(header_path, "w") as f:
        f.write(f"#ifndef AOTI_{arch.upper()}_H\n")
        f.write(f"#define AOTI_{arch.upper()}_H\n\n")
        f.write("#include <stdint.h>\n#include <stddef.h>\n\n")
        f.write("#ifdef __cplusplus\nextern \"C\" {\n#endif\n\n")
        f.write("/* AOTInductor compiled model interface */\n")
        f.write("typedef void* AOTIModelHandle;\n\n")
        f.write("AOTIModelHandle aoti_load(const char* path);\n")
        f.write("int aoti_run(AOTIModelHandle h,\n")
        f.write("             const float** inputs, const int64_t* input_shapes, int n_inputs,\n")
        f.write("             float** outputs, int64_t* output_shapes, int n_outputs);\n")
        f.write("void aoti_free(AOTIModelHandle h);\n\n")
        f.write("#ifdef __cplusplus\n}\n#endif\n\n")
        f.write(f"#endif /* AOTI_{arch.upper()}_H */\n")


def main():
    parser = argparse.ArgumentParser(
        description="Compile PyTorch models to C++ via AOTInductor"
    )
    parser.add_argument("--model-dir", required=True,
                        help="Path to model directory")
    parser.add_argument("--output", "-o", required=True,
                        help="Output .pt2 package path")
    parser.add_argument("--dynamic-batch", action="store_true",
                        help="Enable dynamic batch size")
    args = parser.parse_args()

    export_model(args.model_dir, args.output, args.dynamic_batch)


if __name__ == "__main__":
    main()
