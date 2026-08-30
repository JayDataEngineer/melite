#!/usr/bin/env python3
"""
Unit test for ANNY binary basis format.
Generates a basis file, then reads it back and validates the format.
"""

import struct
import os
import sys
import math

def test_basis_roundtrip():
    """Generate and read back a basis file, validate header and data."""
    sys.path.insert(0, os.path.dirname(__file__) + '/../scripts')
    from generate_anny_basis import generate_base_humanoid, generate_shape_deltas, write_basis_file

    num_shapes = 8
    num_verts = 100
    test_path = "/tmp/test_anny_basis.bin"

    # Generate
    base = generate_base_humanoid(num_verts)
    deltas = generate_shape_deltas(base, num_shapes, num_verts)
    names = write_basis_file(test_path, base, deltas, num_shapes, num_verts)

    # Read back and validate
    with open(test_path, 'rb') as f:
        magic = struct.unpack('<I', f.read(4))[0]
        assert magic == 0x53494241, f"Bad magic: 0x{magic:08X}"

        K = struct.unpack('<I', f.read(4))[0]
        N = struct.unpack('<I', f.read(4))[0]
        assert K == num_shapes, f"Wrong K: {K} != {num_shapes}"
        assert N == num_verts, f"Wrong N: {N} != {num_verts}"

        # Read deltas
        deltas_data = struct.unpack(f'<{K*N*3}f', f.read(K*N*3*4))
        assert len(deltas_data) == K * N * 3

        # Read base
        base_data = struct.unpack(f'<{N*3}f', f.read(N*3*4))
        assert len(base_data) == N * 3

        # Verify base matches original
        for i in range(N * 3):
            assert abs(base_data[i] - base[i]) < 1e-6, f"Base mismatch at {i}"

    # Check file size
    size = os.path.getsize(test_path)
    expected = 12 + (num_shapes * num_verts * 3 + num_verts * 3) * 4
    assert size == expected, f"Wrong size: {size} != {expected}"

    os.remove(test_path)
    print(f"PASS: basis roundtrip ({num_shapes} shapes, {num_verts} verts)")

if __name__ == '__main__':
    test_basis_roundtrip()
    print("ALL TESTS PASSED")
