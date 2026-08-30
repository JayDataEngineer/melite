# spec_raster.py - pure-numpy glTF SPEC-EVALUATION rasterizer.
# Renders EXACTLY what a spec consumer (Unity) shows: v' = sum_w w * GM(j) *
# IBM(j) * v (node-parented children ride GM of their joint), painter's
# algorithm, flat lambert shading. No Blender, no importers.
# Usage: python spec_raster.py <in.glb> <out.png> [size]
import sys, json, struct
import numpy as np
from PIL import Image, ImageDraw

JSON_TAG, BIN_TAG = 0x4E4F534A, 0x004E4942
CT = {5120: (1, "i1"), 5121: (1, "u1"), 5122: (2, "i2"),
      5123: (2, "u2"), 5125: (4, "u4"), 5126: (4, "f4")}
NT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def glb_read(path):
    d = open(path, "rb").read()
    off = 12
    j = b = None
    while off < len(d):
        ln, t = struct.unpack_from("<II", d, off)
        if t == JSON_TAG:
            j = json.loads(d[off + 8:off + 8 + ln])
        elif t == BIN_TAG:
            b = d[off + 8:off + 8 + ln]
        off += 8 + ln
    return j, b


def acc_data(j, b, ai):
    a = j["accessors"][ai]
    n = NT[a["type"]] * a.get("count", 0)
    sz, dt = CT[a["componentType"]]
    bv = j["bufferViews"][a["bufferView"]]
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    return np.frombuffer(b[start:start + n * sz], dtype=np.dtype(dt)).reshape(
        (-1, NT[a["type"]])).astype(np.float64)


def node_matrix(n):
    if "matrix" in n:
        return np.array(n["matrix"], dtype=np.float64).reshape(4, 4).T
    T = np.eye(4)
    if "translation" in n:
        T[:3, 3] = n["translation"]
    R = np.eye(4)
    if "rotation" in n:
        x, y, z, w = n["rotation"]
        R[:3, :3] = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    S = np.eye(4)
    if "scale" in n:
        S[:3, :3] = np.diag(n["scale"])
    return T @ R @ S


def main():
    inp, outp = sys.argv[1], sys.argv[2]
    S = int(sys.argv[3]) if len(sys.argv) > 3 else 640
    j, b = glb_read(inp)
    parent = {}
    for i, n in enumerate(j["nodes"]):
        for c in n.get("children", []):
            parent[c] = i
    gm = {}

    def calc(i):
        if i in gm:
            return gm[i]
        m = node_matrix(j["nodes"][i])
        p = parent.get(i)
        if p is not None:
            m = calc(p) @ m
        gm[i] = m
        return m
    for i in range(len(j["nodes"])):
        calc(i)

    tris = []  # (verts3, is_skinned)
    for ni, node in enumerate(j["nodes"]):
        if "mesh" not in node:
            continue
        Mnode = gm[ni]
        sk = node.get("skin")
        M = None
        if sk is not None and j.get("skins"):
            skin = j["skins"][sk]
            joints = skin["joints"]
            IBMs = acc_data(j, b, skin["inverseBindMatrices"]).reshape(-1, 4, 4)
            M = np.array([gm[k] for k in joints]) @ IBMs
        for prim in j["meshes"][node["mesh"]]["primitives"]:
            if "POSITION" not in prim.get("attributes", {}):
                continue
            V = acc_data(j, b, prim["attributes"]["POSITION"])
            F = acc_data(j, b, prim["indices"]).astype(np.int64).reshape(-1, 3) \
                if "indices" in prim else np.arange(len(V)).reshape(-1, 3)
            if M is not None and "JOINTS_0" in prim["attributes"]:
                J = acc_data(j, b, prim["attributes"]["JOINTS_0"]).astype(int)
                W = acc_data(j, b, prim["attributes"]["WEIGHTS_0"])
                Vh = np.hstack([V, np.ones((len(V), 1))])
                ev = np.zeros((len(V), 3))
                for c in range(J.shape[1]):
                    for k in np.unique(J[:, c]):
                        msk = J[:, c] == k
                        w = W[msk, c]
                        if w.sum() == 0:
                            continue
                        ev[msk] += (w[:, None] * (Vh[msk] @ M[k].T)[:, :3])
                V = ev
            else:
                V = V @ Mnode[:3, :3].T + Mnode[:3, 3]
            tris.append((V, F))
    if not tris:
        print("SPEC-RASTER no meshes")
        return
    # gather scene
    allT = []
    for V, F in tris:
        allT.append(V[F])
    T = np.concatenate(allT)
    # camera: orthographic front (+Z view), up +Y
    cam_z = np.array([0.3, -0.4, 0.85])
    cam_z /= np.linalg.norm(cam_z)
    up = np.array([0.0, 1.0, 0.0])
    x_ax = np.cross(up, cam_z)
    x_ax /= np.linalg.norm(x_ax)
    y_ax = np.cross(cam_z, x_ax)
    P = T.mean(axis=1)
    gx = P @ x_ax
    gy = P @ y_ax
    gz = P @ cam_z
    lo = np.array([gx.min(), gy.min()])
    hi = np.array([gx.max(), gy.max()])
    span = max(hi - lo) * 1.05
    cx, cy = (lo + hi) / 2

    def px(X, Y):
        return ((X - cx) / span + 0.5) * S, (0.5 - (Y - cy) / span) * S

    img = Image.new("RGB", (S, S), (16, 16, 16))
    dr = ImageDraw.Draw(img)
    order = np.argsort(-gz)  # far first
    L = np.array([0.4, 0.5, 0.75])
    L /= np.linalg.norm(L)
    n_tri = min(len(order), 120000)
    for i in order[:n_tri]:
        t = T[i]
        n = np.cross(t[1] - t[0], t[2] - t[0])
        nn = np.linalg.norm(n)
        if nn < 1e-12:
            continue
        n /= nn
        lam = abs(n @ L)
        shade = int(30 + 200 * lam)
        Xs = np.array([t[0] @ x_ax, t[1] @ x_ax, t[2] @ x_ax])
        Ys = np.array([t[0] @ y_ax, t[1] @ y_ax, t[2] @ y_ax])
        xs, ys = px(Xs, Ys)
        dr.polygon([(xs[0], ys[0]), (xs[1], ys[1]), (xs[2], ys[2])],
                   fill=(shade, shade, shade))
    img.save(outp)
    print("SPEC-RASTER %s tris=%d span=%.2f" % (outp, len(T), span))


if __name__ == "__main__":
    main()
