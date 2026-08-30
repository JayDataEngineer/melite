#!/usr/bin/env python3
"""
Generate a synthetic ANNY shape basis file for testing.

Creates a binary .bin file with:
  - Magic header "ABIS" (0x53494241)
  - uint32 num_shapes (K)
  - uint32 num_vertices (N)
  - K*N*3 float32 deltas (shape offsets)
  - N*3 float32 base vertices (canonical mesh)

The base mesh is a simple humanoid (standing figure) and the shapes
are procedural deformations (stretch, widen, etc.) for validation.

Usage:
  python3 scripts/generate_anny_basis.py [--shapes 64] [--vertices 13380] [--output anny_shape_basis.bin]
"""

import struct
import math
import argparse
import os

def generate_base_humanoid(num_vertices):
    """Generate a simple humanoid base mesh (triangle soup)."""
    verts = []
    # We generate a parametric standing figure using simple geometry
    # For testing, create a humanoid silhouette with head, torso, arms, legs

    # Head (sphere-ish, ~1000 verts)
    head_r = 0.15
    head_cy = 1.75
    head_slices = 20
    head_stacks = 20
    head_verts = head_slices * head_stacks * 6  # triangles

    for i in range(head_slices):
        phi1 = math.pi * i / head_slices
        phi2 = math.pi * (i + 1) / head_slices
        for j in range(head_stacks):
            theta1 = 2 * math.pi * j / head_stacks
            theta2 = 2 * math.pi * (j + 1) / head_stacks
            # 2 triangles per quad
            for theta_a, theta_b in [(theta1, theta2)]:
                for (p, t) in [(phi1, theta1), (phi1, theta2), (phi2, theta2),
                                (phi1, theta1), (phi2, theta2), (phi2, theta1)]:
                    x = head_r * math.sin(p) * math.cos(t)
                    y = head_cy + head_r * math.cos(p)
                    z = head_r * math.sin(p) * math.sin(t)
                    verts.extend([x, y, z])

    # Neck
    neck_verts = 20 * 6
    for i in range(20):
        t1 = 2 * math.pi * i / 20
        t2 = 2 * math.pi * (i + 1) / 20
        for (y, r) in [(1.65, 0.06), (1.60, 0.06)]:
            for (ta, tb, yo) in [(t1, t2, 0), (t1, t2, -0.05)]:
                x1 = r * math.cos(ta); z1 = r * math.sin(ta)
                x2 = r * math.cos(tb); z2 = r * math.sin(tb)
                verts.extend([x1, 1.65 + yo, z1])
                verts.extend([x2, 1.65 + yo, z2])
                verts.extend([x2, 1.60 + yo, z2])

    # Torso (cylinder-ish)
    torso_slices = 24
    torso_height = 0.6
    torso_y_base = 1.0
    for i in range(torso_slices):
        t1 = 2 * math.pi * i / torso_slices
        t2 = 2 * math.pi * (i + 1) / torso_slices
        for layer in range(4):
            y0 = torso_y_base + torso_height * layer / 3
            y1 = torso_y_base + torso_height * (layer + 1) / 3
            # Width varies: wider at shoulders, narrower at waist
            w0 = 0.25 - 0.03 * math.sin(layer * math.pi / 3)
            w1 = 0.25 - 0.03 * math.sin((layer + 1) * math.pi / 3)
            x1a = w0 * math.cos(t1); z1a = w0 * math.sin(t1)
            x1b = w0 * math.cos(t2); z1b = w0 * math.sin(t2)
            x2a = w1 * math.cos(t1); z2a = w1 * math.sin(t1)
            x2b = w1 * math.cos(t2); z2b = w1 * math.sin(t2)
            verts.extend([x1a, y0, z1a])
            verts.extend([x1b, y0, z1b])
            verts.extend([x2b, y1, z2b])
            verts.extend([x1a, y0, z1a])
            verts.extend([x2b, y1, z2b])
            verts.extend([x2a, y1, z2a])

    # Arms (cylinders)
    for side in [-1, 1]:
        for i in range(12):
            t1 = 2 * math.pi * i / 12
            t2 = 2 * math.pi * (i + 1) / 12
            arm_x = side * 0.32
            for j in range(6):
                y0 = 1.55 - j * 0.12
                y1 = 1.55 - (j + 1) * 0.12
                r = 0.04 + 0.01 * (j < 2)  # slightly thicker at shoulder
                for (ya, yb, ta, tb) in [(y0, y1, t1, t2), (y0, y1, t1, t2)]:
                    x1 = arm_x + r * math.cos(ta)
                    z1 = r * math.sin(ta)
                    x2 = arm_x + r * math.cos(tb)
                    z2 = r * math.sin(tb)
                    verts.extend([x1, y0, z1])
                    verts.extend([x2, y0, z2])
                    verts.extend([x2, y1, z2])

    # Legs (cylinders)
    for side in [-1, 1]:
        for i in range(16):
            t1 = 2 * math.pi * i / 16
            t2 = 2 * math.pi * (i + 1) / 16
            leg_x = side * 0.1
            for j in range(8):
                y0 = 1.0 - j * 0.12
                y1 = 1.0 - (j + 1) * 0.12
                r = 0.07 - 0.005 * j  # thinner toward ankle
                x1a = leg_x + r * math.cos(t1); z1a = r * math.sin(t1)
                x1b = leg_x + r * math.cos(t2); z1b = r * math.sin(t2)
                x2a = leg_x + r * math.cos(t1); z2a = r * math.sin(t1)
                x2b = leg_x + r * math.cos(t2); z2b = r * math.sin(t2)
                verts.extend([x1a, y0, z1a])
                verts.extend([x1b, y0, z1b])
                verts.extend([x2b, y1, z2b])
                verts.extend([x1a, y0, z1a])
                verts.extend([x2b, y1, z2b])
                verts.extend([x2a, y1, z2a])

    # Pad or truncate to exact vertex count
    flat_verts = []
    for v in verts:
        flat_verts.append(v)

    # Each vertex is 3 floats = 12 bytes
    target_floats = num_vertices * 3

    if len(flat_verts) < target_floats:
        # Repeat last vertex to fill
        last3 = flat_verts[-3:] if flat_verts else [0, 0, 0]
        while len(flat_verts) < target_floats:
            flat_verts.extend(last3)
    else:
        flat_verts = flat_verts[:target_floats]

    return flat_verts


def generate_shape_deltas(base_verts, num_shapes, num_vertices):
    """Generate procedural shape deltas for testing."""
    deltas = []
    shape_names = [
        "height", "weight", "muscle", "age", "eye_size",
        "jaw_width", "jaw_height", "nose_width", "nose_length",
        "nose_bridge", "lip_thickness", "chin_width", "chin_length",
        "forehead_height", "brow_depth", "cheekbone_width",
        "neck_width", "shoulder_width", "chest_size", "waist_size",
        "hip_width", "arm_length", "hand_size", "leg_length",
        "thigh_size", "calf_size", "foot_size", "torso_length",
        "pelvis_width", "rib_cage", "belly_size", "butt_size",
        "head_size", "ear_size", "eye_spacing", "eye_depth",
        "mouth_width", "smile_lines", "neck_length", "collar_bone",
        "deltoid", "bicep", "forearm", "glute", "quad",
        "hamstring", "calf_muscle", "oblique", "lats", "traps",
        "height_scale", "bulk", "lean", "stocky", "tall",
        "wide", "narrow", "thick", "thin", "broad",
        "compact", "elongated", "sturdy", "slender",
    ]

    for k in range(num_shapes):
        delta = []
        if k < len(shape_names):
            name = shape_names[k]
        else:
            name = f"shape_{k}"

        for i in range(num_vertices):
            x = base_verts[i * 3]
            y = base_verts[i * 3 + 1]
            z = base_verts[i * 3 + 2]

            # Each shape deforms differently based on index
            factor = 0.1 * math.sin(k * 0.5 + i * 0.001)
            dx = factor * x * (0.1 + 0.01 * (k % 5))
            dy = factor * y * (0.05 + 0.01 * (k % 3))
            dz = factor * z * (0.08 + 0.01 * (k % 4))

            delta.extend([dx, dy, dz])

        deltas.append((name, delta))

    return deltas


def write_basis_file(path, base_verts, deltas, num_shapes, num_vertices):
    """Write the binary basis file."""
    with open(path, 'wb') as f:
        # Header: magic, K, N
        f.write(struct.pack('<I', 0x53494241))  # "ABIS"
        f.write(struct.pack('<I', num_shapes))
        f.write(struct.pack('<I', num_vertices))

        # Shape deltas: K * N * 3 floats
        for name, delta in deltas:
            f.write(struct.pack(f'<{len(delta)}f', *delta))

        # Base vertices: N * 3 floats
        f.write(struct.pack(f'<{len(base_verts)}f', *base_verts))

    size = os.path.getsize(path)
    print(f"Written {path}: {size} bytes ({size/1048576:.1f} MB)")
    print(f"  {num_shapes} shapes x {num_vertices} vertices")
    return [d[0] for d in deltas]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate ANNY shape basis file')
    parser.add_argument('--shapes', type=int, default=64, help='Number of shape basis vectors')
    parser.add_argument('--vertices', type=int, default=13380, help='Number of vertices')
    parser.add_argument('--output', type=str, default='data/anny_shape_basis.bin', help='Output path')
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)

    print(f"Generating base humanoid mesh ({args.vertices} vertices)...")
    base = generate_base_humanoid(args.vertices)

    print(f"Generating {args.shapes} shape deltas...")
    deltas = generate_shape_deltas(base, args.shapes, args.vertices)

    names = write_basis_file(args.output, base, deltas, args.shapes, args.vertices)

    # Also write shape names for reference
    names_path = args.output.replace('.bin', '_names.json')
    import json
    with open(names_path, 'w') as f:
        json.dump(names, f, indent=2)
    print(f"Shape names: {names_path}")
