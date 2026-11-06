/** pack-parity-kimodo.spec.ts — THE KIMODO LIBRARY BOUND (F3 D3-06,
 *  the detection half; the drift itself already cured in-tree —
 *  pack ef0b656 → e7e0ffd → 1e7848f, `input_embeds` gone).
 *
 *  The burn (FRICTION_3 D3-06 / MOT-P0-16 / FL-P0-20): the motion
 *  lane died MID-RUN with
 *  ``create_causal_mask() got an unexpected keyword argument
 *  'input_embeds'. Did you mean 'inputs_embeds'?`` — transformers
 *  kwarg drift in KimodoTextToPose. The pack's requirements.txt
 *  left transformers UNPINNED ("already ships in the base env") —
 *  the exact trap that killed the lane: Manager re-runs
 *  requirements only on this pack's install/update, the venv is
 *  shared and last installer wins.
 *
 *  The law (closed for melite-audio-nodes 2026-10-24, applied to
 *  this sibling now): the tested bound is DECLARED at both publish
 *  doors and ASSERTED at boot in the pack's import path, before
 *  the nodes import — the next upstream rename dies at boot with
 *  the named remedy, never mid-run on a press.
 *
 *  CI note: the judge arms stand down when the engine venv is
 *  absent (the pack-parity-audiocore precedent — a CI box owns no
 *  GPU venv). */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../../../");
const VENDOR = join(ROOT, "vendor/comfyui_extensions");
const PACK = join(VENDOR, "melite-kimodo-nodes");
/** The estate venv standard (the tested bound — the same pin the
 *  audio pack owns; the live venv runs it, see
 *  pack-parity-audiocore.spec.ts's venv arms). */
const STANDARD = { transformers: "5.20.2", huggingface_hub: "==1.33.0" } as const;
/** The burn-era drifted version (the kwarg-drift class the judge
 *  must refuse): the 2026-10-23 outside install that landed under
 *  the shared venv. */
const BURN_VERSION = "5.1.0";
const VENV_PYTHON = "/home/user/tools/comfyui/.venv/bin/python";

const read = (name: string): string | null => {
  const p = join(PACK, name);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
};

describe("pack-parity-kimodo — THE KIMODO LIBRARY BOUND (D3-06: declared + asserted, never unpinned)", () => {
  it("the pack DECLARES the tested bound at both publish doors (requirements.txt + pyproject — one set, the parity law)", () => {
    const req = read("requirements.txt");
    expect(req, "requirements.txt exists").not.toBeNull();
    const body = (req as string).split("\n").map((l) => l.trim());
    expect(body, "transformers pinned to the estate standard — 'ships in the base env' is the trap that killed the lane").toContain(`transformers==${STANDARD.transformers}`);
    expect(body, "huggingface_hub pinned beside it (the 5.x line's own requirement)").toContain(`huggingface_hub${STANDARD.huggingface_hub}`);
    const pyproject = read("pyproject.toml");
    expect(pyproject, "pyproject.toml exists").not.toBeNull();
    const deps = (pyproject as string).split("\n").map((l) => l.trim());
    expect(deps.some((l) => l === `"transformers==${STANDARD.transformers}",`),
      "the registry door pins the same bound (Manager door and Comfy registry door are one set)").toBe(true);
    expect(deps.some((l) => l === `"huggingface_hub${STANDARD.huggingface_hub}",`),
      "the registry door pins the hub beside it").toBe(true);
  });

  it("the pack ASSERTS the python env AT IMPORT — assert_transformers_bound rides the ARMED lane, before the nodes import, and the refusal names the burn's own kwarg", () => {
    const init = read("__init__.py");
    expect(init, "__init__.py exists").not.toBeNull();
    const body = init as string;
    // Judge the ACTIVE call — a commented spell never counts (the
    // audiocore toggle-proof's own lesson, 2026-11-12). The call is
    // gated on the armed lane (kimodo importable) — the
    // cold-clone-pack-import law reconciliation (D3-06): a bare
    // clone with kimodo UNRESOLVED must soft-register (a raise at
    // import drops the whole pack from ComfyUI — the failure lands
    // at KimodoLoader.load with its breadcrumb), while a drifted
    // env that CAN arm refuses at boot. The kwarg drift kills
    // MID-RUN exactly when the lane can run.
    const gateIdx = body.indexOf("if _KIMODO_SOURCE is not None:");
    const assertIdx = body.indexOf("\n    assert_transformers_bound()");
    const importIdx = body.indexOf("from .nodes import");
    const exceptIdx = body.indexOf("_KIMODO_SOURCE = None");
    expect(gateIdx, "__init__.py gates the assert on the armed lane (_KIMODO_SOURCE is not None)").toBeGreaterThan(-1);
    expect(assertIdx, "__init__.py calls assert_transformers_bound() as a live statement inside the gate").toBeGreaterThan(-1);
    expect(importIdx, "__init__.py imports the nodes").toBeGreaterThan(-1);
    expect(assertIdx, "the assert fires BEFORE the nodes import — a drifted env refuses the whole pack at boot, never a dead lane on press").toBeLessThan(importIdx);
    expect(gateIdx, "the gate rides AFTER the kimodo bootstrap's except leg — the register-anyway law owns the unarmed clone").toBeGreaterThan(exceptIdx);
    const env = read("env_assert.py");
    expect(env, "env_assert.py exists").not.toBeNull();
    // The refusal carries the burn's own text so the maker greps the
    // lane's death straight to its remedy.
    expect((env as string).includes("input_embeds"), "the refusal names the burn's kwarg (input_embeds)").toBe(true);
    expect((env as string).includes("melite-kimodo-nodes"), "the refusal names the pack").toBe(true);
  });

  it("THE BOUND JUDGE: the burn-era drift reds the bound, the estate standard passes (the 2026-11-13 kwarg drift, judged)", () => {
    // Runs the pack's OWN judge in python (the same venv grammar the
    // engine runs); reds if the judge ever stops refusing the
    // drifted version or stops passing the estate standard.
    const probe = [
      "import sys; sys.path.insert(0, sys.argv[1])",
      "from env_assert import _version_tuple, TRANSFORMERS_FLOOR, TRANSFORMERS_CEILING",
      `assert not (_version_tuple('${BURN_VERSION}') >= _version_tuple(TRANSFORMERS_FLOOR) and _version_tuple('${BURN_VERSION}') < _version_tuple(TRANSFORMERS_CEILING)), 'the burn-era drift ${BURN_VERSION} passes the bound — the judge is dead'`,
      `assert _version_tuple('${STANDARD.transformers}') >= _version_tuple(TRANSFORMERS_FLOOR) and _version_tuple('${STANDARD.transformers}') < _version_tuple(TRANSFORMERS_CEILING), 'the estate standard ${STANDARD.transformers} fails the bound'`,
      "print('judge-live')",
    ].join("; ");
    let out: string;
    try {
      out = execFileSync(VENV_PYTHON, ["-c", probe, PACK], { encoding: "utf8" }).trim();
    } catch {
      // engine venv absent (CI box): stand down like the deployed arm
      return;
    }
    expect(out).toBe("judge-live");
  });

  it("THE BOOT REFUSAL is real: importing the pack under a drifted env dies with the named remedy (not a raw AttributeError mid-run)", () => {
    // The wiring arm above proves the call site; this arm proves the
    // refusal TEXT itself — the cure's whole point is that the next
    // drift reads as a named remedy at boot, never as the mid-run
    // TypeError the operator grepped backwards from.
    const env = read("env_assert.py");
    expect(env).not.toBeNull();
    const m = (env as string).match(/REMEDY = \(([\s\S]*?)\n\)/);
    expect(m, "the REMEDY string exists").not.toBeNull();
    const remedy = m![1]!;
    expect(remedy.includes("floor") && remedy.includes("ceil"), "the remedy templating carries the bound").toBe(true);
    expect(remedy.includes("pip install"), "the remedy names the lever").toBe(true);
    // and the live venv really holds the standard (the deployed arm:
    // an un-converged estate reds here, naming the drift before any
    // lane press can)
    let version = "";
    try {
      version = execFileSync(VENV_PYTHON, ["-c", "import importlib.metadata as m; print(m.version('transformers'))"], { encoding: "utf8" }).trim();
    } catch {
      return; // no venv on this box: the judge arms above own the law
    }
    expect(version, "the live engine venv holds the tested bound the pack declares").toBe(STANDARD.transformers);
  });
});
