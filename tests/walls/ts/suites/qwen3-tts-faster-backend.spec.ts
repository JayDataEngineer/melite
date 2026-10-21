// qwen3-tts-faster-backend.spec.ts — THE FASTER BACKEND WALL
// (operator: "qwen-tts 0.1 ... REPLACES qwen-tts dude. We do ONE or the
// other, not faster-qwen AND normal qwen"; "wrap faster tts, add the
// qvoice crap, wrap the moss-tts-sfx-2 implementation").
//
// engines/qwen3_tts.py wraps FasterQwen3TTS (torch backend), never raw
// qwen_tts, for all synthesis — the wrapped qwen handle (self._qwen)
// is used ONLY for get_supported_speakers / create_voice_clone_prompt /
// the WDELTA talker patch. The silent vivian default is dead: an
// unstated speaker on the plain-TTS path is a LOUD refuse.
//
// ARM 1 — THE STATIC DOOR: the engine source carries the faster
//   construction and no silent default (toggle: restore
//   `"speaker": "vivian"` or `Qwen3TTSModel.from_pretrained` → red).
// ARM 2 — THE VENV DOOR (operator-local; skips where the engine venv
//   is absent): the REAL module imported in the REAL engine venv —
//   _DEFAULTS["speaker"] is "", empty-speaker refuses loud naming the
//   speaker, and the rope-registry patch points at the tolerant shim
//   (toggle: delete _tolerant_default_rope_parameters → red).
// ARM 3 — THE SHIM DOOR (venv, no weights/GPU): the tolerant RoPE
//   initializer returns qwen's EXACT math on a normal config and a
//   finite inv_freq on a real MimiConfig (the config class that
//   burns the stock shim — transformers 5.20 keeps RoPE params in
//   rope_parameters, no rope_theta). Toggle: point the registry back
//   at qwen's stock initializer → the MimiConfig call reds with the
//   production AttributeError.
import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(__dirname, "..", "..", "..", "..");
const ENGINE = join(
  ROOT, "vendor", "comfyui_extensions", "melite-audio-nodes",
  "engines", "qwen3_tts.py",
);
/** The engine's own venv (operator-local; absent on CI). */
const VENV_PYTHON = "/home/user/tools/comfyui/.venv/bin/python";
const venvPresent = existsSync(VENV_PYTHON);

const src = (): string => readFileSync(ENGINE, "utf8");

/** Run a python probe in the engine venv; returns stdout. */
const py = (code: string): string => {
  // core.py resolves the audiocpp model folder at import — stand it up
  // in a temp dir so the import works off-estate (no weights needed;
  // the probe never loads a model).
  const fakeModels = join(tmpdir(), "wall-audiocpp-models");
  mkdirSync(fakeModels, { recursive: true });
  return execFileSync(VENV_PYTHON, ["-c", code], {
    encoding: "utf8",
    cwd: "/tmp",
    timeout: 240000,
    env: { ...process.env, AUDIOCPP_MODELS_DIR: fakeModels },
  }) as string;
};

const LOADER = `
import sys, types, importlib.util
pack = '${join(ROOT, "vendor", "comfyui_extensions", "melite-audio-nodes")}'
pkg = types.ModuleType('walltest'); pkg.__path__ = [pack]
sys.modules['walltest'] = pkg
for sub in ('core', 'qvoice'):
    spec = importlib.util.spec_from_file_location('walltest.'+sub, pack+'/'+sub+'.py')
    mod = importlib.util.module_from_spec(spec); sys.modules['walltest.'+sub] = mod
    spec.loader.exec_module(mod)
eng = types.ModuleType('walltest.engines'); eng.__path__ = [pack+'/engines']
sys.modules['walltest.engines'] = eng
spec = importlib.util.spec_from_file_location('walltest.engines.qwen3_tts', pack+'/engines/qwen3_tts.py')
m = importlib.util.module_from_spec(spec); sys.modules['walltest.engines.qwen3_tts'] = m
spec.loader.exec_module(m)
`;

describe("the faster-backend wall", () => {
  it("ARM 1 — the engine constructs FasterQwen3TTS and carries no silent default (toggle either → red)", () => {
    const s = src();
    expect(s, "faster construction gone — raw qwen is back").toMatch(
      /from faster_qwen3_tts import FasterQwen3TTS/,
    );
    expect(s, "faster construction gone").toMatch(
      /FasterQwen3TTS\.from_pretrained\(/,
    );
    expect(
      s.includes("Qwen3TTSModel.from_pretrained"),
      "bare Qwen3TTSModel.from_pretrained is back — faster REPLACES qwen, never both",
    ).toBe(false);
    expect(
      s.includes("device_map="),
      "device_map= is the qwen-direct spelling — faster takes device=",
    ).toBe(false);
    expect(s, "the silent vivian default is back").toMatch(
      /"speaker": ""/,
    );
    expect(
      s.includes('"speaker": "vivian"'),
      'a "vivian" default string survives somewhere in the engine',
    ).toBe(false);
    // HOLE-A CLOSURE (auditor 2026-10-21): neither the dict-spelling
    // arm nor a kwarg-spelling pin catches a silent default under
    // ANOTHER preset's name (e.g. kwargs.get("speaker", "serena")).
    // Sweep EVERY preset name: the only double-quoted preset literal
    // allowed in code is the STATED speaker="vivian" of the wdelta
    // no-ref-audio fallback. Any silent default, any preset, reds.
    const PRESETS = ["ryan", "aiden", "vivian", "serena", "uncle_fu", "dylan", "eric", "ono_anna", "sohee"];
    const codeLines = s
      .split("\n")
      .filter((l) => !l.trim().startsWith("#"));
    const presetHits: string[] = [];
    for (const p of PRESETS)
      for (const l of codeLines)
        if (l.includes(`"${p}"`)) presetHits.push(l.trim());
    expect(
      presetHits,
      "string-literal preset in code — a silent default in some preset's name",
    ).toEqual([expect.stringContaining('speaker="vivian"')]);
    expect(s, "the empty-speaker loud refuse is gone").toMatch(
      /needs a stated speaker preset/,
    );
    expect(
      s.includes('gen["emotion"] = emotion'),
      "emotion is forwarded into generate_* again — faster takes no emotion kwarg",
    ).toBe(false);
    expect(
      /out\["seed"\] = /.test(s) || /gen_kwargs\["seed"\] = /.test(s),
      "seed is forwarded into generate_* again — faster takes no seed kwarg",
    ).toBe(false);
  });

  it.skipIf(!venvPresent)(
    "ARM 2 — the real module refuses an unstated speaker loud and seats the tolerant rope patch (toggle either → red)",
    () => {
      const out = py(`${LOADER}
e = m.Qwen3TtsEngine()
print('speaker-default=' + repr(m._DEFAULTS['speaker']))
try:
    e._custom_voice('hi', '', 'english', '', {})
    print('refuse=MISSING')
except RuntimeError as ex:
    print('refuse=' + str(ex)[:60])
m._ensure_rope_registry()
from transformers.modeling_rope_utils import ROPE_INIT_FUNCTIONS
print('registry-tolerant=' + str(ROPE_INIT_FUNCTIONS['default'] is m._tolerant_default_rope_parameters))
`);
      expect(out).toContain("speaker-default=''");
      expect(out).toMatch(/refuse=.*stated speaker preset/);
      expect(out).toContain("registry-tolerant=True");
    },
  );

  it.skipIf(!venvPresent)(
    "ARM 3 — the tolerant shim matches qwen exactly on normal configs and survives a real MimiConfig (toggle → red)",
    () => {
      const out = py(`${LOADER}
import torch
from transformers.models.mimi.configuration_mimi import MimiConfig
from qwen_tts import _transformers_compat as qc
from types import SimpleNamespace
n = SimpleNamespace(rope_theta=10000.0, partial_rotary_factor=1.0, hidden_size=1024, num_attention_heads=8, head_dim=None)
a = qc._default_rope_parameters(n)
b = m._tolerant_default_rope_parameters(n)
print('delegate-identical=' + str(bool(torch.equal(a[0], b[0])) and a[1] == b[1]))
inv, scale = m._tolerant_default_rope_parameters(MimiConfig())
print('mimi-shape=' + str(tuple(inv.shape)) + ' finite=' + str(bool(torch.isfinite(inv).all())) + ' scale=' + str(scale))
try:
    qc._default_rope_parameters(MimiConfig())
    print('stock-survives=True')
except AttributeError as ex:
    print('stock-burns=AttributeError')
`);
      expect(out).toContain("delegate-identical=True");
      expect(out).toMatch(/mimi-shape=\(32,\) finite=True/);
      // The control: the stock shim burns on exactly this config —
      // the arm judges the production failure, not a strawman.
      expect(out).toContain("stock-burns=AttributeError");
    },
  );
});
