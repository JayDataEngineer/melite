#!/usr/bin/env python3
"""
convert_comfyui_to_gguf.py — Generic PyTorch-to-GGUF converter for ComfyUI models.

Reads PyTorch safetensors/ckpt files, maps tensor names, and writes GGUF format.
Supports auto-detection of model architecture.

Usage:
    python3 convert_comfyui_to_gguf.py --model path/to/model/ --output model.gguf
    python3 convert_comfyui_to_gguf.py --model path/to/model/ --output model-q4_k_m.gguf --quantize q4_k_m
    python3 convert_comfyui_to_gguf.py --model path/to/model/ --auto-detect
"""

import argparse
import json
import os
import struct
import sys
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# GGUF constants
# ---------------------------------------------------------------------------

GGUF_MAGIC = 0x46554747  # "GGUF"
GGUF_VERSION = 3

class GGUFValueType:
    UINT8 = 0
    INT8 = 1
    UINT16 = 2
    INT16 = 3
    UINT32 = 4
    INT32 = 5
    FLOAT32 = 6
    BOOL = 7
    STRING = 8
    ARRAY = 9
    UINT64 = 10
    INT64 = 11
    FLOAT64 = 12

class GGMLType:
    F32 = 0
    F16 = 1
    Q4_0 = 2
    Q4_1 = 3
    Q5_0 = 6
    Q5_1 = 7
    Q8_0 = 8
    Q8_1 = 9
    Q2_K = 10
    Q3_K_S = 11
    Q3_K_M = 12
    Q3_K_L = 13
    Q4_K_S = 14
    Q4_K_M = 15
    Q5_K_S = 16
    Q5_K_M = 17
    Q6_K = 18
    IQ2_XXS = 19
    IQ2_XS = 20
    IQ3_XXS = 21
    IQ1_S = 22
    IQ4_NL = 23
    IQ3_S = 24
    IQ2_S = 25
    IQ4_XS = 26

QUANT_MAP = {
    "f16": GGMLType.F16,
    "q4_0": GGMLType.Q4_0,
    "q4_1": GGMLType.Q4_1,
    "q5_0": GGMLType.Q5_0,
    "q5_1": GGMLType.Q5_1,
    "q8_0": GGMLType.Q8_0,
    "q8_1": GGMLType.Q8_1,
    "q2_k": GGMLType.Q2_K,
    "q3_k_s": GGMLType.Q3_K_S,
    "q3_k_m": GGMLType.Q3_K_M,
    "q3_k_l": GGMLType.Q3_K_L,
    "q4_k_s": GGMLType.Q4_K_S,
    "q4_k_m": GGMLType.Q4_K_M,
    "q5_k_s": GGMLType.Q5_K_S,
    "q5_k_m": GGMLType.Q5_K_M,
    "q6_k": GGMLType.Q6_K,
}

# ---------------------------------------------------------------------------
# Architecture detection
# ---------------------------------------------------------------------------

ARCH_PATTERNS = {
    "sd1": {
        "required_keys": ["model.diffusion_model.input_blocks.0.0.weight"],
        "description": "Stable Diffusion 1.x UNet",
    },
    "sdxl": {
        "required_keys": ["model.diffusion_model.input_blocks.0.0.weight"],
        "optional_keys": ["model.diffusion_model.input_blocks.9.0.block2.attention.relative_position_bias.weight"],
        "description": "Stable Diffusion XL UNet",
    },
    "sd3": {
        "required_keys": ["model.diffusion_model.joint_blocks.0.img_blocks.0.adaLN_modulation.1.weight"],
        "description": "Stable Diffusion 3 DiT",
    },
    "flux": {
        "required_keys": ["model.diffusion_model.single_blocks.0.linear1.weight"],
        "description": "FLUX.1 DiT",
    },
    "llama": {
        "required_keys": ["token_embd.weight", "blk.0.attn_q.weight"],
        "description": "LLaMA-family LLM",
    },
    "whisper": {
        "required_keys": ["encoder.conv1.weight", "encoder.blocks.0.attn_ln.weight"],
        "description": "Whisper speech recognition",
    },
}

def detect_architecture(state_dict_keys: list[str]) -> Optional[str]:
    """Auto-detect model architecture from tensor names."""
    for arch, patterns in ARCH_PATTERNS.items():
        matches = sum(1 for k in patterns["required_keys"]
                      if any(k in sk for sk in state_dict_keys))
        if matches == len(patterns["required_keys"]):
            return arch
    return None

# ---------------------------------------------------------------------------
# Tensor name mapping (per architecture)
# ---------------------------------------------------------------------------

class TensorNameMap:
    """Maps PyTorch tensor names to GGUF names."""

    @staticmethod
    def map_sd_unet(key: str) -> str:
        """Map SD 1.x/SDXL UNet tensor names."""
        k = key.replace("model.diffusion_model.", "")
        # Input blocks
        k = k.replace("input_blocks.", "diffusion.input_blocks.")
        # Middle block
        k = k.replace("middle_block.", "diffusion.middle_block.")
        # Output blocks
        k = k.replace("output_blocks.", "diffusion.output_blocks.")
        # Time embedding
        k = k.replace("time_embed.", "diffusion.time_embed.")
        # Out
        k = k.replace("out.", "diffusion.out.")
        return k

    @staticmethod
    def map_sd3_dit(key: str) -> str:
        """Map SD3 DiT tensor names."""
        k = key.replace("model.diffusion_model.", "")
        k = k.replace("joint_blocks.", "diffusion.joint_blocks.")
        k = k.replace("pos_embed.", "diffusion.pos_embed.")
        k = k.replace("final_layer.", "diffusion.final_layer.")
        return k

    @staticmethod
    def map_flux_dit(key: str) -> str:
        """Map FLUX DiT tensor names."""
        k = key.replace("model.diffusion_model.", "")
        k = k.replace("single_blocks.", "diffusion.single_blocks.")
        k = k.replace("double_blocks.", "diffusion.double_blocks.")
        k = k.replace("pos_embed.", "diffusion.pos_embed.")
        k = k.replace("final_layer.", "diffusion.final_layer.")
        return k

    @staticmethod
    def map_llama(key: str) -> str:
        """Map LLaMA-family tensor names."""
        return key  # GGUF uses same naming as HuggingFace

    @staticmethod
    def map_whisper(key: str) -> str:
        """Map Whisper tensor names."""
        return key

    MAPS = {
        "sd1": map_sd_unet.__func__,
        "sdxl": map_sd_unet.__func__,
        "sd3": map_sd3_dit.__func__,
        "flux": map_flux_dit.__func__,
        "llama": map_llama.__func__,
        "whisper": map_whisper.__func__,
    }

    @classmethod
    def map(cls, arch: str, key: str) -> str:
        mapper = cls.MAPS.get(arch)
        if mapper:
            return mapper(key)
        return key

# ---------------------------------------------------------------------------
# GGUF writer
# ---------------------------------------------------------------------------

class GGUFWriter:
    def __init__(self, path: str, arch: str):
        self.path = path
        self.arch = arch
        self.metadata = {}
        self.tensors = []
        self.data_offset = 0

    def add_metadata(self, key: str, value):
        self.metadata[key] = value

    def add_tensor(self, name: str, shape: list[int], dtype: int, data: bytes):
        self.tensors.append({
            "name": name,
            "shape": shape,
            "dtype": dtype,
            "data": data,
        })

    def _write_string(self, f, s: str):
        encoded = s.encode("utf-8")
        f.write(struct.pack("<Q", len(encoded)))
        f.write(encoded)

    def _write_value(self, f, value, vtype: int):
        f.write(struct.pack("<I", vtype))
        if vtype == GGUFValueType.UINT8:
            f.write(struct.pack("<B", value))
        elif vtype == GGUFValueType.INT8:
            f.write(struct.pack("<b", value))
        elif vtype == GGUFValueType.UINT16:
            f.write(struct.pack("<H", value))
        elif vtype == GGUFValueType.INT16:
            f.write(struct.pack("<h", value))
        elif vtype == GGUFValueType.UINT32:
            f.write(struct.pack("<I", value))
        elif vtype == GGUFValueType.INT32:
            f.write(struct.pack("<i", value))
        elif vtype == GGUFValueType.FLOAT32:
            f.write(struct.pack("<f", value))
        elif vtype == GGUFValueType.BOOL:
            f.write(struct.pack("<B", 1 if value else 0))
        elif vtype == GGUFValueType.STRING:
            self._write_string(f, str(value))
        elif vtype == GGUFValueType.UINT64:
            f.write(struct.pack("<Q", value))
        elif vtype == GGUFValueType.INT64:
            f.write(struct.pack("<q", value))
        elif vtype == GGUFValueType.FLOAT64:
            f.write(struct.pack("<d", value))

    def write(self):
        with open(self.path, "wb") as f:
            # Header
            f.write(struct.pack("<I", GGUF_MAGIC))
            f.write(struct.pack("<I", GGUF_VERSION))
            f.write(struct.pack("<Q", len(self.tensors)))
            f.write(struct.pack("<Q", len(self.metadata)))

            # Metadata
            for key, value in self.metadata.items():
                self._write_string(f, key)
                if isinstance(value, bool):
                    self._write_value(f, value, GGUFValueType.BOOL)
                elif isinstance(value, int):
                    if value < 0:
                        self._write_value(f, value, GGUFValueType.INT32)
                    else:
                        self._write_value(f, value, GGUFValueType.UINT32)
                elif isinstance(value, float):
                    self._write_value(f, value, GGUFValueType.FLOAT32)
                elif isinstance(value, str):
                    self._write_value(f, value, GGUFValueType.STRING)
                else:
                    self._write_value(f, str(value), GGUFValueType.STRING)

            # Tensor info
            data_offset = 0
            alignment = 32
            for tensor in self.tensors:
                n_dims = len(tensor["shape"])
                self._write_string(f, tensor["name"])
                f.write(struct.pack("<I", n_dims))
                for d in tensor["shape"]:
                    f.write(struct.pack("<Q", d))
                f.write(struct.pack("<I", tensor["dtype"]))
                f.write(struct.pack("<Q", data_offset))
                data_offset += len(tensor["data"])
                # Pad to alignment
                pad = (alignment - (data_offset % alignment)) % alignment
                data_offset += pad

            # Align to boundary
            pos = f.tell()
            pad = (alignment - (pos % alignment)) % alignment
            f.write(b"\x00" * pad)

            # Tensor data
            for tensor in self.tensors:
                f.write(tensor["data"])
                pos = f.tell()
                pad = (alignment - (pos % alignment)) % alignment
                f.write(b"\x00" * pad)

        print(f"Wrote {self.path}: {len(self.tensors)} tensors, "
              f"{os.path.getsize(self.path) / 1024 / 1024:.1f} MB")

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def load_safetensors(path: str) -> dict:
    """Load a safetensors file."""
    import safetensors.torch
    return safetensors.torch.load_file(path)

def load_checkpoint(path: str) -> dict:
    """Load a PyTorch checkpoint."""
    import torch
    return torch.load(path, map_location="cpu", weights_only=True)

def load_model_directory(model_dir: str) -> dict:
    """Auto-detect and load model files from a directory."""
    model_path = Path(model_dir)
    state_dict = {}

    # Check for safetensors
    safetensors_files = list(model_path.glob("*.safetensors"))
    if safetensors_files:
        for sf in safetensors_files:
            print(f"Loading {sf.name}...")
            state_dict.update(load_safetensors(str(sf)))
        return state_dict

    # Check for .ckpt/.pt files
    ckpt_files = list(model_path.glob("*.ckpt")) + list(model_path.glob("*.pt"))
    if ckpt_files:
        for cf in ckpt_files:
            print(f"Loading {cf.name}...")
            state_dict.update(load_checkpoint(str(cf)))
        return state_dict

    # Check for HuggingFace diffusers format
    if (model_path / "model_index.json").exists():
        # Load all .bin files
        for bin_file in model_path.glob("*.bin"):
            print(f"Loading {bin_file.name}...")
            state_dict.update(load_checkpoint(str(bin_file)))
        return state_dict

    raise FileNotFoundError(f"No model files found in {model_dir}")

# ---------------------------------------------------------------------------
# Quantization (simple FF16 for now)
# ---------------------------------------------------------------------------

def quantize_tensor(data, target_type: int):
    """Quantize a tensor to the target GGML type. Returns (bytes, new_type)."""
    import numpy as np

    if target_type == GGMLType.F16:
        arr = np.frombuffer(data, dtype=np.float32).astype(np.float16)
        return arr.tobytes(), GGMLType.F16

    if target_type == GGMLType.Q4_0:
        arr = np.frombuffer(data, dtype=np.float32)
        n = len(arr)
        block_size = 32
        n_blocks = (n + block_size - 1) // block_size
        result = bytearray()
        for i in range(n_blocks):
            block = arr[i * block_size : min((i + 1) * block_size, n)]
            d = max(abs(block.max()), abs(block.min())) / 8.0
            if d == 0:
                d = 1.0
            scale = d
            quantized = np.clip(np.round(block / scale + 8), 0, 15).astype(np.uint8)
            # Pack two 4-bit values per byte
            packed = bytearray()
            for j in range(0, len(quantized), 2):
                lo = quantized[j]
                hi = quantized[j + 1] if j + 1 < len(quantized) else 0
                packed.append(lo | (hi << 4))
            result += struct.pack("<f", scale)
            result += bytes(packed)
        return bytes(result), GGMLType.Q4_0

    # Default: keep as F32
    return data, GGMLType.F32

# ---------------------------------------------------------------------------
# Main conversion pipeline
# ---------------------------------------------------------------------------

def convert_model(model_dir: str, output_path: str, quantize: str = "f16",
                  arch_override: str = None):
    """Convert a PyTorch model to GGUF format."""
    import torch
    import numpy as np

    print(f"Loading model from {model_dir}...")
    state_dict = load_model_directory(model_dir)
    keys = list(state_dict.keys())
    print(f"Found {len(keys)} tensors")

    # Detect architecture
    arch = arch_override or detect_architecture(keys)
    if not arch:
        print("WARNING: Could not auto-detect architecture. Using generic mapping.")
        arch = "generic"
    else:
        print(f"Detected architecture: {arch}")

    # Create GGUF writer
    writer = GGUFWriter(output_path, arch)

    # Add metadata
    writer.add_metadata("general.architecture", arch)
    writer.add_metadata("general.name", Path(model_dir).name)
    writer.add_metadata("general.quantization", quantize)

    # Add architecture-specific metadata
    if arch in ("sd1", "sdxl", "sd3", "flux"):
        writer.add_metadata("diffusion.architecture", arch)
        if arch in ("sd1", "sdxl"):
            writer.add_metadata("diffusion.model_channels", 320)
            writer.add_metadata("diffusion.num_res_blocks", 2)
    elif arch == "llama":
        writer.add_metadata("llama.context_length", 4096)

    # Map and add tensors
    target_type = QUANT_MAP.get(quantize.lower(), GGMLType.F16)
    total_bytes = 0

    for key in keys:
        tensor = state_dict[key]
        if isinstance(tensor, torch.Tensor):
            gguf_name = TensorNameMap.map(arch, key)
            shape = list(tensor.shape)
            raw_data = tensor.numpy().tobytes()

            # Quantize if needed
            if target_type != GGMLType.F32:
                data, actual_type = quantize_tensor(raw_data, target_type)
            else:
                data, actual_type = raw_data, GGMLType.F32

            writer.add_tensor(gguf_name, shape, actual_type, data)
            total_bytes += len(data)

            if len(writer.tensors) % 50 == 0:
                print(f"  Processed {len(writer.tensors)} tensors "
                      f"({total_bytes / 1024 / 1024:.1f} MB)...")

    # Write output
    print(f"Writing GGUF to {output_path}...")
    writer.write()

    print(f"Conversion complete!")
    print(f"  Architecture: {arch}")
    print(f"  Tensors: {len(writer.tensors)}")
    print(f"  Quantization: {quantize}")
    print(f"  Output: {output_path}")

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Convert ComfyUI PyTorch models to GGUF format"
    )
    parser.add_argument("--model", required=True,
                        help="Path to model directory")
    parser.add_argument("--output", "-o",
                        help="Output GGUF file path")
    parser.add_argument("--quantize", "-q", default="f16",
                        choices=list(QUANT_MAP.keys()),
                        help="Quantization type (default: f16)")
    parser.add_argument("--auto-detect", action="store_true",
                        help="Auto-detect architecture and print info")
    parser.add_argument("--arch",
                        help="Override architecture detection")
    args = parser.parse_args()

    if args.auto_detect:
        print(f"Scanning {args.model}...")
        state_dict = load_model_directory(args.model)
        keys = list(state_dict.keys())
        arch = detect_architecture(keys)
        print(f"Found {len(keys)} tensors")
        print(f"Detected architecture: {arch or 'unknown'}")
        print(f"\nSample tensor names:")
        for k in keys[:20]:
            t = state_dict[k]
            shape = list(t.shape) if hasattr(t, 'shape') else '?'
            print(f"  {k}: {shape}")
        return

    if not args.output:
        args.output = args.model.rstrip("/") + ".gguf"

    convert_model(args.model, args.output, args.quantize, args.arch)

if __name__ == "__main__":
    main()
