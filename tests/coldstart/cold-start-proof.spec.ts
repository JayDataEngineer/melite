// tests/coldstart/cold-start-proof.spec.ts — THE COLD-START PROOF
// WALL. The operator's order (2026-11-04): "a user FROM NOTHING runs
// the simple commands and starts generating with Krea-2 — provably,
// friction-free, with a container proving it's clean." The wall has
// two faces:
//
//   THE CONTAINER FACE — tools/cold-start-proof.mjs run in docker:
//   a fresh DSH_HOME, the official seat command against a lean
//   in-container git remote (six seat files), and the composed
//   profile carrying the melite bundle rows. Reds when the seat
//   regresses: a seat file lost, a bundle row dropped, a compose
//   refusal.
//
//   THE ESTATE ARMS — the cold-start tier's own scratch world (the
//   bootColdStartWorld law: pinned core, Manager seed, empty model
//   tree, ephemeral port, never the live engine's port). No weight
//   ever downloads here; every door is probed at its refusal order:
//     D1 the Manager answers — the seed is the only pack, the model
//        queue is alive
//     D2 the git-url door is OPEN at the pinned flag
//        (allow_git_url_install=true + loopback listen): the route
//        runs its security predicate BEFORE the body parse, so a
//        url-less body answers the door's own 400 and never the 403
//        security word
//     D3 the model-queue door is OPEN at security_level=normal-: a
//        non-whitelisted row rides past the security predicate to
//        the whitelist's 400 and enqueues nothing
//     E  the load payload (the loadPlane.loadCard bundle the
//        melite_load tool serves) discloses the image-gen card's
//        boarded weights with every hint honestly ABSENT on the
//        cold tree — true-to-decl presence, all absent
//     F  the acquire door PLANS the krea-2 rows through the estate's
//        own declaration port — names, folders, urls, sha256s,
//        exact byte sizes — and never a download: the census after
//        every arm is still zero weight files
//     G  the user-lora JOURNEY (operator 2026-11-04: "we can test
//        the 'user uploads a lora and it goes inside a card's mod
//        lora slot' as well — this is a difficult flow, so we need
//        some way to test it"): the manage seat's `lora_install`
//        bytes arm uploads, lands under the engine's own loras dir,
//        seats the row, the card's loras lanes offer the file for
//        the family, and the composed graph wires LoraLoaderModelOnly
//        — the full compose door stays the tier's named debt (its
//        wiring wall judges weight combos the cold world never holds)
//
// Registry row: infra-cold-start-proof (dev_docs/contracts/registry/
// infra-tier.yaml); the red-proof receipt lives beside it.
import "../helpers/boot-models.ts";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, test } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { GraphBuilder, modelsService, theService } from "@melite/comfyui-cordis";
import { ProvisioningService } from "@melite/estate-provisioning";
import type { ProvisionPlan } from "@melite/estate-provisioning";
import { CardRegistryService, ManageGatewayService, loadCard, manageProvider } from "@melite/estate-queue";
import { DECL as KREA2_DECL } from "@melite/models-krea-2";
import { declarationPort } from "../../packages/web/melite-estate/src/provisioning.ts";
import {
  bootColdStartWorld,
  censusWeightFiles,
  killScratchEngine,
  newScratchRoot,
  preflightMisses,
  REPO_ROOT,
  teardownScratch,
  type ColdStartWorld,
} from "./harness.ts";

const misses = await preflightMisses();

/** The docker availability miss (empty string = docker answers). */
function dockerMiss(): string {
  const r = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { encoding: "utf8", timeout: 30_000 });
  return r.status === 0 ? "" : "docker is not answering (exit " + String(r.status) + ")";
}

/** The receipt line the driver's engine leg surfaces verbatim (the
 *  first-image rehearsal's shape). */
function proof(id: string, ok: boolean, detail: string): void {
  console.log(`PROOF ${ok ? "PASS" : "FAIL"} — ${id}: ${detail}`);
}

describe.skipIf(misses.length > 0)("the cold-start proof: the container face (the seat, from nothing)", () => {
  const noDocker = dockerMiss();

  test("the container journey holds: fresh DSH_HOME, the official seat against the lean remote, the composed estate", { skip: noDocker !== "" ? noDocker : undefined, timeout: 1_800_000 }, () => {
    const receiptPath = join(tmpdir(), "cold-start-proof-receipt.json");
    rmSync(receiptPath, { force: true });
    // THE FULL CONTAINER JOURNEY, via the driver's own container
    // face — the same command the CI job runs. Receipt JSON on the
    // side so this arm asserts the STEPS, not just an exit code.
    const r = spawnSync("node", ["tools/cold-start-proof.mjs", "--container-only", "--receipt", receiptPath], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 1_800_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    const transcript = String(r.stdout ?? "") + String(r.stderr ?? "");
    proof("container-seat-from-nothing", r.status === 0, "exit " + String(r.status) + " — " + transcript.split("\n").slice(-4).join(" | ").slice(0, 400));
    assert.equal(r.status, 0, "the container proof exited nonzero:\n" + transcript.split("\n").slice(-40).join("\n"));
    assert.ok(existsSync(receiptPath), "the driver wrote no receipt JSON");
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as { ok: boolean; steps: Array<{ id: string; ok: boolean; detail: string }> };
    assert.equal(receipt.ok, true, "the container receipt reports a failed step");
    const ids = new Set(receipt.steps.map((s) => s.id));
    for (const required of ["container-home-fresh", "container-seat-official", "container-compose-estate"]) {
      assert.ok(ids.has(required), "the container receipt lost the " + required + " step");
    }
    const bad = receipt.steps.filter((s) => !s.ok);
    assert.deepEqual(bad, [], "failed container steps: " + bad.map((s) => s.id + " — " + s.detail).join("; "));
    // THE CLEAN EXIT: the journey ran inside the container's own
    // layer — nothing it wrote outlives the --rm.
  });
});

describe.skipIf(misses.length > 0)("the cold-start proof: the estate arms (the engine doors, the load disclosure, the krea-2 plan)", () => {
  let world: ColdStartWorld;
  let scratchRoot: string;
  let registry: CardRegistryService;
  let estateCtx: Context;
  let endpointSaved: string | undefined;
  let endpointPath: string;
  let repoView: string;

  beforeAll(async () => {
    scratchRoot = newScratchRoot();
    world = await bootColdStartWorld(scratchRoot);
    // THE SCRATCH ENGINE IS THE ENDPOINT: the card registry primes
    // its object_info against the scratch engine (explicit pin, the
    // mintSandbox law — never ambient machine state), and the
    // sandbox gate keeps every other config read off the machine.
    endpointSaved = process.env.COMFYUI_ENDPOINT_CONFIG;
    endpointPath = join(scratchRoot, "endpoint.json");
    writeFileSync(endpointPath, JSON.stringify({ url: world.engine.baseUrl }) + "\n");
    process.env.COMFYUI_ENDPOINT_CONFIG = endpointPath;
    process.env.INFERENCE_TEST_SANDBOX = "1";
    // THE COLD REPO VIEW: the load door reads packages/ from the
    // repo tree, and the presence walk reads <repo>/data — a view
    // that symlinks everything but data/ (and .git) is the genuinely
    // cold machine: real card sources, zero weight roots. It lives
    // inside the tier's own scratch tree; teardownScratch owns it.
    repoView = join(scratchRoot, "repo-view");
    mkdirSync(repoView, { recursive: true });
    for (const entry of readdirSync(REPO_ROOT)) {
      if (entry === "data" || entry === ".git" || entry === "node_modules") continue;
      symlinkSync(join(REPO_ROOT, entry), join(repoView, entry), "dir");
    }
    // THE REGISTRY (the family-coverage wall's shape): the queue
    // stub is the only service the registry reads; prime() boots the
    // card defs, the models, and the object_info doc.
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = {
      stateRoot: scratchRoot,
      stateRoots: [] as string[],
    };
    registry = new CardRegistryService(ctx);
    estateCtx = ctx;
    await registry.prime();
  }, 900_000);

  afterAll(async () => {
    if (world !== undefined) await killScratchEngine(world);
    if (scratchRoot !== undefined && process.env.COLDSTART_KEEP_SCRATCH !== "1") teardownScratch(scratchRoot);
    if (endpointSaved === undefined) delete process.env.COMFYUI_ENDPOINT_CONFIG;
    else process.env.COMFYUI_ENDPOINT_CONFIG = endpointSaved;
    delete process.env.INFERENCE_TEST_SANDBOX;
  });

  test("D1: the Manager answers — the seed is the only pack, the queue is alive", async () => {
    const installed = await (await fetch(world.engine.baseUrl + "/customnode/installed", { signal: AbortSignal.timeout(30_000) })).json() as Record<string, unknown>;
    assert.ok("comfyui-manager" in installed, "Manager's installed census lost its own seed: " + Object.keys(installed).join(", "));
    const status = await (await fetch(world.engine.baseUrl + "/manager/queue/status", { signal: AbortSignal.timeout(30_000) })).json() as Record<string, unknown>;
    for (const key of ["total_count", "done_count", "in_progress_count", "is_processing"]) {
      assert.ok(key in status, "the model-queue status lost " + key);
    }
    assert.deepEqual(censusWeightFiles(world.engine.modelsRoot), [], "the model tree must still be empty");
    proof("engine-manager-answers", true, "the seed pack answers in /customnode/installed; /manager/queue/status carries all four count keys");
  });

  test("D2: the git-url door is OPEN at the pinned flag (the refusal order proves it)", async () => {
    // THE REFUSAL ORDER IS THE PROBE: Manager's git_url route runs
    // is_dedicated_install_allowed BEFORE parsing the body, so an
    // empty body answers the door's own 400 when the door is open,
    // and the 403 flag refusal ({"error": "allow_git_url_install"})
    // when it is closed. Nothing is ever installed.
    const r = await fetch(world.engine.baseUrl + "/customnode/install/git_url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(30_000),
    });
    const text = await r.text();
    const open = r.status === 400 && text.includes("expected JSON object with a 'url' field");
    const closed = r.status === 403;
    proof("engine-git-url-door", open, open
      ? "400 (the door's own body-parse answer — the flag predicate passed; nothing installed)"
      : "status " + String(r.status) + (closed ? " — THE FLAG REFUSAL, verbatim: " + text : " — " + text));
    assert.equal(r.status, 400, "the git-url door is CLOSED (or its refusal order moved) — verbatim: " + text);
    assert.ok(text.includes("expected JSON object with a 'url' field"), "the door's 400 lost its body-parse voice: " + text);
    assert.deepEqual(censusWeightFiles(world.engine.modelsRoot), [], "the git-url probe must never land bytes");
  });

  test("D3: the model-queue door is OPEN at normal- (the whitelist 400 proves it, nothing enqueues)", async () => {
    // THE WHITELIST IS THE PROBE: at security_level=normal- the
    // route's 'middle' security predicate passes, so a row that is
    // in NO whitelist answers the route's own 400
    // ("Invalid model install request is detected") — never the 403
    // security word — and a non-whitelisted row enqueues nothing.
    const probe = {
      save_path: "vae",
      base: "melite",
      filename: "cold-start-door-probe.bin",
      url: "https://example.invalid/cold-start-door-probe.bin",
    };
    const r = await fetch(world.engine.baseUrl + "/manager/queue/install_model", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await r.text();
    const open = r.status === 400 && text.includes("Invalid model install request is detected");
    const closed = r.status === 403;
    proof("engine-model-queue-door", open, open
      ? "400 (the whitelist answer — the normal- security predicate passed; nothing enqueued)"
      : "status " + String(r.status) + (closed ? " — THE SECURITY REFUSAL, verbatim: " + text : " — " + text));
    assert.equal(r.status, 400, "the model-queue door is CLOSED (or its refusal order moved) — verbatim: " + text);
    assert.ok(text.includes("Invalid model install request is detected"), "the door's 400 lost its whitelist voice: " + text);
    assert.deepEqual(censusWeightFiles(world.engine.modelsRoot), [], "the queue probe must never enqueue bytes");
  });

  test("E: the load payload discloses every boarded weight honestly absent on the cold tree", async () => {
    const def = registry.defsSync().get("image-gen");
    assert.ok(def !== undefined, "the image-gen card is not in the primed registry");
    const boarded = [...def.boarded];
    assert.ok(boarded.includes("krea-2"), "image-gen lost the krea-2 boarding: " + boarded.join(", "));
    const bundle = loadCard(repoView, registry, modelsService(), "image-gen", scratchRoot) as {
      model_hints: Array<{ description: string; present: boolean }>;
      pack_hints: Array<{ id: string; present: boolean | null }>;
    };
    const hints = bundle.model_hints;
    assert.equal(hints.length, boarded.length,
      "the load bundle serves " + String(hints.length) + " hints for " + String(boarded.length) + " boarded families");
    const krea2 = hints.filter((h) => h.description === KREA2_DECL.description);
    assert.equal(krea2.length, 1, "the krea-2 hint is not identifiable by its DECL description");
    assert.equal(krea2[0]?.present, false, "the krea-2 hint claims PRESENT on a cold tree — the surface lies");
    const present = hints.filter((h) => h.present === true);
    assert.deepEqual(present, [], "hints claiming presence on a cold tree: " + JSON.stringify(present));
    // THE SERVED LINE (melite-load.ts spells it from the same hints):
    // the tool face prints exactly this sentence, so the count here
    // is the sentence the agent sees.
    const line = `weights: 0/${String(hints.length)} boarded checkpoints present on this machine (provisioning is the estate's business — compose the card)`;
    proof("estate-load-discloses-absent", true, line.replace("weights: ", "weights: ") + "; krea-2 hint present=false by its DECL description");
    assert.deepEqual(censusWeightFiles(world.engine.modelsRoot), [], "the load arm must never land bytes");
  });

  test("F: the acquire door PLANS the krea-2 rows — names, folders, sha256s, exact sizes, never a download", async () => {
    // THE ESTATE'S OWN DOOR: the declaration port the provisioning
    // composition wires (packages/web/melite-estate/src/
    // provisioning.ts) over the primed registry + booted models —
    // the same resolve the ProvisioningService.plan (the manage
    // plane's provision_model planning half) rides. No fetcher, no
    // manager, no writer: this service can only plan.
    const service = new ProvisioningService(new Context(), { declaration: declarationPort(estateCtx) });
    const plan: ProvisionPlan = await service.plan({ kind: "model", owner: "family", id: "krea-2" });
    assert.deepEqual(plan.ref, { kind: "model", owner: "family", id: "krea-2" });

    // THE DECL-DERIVED EXPECTATION (the depth law: the wall derives
    // the rows from the live DECL — provisions PLUS the first
    // declared variant's first cell artifact, the union law — and
    // judges the DOOR's derivation against it; a planner that drops
    // a row or a digest reds here).
    const variant = KREA2_DECL.variants[0];
    assert.ok(variant !== undefined, "the krea-2 DECL lost its variants");
    const cell = variant.cells[0];
    assert.ok(cell !== undefined, "the krea-2 DECL's first variant lost its cells");
    const artifact = cell.artifact;
    assert.ok(artifact !== undefined, "the krea-2 DECL's first cell lost its artifact");
    const expected = new Map<string, { folder: string; sha256: string; sizeBytes: number; url: string }>();
    for (const row of KREA2_DECL.provisions ?? []) {
      expected.set(row.name, { folder: row.folder, sha256: row.sha256, sizeBytes: row.size_bytes, url: row.url });
    }
    expected.set("krea2_turbo_int8_convrot.safetensors", {
      folder: artifact.dest_sub,
      sha256: artifact.sha256,
      sizeBytes: artifact.size_bytes,
      url: artifact.source_url,
    });

    const planned = new Map<string, (typeof plan.items)[number]>();
    for (const item of plan.items) {
      if (item.kind !== "model") continue;
      planned.set(item.name, item);
    }
    assert.deepEqual([...planned.keys()].sort(), [...expected.keys()].sort(),
      "the plan's row set diverges from the DECL: planned [" + [...planned.keys()].sort().join(", ") +
      "] vs declared [" + [...expected.keys()].sort().join(", ") + "]");
    const wrong: string[] = [];
    for (const [name, want] of expected) {
      const got = planned.get(name);
      if (got === undefined) continue;
      if (got.folder !== want.folder || got.sha256 !== want.sha256 || got.sizeBytes !== want.sizeBytes || got.url !== want.url) {
        wrong.push(name + " (folder " + got.folder + "/" + want.folder + ", sha " + got.sha256.slice(0, 12) + "/" + want.sha256.slice(0, 12) +
          ", bytes " + String(got.sizeBytes) + "/" + String(want.sizeBytes) + ")");
      }
    }
    assert.deepEqual(wrong, [], "plan rows diverge from the DECL: " + wrong.join("; "));

    // THE OPERATOR'S NAMED ROW (the tier's own anchor, independent of
    // the DECL): the smallest krea-2 row is the vae — 0.25GB at its
    // declared digest. If the DECL's truth drifts, THIS literal reds.
    const vae = planned.get("qwen_image_vae.safetensors");
    assert.ok(vae !== undefined, "the plan lost the qwen_image_vae row");
    assert.equal(vae.folder, "vae");
    assert.equal(vae.sha256, "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f");
    assert.equal(vae.sizeBytes, 253806246);
    const smallest = [...planned.values()].reduce((a, b) => (b.sizeBytes < a.sizeBytes ? b : a));
    assert.equal(smallest.name, "qwen_image_vae.safetensors", "the smallest planned row moved: " + smallest.name);
    const unet = planned.get("krea2_turbo_int8_convrot.safetensors");
    assert.ok(unet !== undefined, "the plan lost the turbo unet row");
    assert.equal(unet.variant, variant.id, "the unet row lost its variant coordinate");
    assert.equal(unet.quant, cell.quant, "the unet row lost its quant coordinate");

    // NEVER A DOWNLOAD: the plan is the preparation — the census is
    // the receipt.
    assert.deepEqual(censusWeightFiles(world.engine.modelsRoot), [], "the plan arm must never land bytes");
    proof("estate-plan-krea-2", true,
      [...planned.values()].map((i) => i.name + " → " + i.folder + " " + String(i.sizeBytes) + "B sha256=" + i.sha256.slice(0, 16)).join(" | "));
  });

  test("G: the user-lora journey — upload through the manage door, land + seat, the card's lora mod slot offers it, the composed graph wires it", async () => {
    // THE JOURNEY LAW (dev_docs/THE_JOURNEY_LAW.md): every hop rides
    // a real door — never a function call into userLoras.ts.
    //   UPLOAD  comfy_manage `lora_install` (the manage plane's bytes
    //           arm, the uploads rail's data-URL spelling) through the
    //           estate's own manage seat (manageRegistry.act — the
    //           /v1/manage lane the comfy_manage tool serves), with
    //           the endpoint config stating the managed posture over
    //           the scratch engine
    //   LAND    <loras>/krea-2/<file> under the scratch engine's own
    //           models tree, byte-identical, plus the seated row in
    //           the user rows file (row_seated true, no refusal)
    //   SLOT    `lora_list` (the manage door's fact+rows answer) +
    //           cardModFields (the absorbed lanes) + modCatalog (the
    //           family loras lane — the picker rows the discovery
    //           door serves as entry.options)
    //   WIRE    the primed card def's compose — the card's own krea-2
    //           binding of its declared t2i action over the card-kit
    //           GraphBuilder (coldstart.spec.ts's bake arm owns the
    //           same seam) — with the pick resolved through the
    //           service's modCatalogForCompose read, the compose
    //           door's own catalog walk
    // THE COMPOSE DEBT: the full compose door (svc.compose) is out of
    // reach in the scratch tier by construction — its wiring wall
    // judges every wired combo value against the live /object_info
    // doc (wiringWall.ts judgeValue), and the cold world never holds
    // weights, so unet_name/clip_name/vae_name are empty enums and
    // ANY composed graph refuses bad-value. The graph hop composes
    // against the family action instead; the wall's LoraLoader walk
    // stays the run tier's (weights-holding) debt.
    const rowsSaved = process.env.MELITE_USER_LORAS;
    const shelfSaved = process.env.MELITE_COMFYUI_LORAS_DIR;
    const endpointSavedInArm = process.env.COMFYUI_ENDPOINT_CONFIG;
    const rowsPath = join(scratchRoot, "user-loras.json");
    const shelfDir = join(world.engine.modelsRoot, "loras");
    // THE SCRATCH SEATS: userLorasPath()/resolveEngineLorasDir() read
    // these envs per call (never captured), so the doors land into
    // the scratch tree — the operator-state firewall's values come
    // back in the finally.
    process.env.MELITE_USER_LORAS = rowsPath;
    process.env.MELITE_COMFYUI_LORAS_DIR = shelfDir;
    const managedPath = join(scratchRoot, "endpoint-managed.json");
    writeFileSync(managedPath, JSON.stringify({
      url: world.engine.baseUrl,
      provision: "managed",
      model_base_path: world.engine.modelsRoot,
    }) + "\n");
    process.env.COMFYUI_ENDPOINT_CONFIG = managedPath;
    try {
      // THE MANAGE SEAT (manage-registry.spec.ts's own boot shape):
      // timer + queue stubbed structurally, the provider row mounts,
      // act() is the tools' /v1/manage lane.
      const manageCtx = new Context();
      (manageCtx as unknown as { timeout: unknown }).timeout = (cb: () => void): (() => void) => {
        cb();
        return () => {};
      };
      (manageCtx as unknown as { queue: unknown }).queue = { stateRoot: scratchRoot, stateRoots: [] as string[] };
      manageProvider.apply(manageCtx);
      const manage = (manageCtx as unknown as { manage: ManageGatewayService }).manage;

      // THE UPLOAD: a tiny safetensors-SHAPED buffer (8-byte LE u64
      // header length + JSON header + tensor region) — the install
      // judges extension and row shape, never weight bytes.
      const header = Buffer.from(JSON.stringify({ __metadata__: { format: "coldstart-proof" } }), "utf8");
      const loraBytes = Buffer.concat([
        Buffer.from([header.length & 0xff, (header.length >>> 8) & 0xff, 0, 0, 0, 0, 0, 0]),
        header,
        Buffer.alloc(64),
      ]);
      const FILE = "coldstart_user_lora.safetensors";
      const COMBO_NAME = "krea-2/" + FILE;
      const envelope = await manage.act({
        action: "lora_install",
        filename: FILE,
        data: "data:application/octet-stream;base64," + loraBytes.toString("base64"),
        families: ["krea-2"],
      }, new AbortController().signal);
      assert.equal(envelope.ok, true, "the upload door refused: " + envelope.detail);
      const landed = envelope.data as {
        filename: string; bytes: number; in_combo_now: boolean; row_seated: boolean;
        row_refusal?: string; serves_now: boolean; restart_required: boolean;
        row: { id: string; filename: string; families: string[] };
      };
      assert.equal(landed.filename, COMBO_NAME, "the door answered a different combo name: " + landed.filename);
      assert.equal(landed.bytes, loraBytes.length, "the door answered a different byte count");
      assert.equal(landed.row_seated, true,
        "the upload did not seat its row: " + (landed.row_refusal ?? "(no refusal voiced)"));
      assert.equal(landed.restart_required, false, "a weight landing must never demand a restart");
      assert.equal(landed.serves_now, true, "the door says the seated row does not serve now");
      assert.deepEqual(landed.row.families, ["krea-2"], "the seated row lost its family");
      assert.equal(landed.in_combo_now, true,
        "the engine's own combo read does not list the landed file (its listing is mtime-live — no restart needed)");

      // LAND: the bytes under the scratch engine's loras tree, the
      // row in the rows file, and the world's weight census is
      // exactly the landed lora (never a download — the upload is
      // the only bytes this world has ever held).
      const landedPath = join(shelfDir, "krea-2", FILE);
      assert.ok(readFileSync(landedPath).equals(loraBytes), "the landed bytes are not the uploaded bytes");
      assert.deepEqual(readdirSync(join(shelfDir, "krea-2")), [FILE], "the family dir holds more than the landed file (a part corpse?)");
      const rowsFile = JSON.parse(readFileSync(rowsPath, "utf8")) as {
        rows: Array<{ id: string; filename: string; families: string[] }>;
      };
      const seatedRow = rowsFile.rows.find((r) => r.filename === COMBO_NAME);
      assert.ok(seatedRow !== undefined, "the rows file does not hold the seated row: " + JSON.stringify(rowsFile));
      assert.equal(seatedRow.id, COMBO_NAME, "the seated row lost the bag id");
      assert.deepEqual(seatedRow.families, ["krea-2"], "the rows-file row lost its family");
      assert.deepEqual(censusWeightFiles(world.engine.modelsRoot), [landedPath], "the world's weight census is not exactly the uploaded lora");

      // SLOT: the manage door's fact+rows answer, the card's absorbed
      // loras lanes, and the family loras lane's picker rows — the
      // seated filename is OFFERED for the family the row declares.
      const list = await manage.act({ action: "lora_list" }, new AbortController().signal);
      assert.equal(list.ok, true, "lora_list refused: " + list.detail);
      const listData = list.data as {
        engine_loras: string[];
        user_rows: Array<{ id: string; filename: string; families: string[] }>;
        unboarded: string[];
      };
      assert.ok(listData.engine_loras.includes(COMBO_NAME), "lora_list lost the engine's own fact");
      const offered = listData.user_rows.find((r) => r.filename === COMBO_NAME);
      assert.ok(offered !== undefined, "lora_list does not offer the seated row");
      assert.deepEqual(offered.families, ["krea-2"], "the offered row lost its family");
      assert.deepEqual(listData.unboarded, [], "the seated row reads unboarded (the engine lacks its file)");
      const svc = theService();
      const lanes = svc.cardModFields("image-gen").find((lane) => lane.pack === "loras");
      assert.ok(lanes !== undefined, "the image-gen card absorbed no loras lanes");
      assert.ok(lanes.families.includes("krea-2"), "the loras lanes are not scoped to krea-2: " + lanes.families.join(", "));
      const picker = svc.modCatalog("loras", "krea-2");
      const pickRow = picker.rows.find((r) => r.id === COMBO_NAME);
      assert.ok(pickRow !== undefined, "the family loras lane does not offer the seated row");
      assert.equal(pickRow.filename, COMBO_NAME, "the offered row's filename is not the engine's combo name");
      assert.ok(picker.rows.some((r) => r.id === "krea2_realism_lora"), "the user row's landing displaced the declared krea-2 board");

      // WIRE: the compose door's own catalog walk resolves the pick,
      // the card's compose builds the krea-2 t2i graph over the kit
      // builder, and the seated filename is the LoraLoaderModelOnly
      // row on the sampler's model chain.
      const def = registry.defsSync().get("image-gen");
      assert.ok(def !== undefined, "the image-gen def is not primed");
      const model = registry.modelFacts()["krea-2"];
      assert.ok(model !== undefined, "the krea-2 facts row is missing");
      assert.ok((model.mods ?? []).includes("loras"), "the facts row does not board the loras pack — the firing gate would refuse");
      const cat = svc.modCatalogForCompose("loras", "krea-2", "krea-2", def.boarded);
      const resolved = cat.rows.find((r) => r.id === COMBO_NAME);
      assert.ok(resolved !== undefined, "the compose catalog does not resolve the seated id");
      const g = new GraphBuilder();
      def.compose({
        prompt: "the cold-start proof: the user's uploaded lora, wired",
        width: 512,
        height: 512,
        seed: 7,
        steps: 8,
        cfg: 1,
        sampler: "euler",
        scheduler: "normal",
        loras: [{ name: resolved.filename, strength: resolved.default_strength ?? 1 }],
      }, model, g, "coldstart-proof-g");
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const loraRows = Object.entries(graph).filter(([, n]) => n.class_type === "LoraLoaderModelOnly");
      assert.equal(loraRows.length, 1, "the composed graph carries " + String(loraRows.length) + " LoraLoaderModelOnly rows");
      const first = loraRows[0];
      assert.ok(first !== undefined, "the composed graph lost its lora row");
      const [loraId, loraNode] = first;
      assert.equal(loraNode.inputs["lora_name"], COMBO_NAME, "the wired lora_name is not the seated filename");
      assert.equal(loraNode.inputs["strength_model"], resolved.default_strength ?? 1, "the wired strength is not the seated row's default");
      // THE CHAIN: the KSampler's model input reaches the UNETLoader
      // THROUGH the lora node — wired into the graph, never floating.
      const sampler = Object.entries(graph).find(([, n]) => n.class_type === "KSampler");
      assert.ok(sampler !== undefined, "the composed graph lost its KSampler");
      const loader = Object.keys(graph).find((id) => graph[id]?.class_type === "UNETLoader");
      assert.ok(loader !== undefined, "the composed graph lost its UNETLoader");
      const visited = new Set<string>();
      let cur: unknown = sampler[1].inputs["model"];
      let wired = false;
      let last = "";
      while (Array.isArray(cur)) {
        const nodeId = cur[0] as string;
        if (visited.has(nodeId)) break;
        visited.add(nodeId);
        last = nodeId;
        if (nodeId === loraId) wired = true;
        cur = graph[nodeId]?.inputs["model"];
      }
      assert.equal(last, loader, "the sampler's model chain does not terminate at the unet loader (ends at " + last + ")");
      assert.equal(wired, true, "the lora node is not on the sampler's model chain");
      proof("estate-user-lora-journey", true,
        COMBO_NAME + " uploaded → seated → offered → wired (" + sampler[0] + " → " + loraId + " → " + loader + ")");
    } finally {
      if (rowsSaved === undefined) delete process.env.MELITE_USER_LORAS;
      else process.env.MELITE_USER_LORAS = rowsSaved;
      if (shelfSaved === undefined) delete process.env.MELITE_COMFYUI_LORAS_DIR;
      else process.env.MELITE_COMFYUI_LORAS_DIR = shelfSaved;
      if (endpointSavedInArm === undefined) delete process.env.COMFYUI_ENDPOINT_CONFIG;
      else process.env.COMFYUI_ENDPOINT_CONFIG = endpointSavedInArm;
    }
  });
});
