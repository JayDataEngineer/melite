// endpoint-seed-byo.spec.ts — THE ATTACH SEED LAW (audit 019 C5 + C4).
//
// The shipped seed `packages/engines/comfyui-cordis/data/
// comfyui_endpoint.json` is the ONLY endpoint statement a consumer
// install has (the F1 state home is untracked and absent on a fresh
// box), and it shipped dev-shaped: `provision:"managed"` + a
// repo-relative `boot_cmd` (`cd <repo>/data/runtime/comfyui ...`) —
// paths that exist nowhere on a consumer machine (audit 019 F5). On
// an installed profile `resolveRepoRoot()` is the profile dir, so
// the seed's job is ATTACH to the user's own ComfyUI, never manage
// one: the managed shape is only ever WRITTEN by the provisioner
// into the state home. The wall rides the real loader (the built
// lib, the artifact plane an install ships) and the real BYO door —
// not a copy of either.
//
// CURE C5 arms: (1) the seed is attach-shaped (byo, stock url, no
// boot_cmd, no dev locals, no machine-local absolute paths);
// (2) with only the seed on disk, the real loader resolves an attach
// endpoint at the seed's url; (3) the boot_cmd arm is the red-proof
// seat — a seed carrying a repo-relative boot_cmd fails it (toggle
// by regenerating, restore after).
//
// CURE C4 arms (the BYO extra-model-paths door): the marked-block
// writer is byte-wise idempotent and never touches the user's own
// bytes; the door refuses loud on a non-engine root, a missing
// store, and a torn block; the probe asks the RUNNING engine
// (read-only GET /models/<folder> — never a POST) whether the
// store's folders are visible, and its unlink verdict fires when
// the engine does not register/list the store.
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer, type IncomingMessage } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BYO_BLOCK_BEGIN,
  byoExtraPathsFile,
  probeStoreFolders,
  resolveByoAttach,
  writeByoExtraPaths,
} from "../../../../packages/engines/comfyui-cordis/scripts/provision-instance-layout.ts";

const REPO = join(import.meta.dirname, "..", "..", "..", "..");
const SEED = join(REPO, "packages", "engines", "comfyui-cordis",
  "data", "comfyui_endpoint.json");
// The ARTIFACT plane: an install resolves its seed through the built
// lib (the files set ships lib/** + data/**), so the resolution arm
// runs the built module, never the src copy.
const BUILT = join(REPO, "packages", "engines", "comfyui-cordis", "lib",
  "src", "comfyui-config.js");

/** Dev-machine statement keys that must never ship in the seed. */
const DEV_KEYS: readonly string[] = [
  "boot_cmd", "input_dir", "input_dir_container", "output_dir",
  "engine_root", "lanes_env_file",
];

function seedJson(): Record<string, unknown> {
  return JSON.parse(readFileSync(SEED, "utf8")) as Record<string, unknown>;
}

/** Every string value in the seed, walked recursively (folders map
 *  included). */
function *stringValues(node: unknown): Generator<string> {
  if (typeof node === "string") {
    yield node;
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) yield *stringValues(v);
    return;
  }
  if (typeof node === "object" && node !== null) {
    for (const v of Object.values(node)) yield *stringValues(v);
  }
}

/** A machine-local or repo-anchored value: absolute POSIX, Windows
 *  drive, UNC, or the `<repo>` placeholder the managed boot_cmd
 *  carried. */
function isMachineLocal(v: string): boolean {
  return (
    v.startsWith("/") ||
    v.startsWith("\\\\") ||
    /^[A-Za-z]:[\\/]/.test(v) ||
    v.includes("<repo>")
  );
}

/** Mint a temp ComfyUI-shaped engine root + model store, disposed
 *  with the test. */
function mintEngine(): { engine: string; store: string } {
  const root = mkdtempSync(join(tmpdir(), "byo-attach-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  const engine = join(root, "ComfyUI");
  const store = join(root, "store");
  mkdirSync(engine, { recursive: true });
  mkdirSync(store, { recursive: true });
  writeFileSync(join(engine, "main.py"), "# engine marker\n");
  mkdirSync(join(store, "checkpoints"), { recursive: true });
  writeFileSync(join(store, "checkpoints", "melite.safetensors"), "w");
  mkdirSync(join(store, "loras"), { recursive: true });
  return { engine, store };
}

describe("the attach seed law (audit 019 C5: the shipped seed attaches, never manages)", () => {
  it("the seed is attach-shaped: byo, stock url, the store schema, no dev-machine fields, no machine-local paths", () => {
    const seed = seedJson();
    assert.equal(
      seed["provision"], "byo",
      'the seed must carry "byo" (the enum\'s attach mode — cmdVerify refuses anything but byo|managed); "managed" ships a repo-anchored dev recipe to consumers');
    assert.equal(
      seed["url"], "http://127.0.0.1:8188",
      "the attach target is the stock local ComfyUI port");
    const extras = seed["extra_model_folders"];
    assert.ok(
      typeof extras === "object" && extras !== null &&
        Object.keys(extras as object).length > 0,
      "the store schema (extra_model_folders) rides the seed — the runtime catalog resolves pack categories through it on every fresh install");
    for (const k of DEV_KEYS) {
      assert.ok(
        !(k in seed),
        `the seed ships "${k}" — a dev-machine statement that names nothing on a consumer box (the managed shape belongs to the state home the provisioner writes)`);
    }
    for (const v of stringValues(seed)) {
      assert.ok(
        !isMachineLocal(v),
        "the seed ships a machine-local or repo-anchored value: " +
          JSON.stringify(v) +
          " — shipped data must be portable (audit 019 C5)");
    }
  });

  it("RED-PROOF SEAT: a seed carrying a repo-relative boot_cmd fails this arm (toggle: add boot_cmd to the seed, rerun, restore)", () => {
    const seed = seedJson();
    assert.ok(
      !("boot_cmd" in seed),
      "boot_cmd shipped in the seed — the attach seed never carries a launch " +
        "line: the user's instance is theirs (provision boot-cmd's byo arm " +
        "echoes the USER's own line); a repo-relative boot_cmd is the exact " +
        "dev-shape poison audit 019 F5 burned");
  });

  it("attach resolution rides the real loader: state home absent, the seed serves its url (the built artifact plane)", () => {
    assert.ok(
      existsSync(BUILT),
      "built artifact present (run node tools/build-plane.mjs build)",
    );
    // A consumer-shaped repo root: NO state home, NO env pins.
    const fixture = mkdtempSync(join(tmpdir(), "byo-seed-root-"));
    onTestFinished(() => rmSync(fixture, { recursive: true, force: true }));
    const childEnv: Record<string, string | undefined> = { ...process.env };
    delete childEnv["COMFYUI_URL"];
    delete childEnv["COMFYUI_ENDPOINT_CONFIG"];
    delete childEnv["INFERENCE_TEST_SANDBOX"];
    childEnv["MELITE_REPO_ROOT"] = fixture;
    const out = execFileSync("node", ["-e",
      "import(process.argv[1]).then(m => process.stdout.write(JSON.stringify(" +
      "{ cfg: m.loadEndpointConfig(), url: m.resolveEngineBaseUrl(), " +
      "seedPath: m.endpointSeedPath() })))",
      BUILT], { encoding: "utf8", env: childEnv as NodeJS.ProcessEnv });
    const resolved = JSON.parse(out) as {
      cfg: Record<string, unknown>; url: string; seedPath: string };
    assert.equal(
      resolved.seedPath, SEED,
      "the built loader anchors the shipped seed on its package root");
    assert.deepEqual(
      resolved.cfg, seedJson(),
      "with no state home the real loader serves the shipped seed — " +
        "if the state home leaked in, this deep-equal reds on its shape");
    assert.equal(
      resolved.url, seedJson()["url"],
      "the resolved attach endpoint is the seed's own url");
  });
});

describe("the BYO extra-model-paths door (audit 019 C4: the single-file marked block)", () => {
  it("the writer links the store and the second run is a byte-wise no-op", () => {
    const { engine, store } = mintEngine();
    const extras = { qwen3_tts: "audio/qwen3-tts/hf" };
    const first = writeByoExtraPaths(engine, store, extras);
    assert.ok(first.created && first.wrote, "first write creates the file");
    assert.equal(first.path, byoExtraPathsFile(engine));
    const once = readFileSync(first.path, "utf8");
    assert.ok(once.startsWith(BYO_BLOCK_BEGIN), "the fresh file is melite's block");
    assert.ok(once.includes("base_path: " + store), "the store root is bound");
    assert.ok(once.includes("audio/qwen3-tts/hf"), "pack categories bind");
    assert.ok(once.includes("download_model_base:"), "the Manager download registration binds");
    const second = writeByoExtraPaths(engine, store, extras);
    assert.equal(second.wrote, false, "the second run writes nothing");
    assert.equal(readFileSync(first.path, "utf8"), once, "byte-identical");
  });

  it("the writer appends after the user's own yaml and never rewrites a byte of it; drift inside the block regenerates", () => {
    const { engine, store } = mintEngine();
    const user = "# my own extra paths\nrefined:\n  checkpoints: /mine";
    writeFileSync(byoExtraPathsFile(engine), user); // no trailing newline on purpose
    const first = writeByoExtraPaths(engine, store);
    assert.ok(first.wrote && !first.created, "appended to the existing file");
    const once = readFileSync(first.path, "utf8");
    assert.ok(once.startsWith(user + "\n"), "the user's bytes lead, newline repaired only");
    // drift: the store moves under melite's own block
    const drifted = once.replace("base_path: " + store, "base_path: /moved/store");
    writeFileSync(first.path, drifted);
    const second = writeByoExtraPaths(engine, store);
    assert.ok(second.wrote, "drift inside the block regenerates");
    const after = readFileSync(first.path, "utf8");
    assert.ok(after.startsWith(user + "\n"), "the user's bytes still lead");
    assert.ok(after.includes("base_path: " + store), "the block is melite's truth again");
    const third = writeByoExtraPaths(engine, store);
    assert.equal(third.wrote, false, "idempotent after the repair");
    assert.equal(readFileSync(first.path, "utf8"), after);
  });

  it("the door refuses loud: a non-engine root, a missing store, a torn block", () => {
    const { engine, store } = mintEngine();
    const root = join(engine, "..");
    mkdirSync(join(root, "not-an-engine"), { recursive: true });
    assert.throws(
      () => writeByoExtraPaths(join(root, "not-an-engine"), store),
      /not a ComfyUI tree.*never guessed/s,
      "an engine root without ComfyUI markers refuses with the remedy");
    assert.throws(
      () => writeByoExtraPaths(join(root, "also-absent"), store),
      /engine root does not exist.*never guessed/s);
    assert.throws(
      () => writeByoExtraPaths(engine, join(root, "no-store")),
      /store does not exist.*never guessed/s,
      "a dead store root refuses — ComfyUI serves empty enums for it");
    writeFileSync(byoExtraPathsFile(engine), BYO_BLOCK_BEGIN + "\nno end\n");
    assert.throws(
      () => writeByoExtraPaths(engine, store),
      /torn byo-attach block/,
      "a begin marker without its end refuses — the writer never guesses");
  });

  it("resolveByoAttach refuses loud with the remedy when nothing names an engine root", () => {
    const { engine, store } = mintEngine();
    assert.throws(
      () => resolveByoAttach({ url: "http://127.0.0.1:8188" }, undefined, ""),
      /no engine root to attach.*engine_root.*live_root/s,
      "no statement -> the loud refusal naming both statement seats");
    const got = resolveByoAttach({
      url: "http://127.0.0.1:8188",
      engine_root: engine,
    } as never);
    assert.equal(got.engineRoot, engine, "the endpoint statement's engine_root is honored");
    assert.ok(got.storeRoot.length > 0, "a store root resolves beside it");
    void store;
  });
});

describe("the store-visibility probe (audit 019 C4: ask the RUNNING engine, read-only)", () => {
  it("GET /models/<folder> only: a linked store's file lists (visible); an unregistered folder reds the unlink verdict; transport failure throws, never merges", async () => {
    const { engine, store } = mintEngine();
    void engine;
    const methods: string[] = [];
    const srv = createServer((req: IncomingMessage, res) => {
      const u = String(req.url);
      methods.push(req.method ?? "?");
      if (u.startsWith("/models/checkpoints")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(["melite.safetensors"]));
        return;
      }
      if (u.startsWith("/models/loras")) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end("null");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const base = "http://127.0.0.1:" +
      String(typeof addr === "object" && addr !== null ? addr.port : 0);
    onTestFinished(() => new Promise<void>((resolve) => {
      srv.closeAllConnections();
      srv.close(() => resolve());
    }));
    const verdicts = await probeStoreFolders(
      base,
      { checkpoints: "checkpoints", loras: "loras" },
      { storeRoot: store, timeoutMs: 2000 },
    );
    const byFolder = new Map(verdicts.map((v) => [v.folder, v]));
    assert.ok(
      byFolder.get("checkpoints")?.visible,
      "the store's file appears in the engine's listing — the link is live");
    assert.equal(byFolder.get("loras")?.registered, false);
    assert.equal(
      byFolder.get("loras")?.visible, false,
      "THE UNLINK VERDICT: the store's loras folder is not registered on " +
        "the engine — this is the red the probe owes when the wiring is " +
        "absent or the engine has not been restarted since it was written");
    for (const m of methods) {
      assert.equal(m, "GET", "the probe is read-only — every engine hit is a GET");
    }
    // An unreachable engine is a DISTINCT verdict: throw, never a
    // silent merge into "unlinked" (a down engine is not an unlinked
    // store — the remedies differ).
    await assert.rejects(
      () => probeStoreFolders("http://127.0.0.1:1", { checkpoints: "checkpoints" }),
      /engine unreachable/,
      "transport failure propagates loud (the engine is down, not unlinked)");
  });
});
