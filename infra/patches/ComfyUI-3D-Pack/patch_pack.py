"""Marker-based idempotent patches for MrForExample/ComfyUI-3D-Pack.

Patches (why each exists - see docs/reference/ADR-TRELLIS2-PUBLIC-LANE.md era notes):
  A. diso import guard      - diso cannot build on GCC15 + CUDA 12.8 hosts
  B. force CUDA rasterizer  - RasterizeGLContext SIGABRTs headless (no X/EGL)
  C. ControlNetOutput guard - diffusers >=0.33 removed diffusers.models.controlnet
  D. mmgp safe_open repair  - mmgp.safetensors2 rebinds safetensors.safe_open
     without the backend kwarg; transformers >=5 calls safe_open(backend=...)
     and dies. Restore rust binding + repair captured refs (import-order safe).
"""
import re
import sys

target_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
nodes_py = target_dir + '/nodes.py'


def read(p):
    with open(p) as fh:
        return fh.read()


def write(p, s):
    with open(p, 'w') as fh:
        fh.write(s)


# --- Patch A: diso import guard -------------------------------------------
for sub in [
    'Gen_3D_Modules/Hunyuan3D_2_1/hy3dshape/hy3dshape/models/autoencoders/surface_extractors.py',
    'Gen_3D_Modules/Hunyuan3D_V2/hy3dgen/shapegen/models/autoencoders/surface_extractors.py',
    'Gen_3D_Modules/TripoSG/inference_utils.py',
]:
    fp = target_dir + '/' + sub
    try:
        c = read(fp)
    except FileNotFoundError:
        continue
    if 'from diso import DiffDMC' not in c or '# RAY-FORK' in c:
        continue
    c = '# RAY-FORK: guard diso import\n' + re.sub(
        r'([ \t]*)from diso import DiffDMC',
        lambda m: '%stry:\n%s    from diso import DiffDMC\n%sexcept ImportError:\n%s    DiffDMC = None' % (m.group(1), m.group(1), m.group(1), m.group(1)),
        c)
    write(fp, c)
    print('  [diso-guard] ' + sub.split('/')[2])

# --- Patch B: force CUDA rasterizer (headless GL SIGABRT) ------------------
c = read(nodes_py)
if 'force_cuda_rast=True' not in c and 'RAY-FORK: headless' not in c:
    old = 'cameras_list=cam_list)'
    new = 'cameras_list=cam_list, force_cuda_rast=True)  # RAY-FORK: headless - GL ctx SIGABRTs without X'
    if old in c:
        write(nodes_py, c.replace(old, new, 1))
        print('  [cuda-rast] nodes.py color projection -> force_cuda_rast=True')
    else:
        print('  [cuda-rast] WARN: call site not found')
else:
    print('  [cuda-rast] already patched')

# --- Patch C: ControlNetOutput guard (diffusers >=0.33) --------------------
cn = target_dir + '/Gen_3D_Modules/Stable3DGen/stablex/controlnetvae.py'
try:
    c = read(cn)
    if 'from diffusers.models.controlnet import' in c and 'RAY-FORK' not in c:
        c = c.replace(
            'from diffusers.models.controlnet import ControlNetOutput',
            'try:\n    from diffusers.models.controlnet import ControlNetOutput  # RAY-FORK: guard (removed in diffusers >=0.33)\nexcept ImportError:\n    from typing import Any as ControlNetOutput')
        write(cn, c)
        print('  [controlnet-guard] Stable3DGen controlnetvae.py')
    else:
        print('  [controlnet-guard] already patched / not found')
except FileNotFoundError:
    print('  [controlnet-guard] file missing, skip')

# --- Patch D: mmgp safe_open repair ----------------------------------------
GUARD = '''from mmgp import offload, profile_type
# RAY-FORK: mmgp.safetensors2 globally rebinds safetensors.safe_open to its
# own loader whose signature lacks the `backend` kwarg. transformers >=5
# calls safe_open(..., backend="mmap") and TypeErrors on the patched symbol
# whenever it imports after this pack (custom-node load order). Restore the
# genuine rust binding; mmgp's own offload keeps using its module-local code.
import safetensors as _safetensors_rayfork
if getattr(_safetensors_rayfork.safe_open, "__module__", "") == "mmgp.safetensors2":
    import mmgp.safetensors2 as _mmgp_st2
    _rust_safe_open = _mmgp_st2._old_safe_open
    _safetensors_rayfork.safe_open = _rust_safe_open
    # repair references captured while poisoned (import-order dependent)
    import sys as _sys_rayfork
    _tmu = _sys_rayfork.modules.get("transformers.modeling_utils")
    if _tmu is not None and getattr(getattr(_tmu, "safe_open", None), "__module__", "") == "mmgp.safetensors2":
        _tmu.safe_open = _rust_safe_open'''
c = read(nodes_py)
if 'RAY-FORK: mmgp.safetensors2' not in c and 'from mmgp import offload, profile_type' in c:
    write(nodes_py, c.replace('from mmgp import offload, profile_type', GUARD, 1))
    print('  [mmgp-safe_open] nodes.py guard installed')
else:
    print('  [mmgp-safe_open] already patched / anchor missing')

print('[patch_pack] done')
