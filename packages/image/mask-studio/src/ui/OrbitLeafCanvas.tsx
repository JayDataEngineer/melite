// OrbitLeafCanvas.tsx — THE ORBIT ORB, EMBEDDED (2026-11-15 — the
// operator: "it already existed as the output, build it for the
// input"): the reshoot mod leaf's camera-pose orb. A 1:1 port of
// upstream's crossview_orbit.js STATIC-pose gizmo (the sphere, the
// trained-band zones, the snap dots, the blue camera handle above
// the dials — vendor/comfyui_extensions/ComfyUI-CrossViewWarp/web/
// crossview_orbit.js): the orb and the orbit/tilt/dolly number
// dials write the SAME draft seats (ONE TRUTH, two views of one
// draft). No keyframes — the reshoot bag has no keyframes seat
// (the path/arc is the preview node's own, never the bag's).
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { OrbitCanvasFaceProps } from "@melite/contracts";

import { orbCopy } from "./orbCopy.ts";

const d2r = (x: number): number => (x * Math.PI) / 180;
const r2d = (x: number): number => (x * 180) / Math.PI;
const SNAP_DEG = 5;
const HANDLE_R = 14;

// Upstream's trained-band zones (the v2.3 manifest audit): green to
// 45° azimuth (the only angle the model has actually been looked
// at), yellow to 90; looking up is the weak axis.
const ZONE_GREEN: [number, number, number] = [45, 30, 20];
const ZONE_YELLOW: [number, number, number] = [90, 45, 35];
const C_GREEN = [80, 200, 120];
const C_YELLOW = [230, 200, 90];
const C_RED = [225, 95, 95];

// Upstream distScale: dist<=1 spreads 0.45..1.0 (inside = closer),
// dist>1 spreads 1.0..1.5 (the marker keeps moving to 3.0).
const distScale = (dist: number): number => {
  const d = Number(dist);
  if (d <= 1) return 0.45 + 0.55 * d;
  return 1.0 + 0.25 * (d - 1.0);
};

const inEllipse = (az: number, el: number, [A, Eup, Edn]: [number, number, number]): boolean => {
  const an = az / A;
  const en = el >= 0 ? el / Eup : el / Edn;
  return an * an + en * en <= 1;
};

const zoneColor = (az: number, el: number): number[] => {
  if (inEllipse(az, el, ZONE_GREEN)) return C_GREEN;
  if (inEllipse(az, el, ZONE_YELLOW)) return C_YELLOW;
  return C_RED;
};

// sphere point for (az, el); home (0,0) faces the viewer (-y toward screen)
const spherePt = (azDeg: number, elDeg: number): [number, number, number] => {
  const a = d2r(azDeg);
  const e = d2r(elDeg);
  return [Math.cos(e) * Math.sin(a), -Math.cos(e) * Math.cos(a), Math.sin(e)];
};

const snap5 = (v: number): number => Math.round(v / SNAP_DEG) * SNAP_DEG;
const clampAz = (v: number): number => Math.max(-180, Math.min(180, v));
const clampEl = (v: number): number => Math.max(-90, Math.min(90, v));
const clampDist = (v: number): number => Math.max(0.1, Math.min(3, Math.round(v * 100) / 100));

// clickable snap points: [az, el, label]
const SNAPS: Array<[number, number, string]> = [
  [0, 0, "F"],
  [-45, 0, "L"],
  [45, 0, "R"],
  [-90, 0, ""],
  [90, 0, ""],
  [0, 30, "H"],
  [0, -15, "Lo"],
];

export function OrbitLeafCanvas(props: OrbitCanvasFaceProps): ReactElement {
  const { value, onChange } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // the arcball view (upstream OrbitView's resting pose)
  const [view, setView] = useState({ yaw: 0.24, tilt: 0.2 });
  const dragRef = useRef<null | { mode: "cam" | "view"; lastX: number; lastY: number; az: number; el: number }>(null);
  const handleRef = useRef<[number, number] | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const valueRef = useRef(value);
  valueRef.current = value;

  // project a sphere point through the arcball view
  const rot = (p: [number, number, number], yaw: number, tilt: number): [number, number, number] => {
    const [x, y, z] = p;
    const cyw = Math.cos(yaw);
    const syw = Math.sin(yaw);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const xr = x * cyw + y * syw;
    const yr = -x * syw + y * cyw;
    const yv = yr * ct - z * st;
    const zv = yr * st + z * ct;
    return [xr, yv, zv];
  };
  // inverse: canvas offset → (az, el), or null outside the disc
  const unproject = (px: number, py: number, R: number, yaw: number, tilt: number): [number, number] | null => {
    const xr = px / R;
    const zv = -py / R;
    const rr = xr * xr + zv * zv;
    if (rr > 1) return null;
    const yv = -Math.sqrt(1 - rr);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const yr = yv * ct + zv * st;
    const z = -yv * st + zv * ct;
    const cyw = Math.cos(yaw);
    const syw = Math.sin(yaw);
    const x = xr * cyw - yr * syw;
    const y = xr * syw + yr * cyw;
    const el = r2d(Math.asin(Math.max(-1, Math.min(1, z))));
    const az = r2d(Math.atan2(x, -y));
    return [az, el];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;
    const W = canvas.width;
    const H = canvas.height;
    const { yaw, tilt } = viewRef.current;
    const { orbit: az, tilt: el, dolly: dist } = valueRef.current;
    const R = Math.min(W, H) / 2 - 14;
    const cx = W / 2;
    const cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1b1b1f";
    ctx.fillRect(0, 0, W, H);
    const P = (a: number, e: number): [number, number, number] => {
      const [xr, yv, zv] = rot(spherePt(a, e), yaw, tilt);
      return [cx + R * xr, cy - R * zv, yv];
    };
    // trained-band hint, front hemisphere only (upstream renderSphere)
    const STEP = 15;
    for (let a0 = -90; a0 < 90; a0 += STEP) {
      for (let e0 = -45; e0 < 45; e0 += STEP) {
        const col = zoneColor(a0 + STEP / 2, e0 + STEP / 2);
        if (col === C_RED) continue;
        const quad: Array<[number, number]> = [];
        let dep = 0;
        for (const [aa, ee] of [[a0, e0], [a0 + STEP, e0], [a0 + STEP, e0 + STEP], [a0, e0 + STEP]] as Array<[number, number]>) {
          const [qx, qy, yv] = P(aa, ee);
          quad.push([qx, qy]);
          dep = yv;
        }
        if (dep >= 0) continue;
        ctx.beginPath();
        ctx.moveTo(quad[0][0], quad[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(quad[i][0], quad[i][1]);
        ctx.closePath();
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.13)`;
        ctx.fill();
      }
    }
    // equator + meridian rings
    ctx.lineWidth = 1.5;
    const ring = (pts: Array<[number, number, number]>): void => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1, f1] = pts[i];
        const [x2, y2, f2] = pts[i + 1];
        ctx.strokeStyle = f1 < 0 && f2 < 0 ? "rgba(200,204,216,0.5)" : "rgba(120,124,138,0.15)";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };
    const eq: Array<[number, number, number]> = [];
    for (let a = -180; a <= 180; a += 8) eq.push(P(a, 0));
    ring(eq);
    const mer: Array<[number, number, number]> = [];
    for (let e = -90; e <= 90; e += 8) mer.push(P(0, e));
    ring(mer);
    ctx.strokeStyle = "rgba(190,190,205,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    // subject stick-figure at the center
    ctx.strokeStyle = "#d8d8e0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 12);
    ctx.lineTo(cx, cy - 2);
    ctx.stroke();
    ctx.fillStyle = "#d8d8e0";
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 5, 0, Math.PI * 2);
    ctx.fill();
    // snap dots (F = home / source camera)
    for (const [a, e, lab] of SNAPS) {
      const [sxp, syp, f] = P(a, e);
      const rr = lab !== "" ? 9 : 6;
      ctx.globalAlpha = f < 0 ? 1.0 : 0.35;
      ctx.fillStyle = a === 0 && e === 0 ? "#ffffff" : "#3a4150";
      ctx.strokeStyle = "#9aa2b5";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sxp, syp, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (lab !== "") {
        ctx.fillStyle = a === 0 && e === 0 ? "#14161b" : "#d9dce3";
        ctx.font = "bold 9px monospace";
        const lw = ctx.measureText(lab).width;
        ctx.fillText(lab, sxp - lw / 2, syp + 3);
      }
      ctx.globalAlpha = 1.0;
    }
    // arc home -> camera
    ctx.strokeStyle = "#78beff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const [ax, ay] = P((az * i) / 14, (el * i) / 14);
      if (i > 0) ctx.lineTo(ax, ay);
      else ctx.moveTo(ax, ay);
    }
    ctx.stroke();
    // camera handle at distance-scaled radius
    const distF = distScale(dist);
    const [sx, sy, pf] = P(az, el);
    const px = cx + (sx - cx) * distF;
    const py = cy + (sy - cy) * distF;
    ctx.strokeStyle = "rgba(120,190,255,0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (sx - cx) * 1.32, cy + (sy - cy) * 1.32);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.stroke();
    handleRef.current = [px, py];
    ctx.globalAlpha = pf < 0 ? 1.0 : 0.45;
    ctx.strokeStyle = "#78beff";
    ctx.lineWidth = 1;
    for (const [dx, dy] of [[-8, -6], [8, -6], [-8, 6], [8, 6]] as Array<[number, number]>) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(cx + dx, cy + dy - 6);
      ctx.stroke();
    }
    ctx.fillStyle = "#78beff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(px - 13, py - 9, 26, 18, 4);
    else ctx.rect(px - 13, py - 9, 26, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#20242c";
    ctx.beginPath();
    ctx.arc(px + 5, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  const canvasPos = (e: React.PointerEvent): [number, number] => {
    const canvas = canvasRef.current;
    if (canvas === null) return [0, 0];
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2];
  };

  const onDown = (e: React.PointerEvent): void => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const [x, y] = canvasPos(e);
    const h = handleRef.current;
    if (h !== null) {
      const canvas = canvasRef.current;
      const scale = canvas !== null ? canvas.width / Math.max(1, canvas.getBoundingClientRect().width) : 1;
      const dx = x * scale - (h[0] - canvas!.width / 2);
      const dy = y * scale - (h[1] - canvas!.height / 2);
      if (Math.hypot(dx, dy) <= HANDLE_R + 4) {
        dragRef.current = { mode: "cam", lastX: x, lastY: y, az: valueRef.current.orbit, el: valueRef.current.tilt };
        return;
      }
    }
    dragRef.current = { mode: "view", lastX: x, lastY: y, az: 0, el: 0 };
  };
  const onMove = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    if (d === null) return;
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const [x, y] = canvasPos(e);
    const R = Math.min(canvas.width, canvas.height) / 2 - 14;
    const scale = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    if (d.mode === "view") {
      // arcball: drag empty space rotates the VIEW (never the pose)
      const dx = (x - d.lastX) * scale;
      const dy = (y - d.lastY) * scale;
      setView((v) => ({ yaw: v.yaw + dx / R, tilt: Math.max(-1.2, Math.min(1.2, v.tilt + dy / R)) }));
      d.lastX = x;
      d.lastY = y;
      return;
    }
    // drag the camera handle: canvas point → pose (upstream unproject)
    const px = x * scale;
    const py = y * scale;
    const hit = unproject(px, py, R, viewRef.current.yaw, viewRef.current.tilt);
    if (hit === null) return;
    d.az = clampAz(snap5(hit[0]));
    d.el = clampEl(snap5(hit[1]));
  };
  const onUp = (): void => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d === null || d.mode !== "cam") return;
    // THE COMMIT (the face contract): pointer-up reports the pose —
    // the leaf's Add/Save owns the chrome, the orb owns the seats.
    const cur = valueRef.current;
    if (d.az !== cur.orbit || d.el !== cur.tilt) {
      onChange({ orbit: d.az, tilt: d.el, dolly: cur.dolly });
    }
  };
  const onWheel = (e: React.WheelEvent): void => {
    e.preventDefault();
    const cur = valueRef.current;
    // wheel = dolly (upstream: industry standard), 0.05 per notch
    const next = clampDist(cur.dolly + (e.deltaY > 0 ? 0.05 : -0.05));
    if (next !== cur.dolly) onChange({ orbit: cur.orbit, tilt: cur.tilt, dolly: next });
  };
  const onDoubleClick = (): void => {
    // reset the VIEW rotation only (never the pose — upstream dblclick)
    setView({ yaw: 0.24, tilt: 0.2 });
  };

  return (
    <div data-orbit-leaf-canvas="embedded" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={520}
        height={300}
        style={{ width: "100%", cursor: "grab", touchAction: "none", borderRadius: 4, display: "block" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        role="application"
        aria-label={orbCopy.aria(value)}
      />
      <span style={{ opacity: 0.7, fontSize: 12 }}>{orbCopy.hint({ snap: SNAP_DEG })}</span>
    </div>
  );
}
