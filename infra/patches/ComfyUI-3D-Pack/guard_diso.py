import re, sys

target_dir = sys.argv[1]
files = [
    f"{target_dir}/Gen_3D_Modules/Hunyuan3D_2_1/hy3dshape/hy3dshape/models/autoencoders/surface_extractors.py",
    f"{target_dir}/Gen_3D_Modules/Hunyuan3D_V2/hy3dgen/shapegen/models/autoencoders/surface_extractors.py",
    f"{target_dir}/Gen_3D_Modules/TripoSG/inference_utils.py",
]

for fpath in files:
    try:
        with open(fpath) as fh:
            content = fh.read()
    except FileNotFoundError:
        continue
    if '# RAY-FORK' in content:
        print(f'  already patched: {fpath}')
        continue
    if 'from diso import DiffDMC' not in content:
        continue
    pattern = r'((?:[ \t])*)from diso import DiffDMC'
    def replace(m):
        indent = m.group(1)
        return f"{indent}try:\n{indent}    from diso import DiffDMC\n{indent}except ImportError:\n{indent}    DiffDMC = None"
    content = re.sub(pattern, replace, content)
    content = '# RAY-FORK: guard diso import\n' + content
    with open(fpath, 'w') as fh:
        fh.write(content)
    print(f'  patched: {fpath}')
