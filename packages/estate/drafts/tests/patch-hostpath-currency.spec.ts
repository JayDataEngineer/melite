// @contract estate-drafts-hostpath-currency
//
// THE HOST-PATH CURRENCY WALL (minor-a, 2026-11-12): an author
// pasting a HOST-ABSOLUTE media path ("/home/…/foo.png") into a
// params slot used to leave a row no reader could serve — the
// compose door wants uploads-door currency, the drilled-out card's
// preview (estateInputUrl, @melite/web-kit-formats) maps ONLY
// data/input/<name> to /v1/assets/inputs/<name>. The patch seam
// buys the currency at write time: copy the host file into the
// estate's data/input tree, rewrite the value. Five arms, each
// with its own firing path:
//
//   ARM 1 — THE BUY: a convertible host path lands as
//     data/input/<name> in the stored row AND the bytes land on
//     disk under the uploads root (MELITE_REPO_ROOT seam).
//   ARM 2 — ITEM-WISE: string arrays convert per item; an
//     already-currency item rides untouched.
//   ARM 3 — VERBATIM: a missing file, a non-media extension, and
//     a relative path all ride VERBATIM (the compose door's own
//     refusal owns that voice — the patch seam never invents one).
//   ARM 4 — ONE NAME = ONE FILE: a taken name with different
//     bytes takes a hash-suffixed seat; identical bytes reuse the
//     seat (no duplicate write path).
//   ARM 5 — THE PREVIEW GRAMMAR (depth): every converted value a
//     patch can store sits in the exact grammar the preview door
//     serves (estateInputUrl's frozen pattern) — the stored row is
//     previewable the same breath it is composable.
import { describe, expect, test } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ensureBench } from "../src/bench.ts";
import { DraftsRemoteService } from "../src/remote.ts";
import { bootCtx, mintRoot, sig } from "./bench-helpers.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

const MAIN = draftIdOf("bench-main");

// estateInputUrl's frozen servable grammar (the preview door's own
// pattern, @melite/web-kit-formats uploadToEstate.ts — cited, not
// imported: the wall pins the cross-plane contract, the web-kit
// suite pins its side).
const PREVIEWABLE = /^data\/input\/([A-Za-z0-9_-]+\.(?:png|jpe?g|webp))$/i;

/** Boot the remote over the temp stack with MELITE_REPO_ROOT pinned
 *  to a minted root (the currency tree lands inside it). */
async function boot(): Promise<{ svc: DraftsRemoteService; root: string }> {
  const root = mintRoot();
  process.env["MELITE_REPO_ROOT"] = root;
  const { ctx, domain } = await bootCtx();
  const svc = new DraftsRemoteService(ctx);
  await ensureBench(domain, { session: "main", stages: [{ id: "s_0" }] });
  return { svc, root };
}

/** The stored params of the one stage after a patch ride. */
async function paramsOf(svc: DraftsRemoteService): Promise<Record<string, unknown>> {
  const doc = await svc.get(MAIN, sig);
  const stage = (doc["stages"] as Array<Record<string, unknown>>).find((s) => s["id"] === "s_0")!;
  return stage["params"] as Record<string, unknown>;
}

describe("the drafts/patch door: the host-path currency arm", () => {
  test("ARM 1 — a convertible host path is BOUGHT into uploads currency (row + bytes)", async () => {
    const { svc, root } = await boot();
    try {
      const src = join(root, "src", "hero.png");
      mkdirSync(join(root, "src"), { recursive: true });
      writeFileSync(src, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]));
      await svc.patch(MAIN, "s_0", { params: { source: src } }, 0, sig);
      const params = await paramsOf(svc);
      expect(params["source"]).toBe("data/input/hero.png");
      const landed = join(root, "data", "input", "hero.png");
      expect(existsSync(landed)).toBe(true);
      expect(readFileSync(landed).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]))).toBe(true);
    } finally {
      delete process.env["MELITE_REPO_ROOT"];
    }
  });

  test("ARM 2 — string arrays convert ITEM-WISE; currency items ride untouched", async () => {
    const { svc, root } = await boot();
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      writeFileSync(join(root, "src", "a.png"), Buffer.from("aaa"));
      await svc.patch(
        MAIN,
        "s_0",
        { params: { input_images: [join(root, "src", "a.png"), "data/input/kept.png"] } },
        0,
        sig,
      );
      const params = await paramsOf(svc);
      expect(params["input_images"]).toEqual(["data/input/a.png", "data/input/kept.png"]);
      expect(existsSync(join(root, "data", "input", "a.png"))).toBe(true);
      // the untouched currency item never re-bought (no byte move)
      expect(existsSync(join(root, "data", "input", "kept.png"))).toBe(false);
    } finally {
      delete process.env["MELITE_REPO_ROOT"];
    }
  });

  test("ARM 3 — missing file / non-media / relative ride VERBATIM (no invented refusal)", async () => {
    const { svc, root } = await boot();
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      writeFileSync(join(root, "src", "notes.txt"), Buffer.from("text"));
      await svc.patch(
        MAIN,
        "s_0",
        {
          params: {
            missing: join(root, "src", "nope.png"),
            not_media: join(root, "src", "notes.txt"),
            relative: "foo.png",
            object: { nested: join(root, "src", "nope.png") },
          },
        },
        0,
        sig,
      );
      const params = await paramsOf(svc);
      expect(params["missing"]).toBe(join(root, "src", "nope.png"));
      expect(params["not_media"]).toBe(join(root, "src", "notes.txt"));
      expect(params["relative"]).toBe("foo.png");
      expect(params["object"]).toEqual({ nested: join(root, "src", "nope.png") });
      expect(existsSync(join(root, "data", "input"))).toBe(false);
    } finally {
      delete process.env["MELITE_REPO_ROOT"];
    }
  });

  test("ARM 4 — ONE NAME = ONE FILE: different bytes take a hash seat, identical bytes reuse", async () => {
    const { svc, root } = await boot();
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      const first = join(root, "src", "same.png");
      writeFileSync(first, Buffer.from("first"));
      const second = join(root, "src2", "same.png");
      mkdirSync(join(root, "src2"), { recursive: true });
      writeFileSync(second, Buffer.from("second"));
      await svc.patch(MAIN, "s_0", { params: { a: first } }, 0, sig);
      await svc.patch(MAIN, "s_0", { params: { b: second } }, 1, sig);
      await svc.patch(MAIN, "s_0", { params: { c: first } }, 2, sig);
      const params = await paramsOf(svc);
      expect(params["a"]).toBe("data/input/same.png");
      expect(params["b"]).toMatch(/^data\/input\/same-[0-9a-f]{8}\.png$/);
      expect(params["b"]).not.toBe(params["a"]);
      // identical bytes reuse the FIRST seat (no third file)
      expect(params["c"]).toBe("data/input/same.png");
      const inputDir = join(root, "data", "input");
      const { readdirSync } = await import("node:fs");
      const seated = readdirSync(inputDir).filter((n) => n.startsWith("same"));
      expect(seated.length).toBe(2); // the original seat + one hash seat
    } finally {
      delete process.env["MELITE_REPO_ROOT"];
    }
  });

  test("ARM 5 — every converted value sits in the PREVIEW door's servable grammar", async () => {
    const { svc, root } = await boot();
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      for (const [i, ext] of ["png", "jpg", "jpeg", "webp"].entries()) {
        writeFileSync(join(root, "src", `shot${i}.${ext}`), Buffer.from(`bytes-${i}`));
      }
      await svc.patch(
        MAIN,
        "s_0",
        {
          params: {
            a: join(root, "src", "shot0.png"),
            b: join(root, "src", "shot1.jpg"),
            c: join(root, "src", "shot2.jpeg"),
            d: join(root, "src", "shot3.webp"),
          },
        },
        0,
        sig,
      );
      const params = await paramsOf(svc);
      for (const v of Object.values(params)) {
        expect(v).toMatch(PREVIEWABLE);
      }
      // and the mapped URL is the one the input preview door serves
      expect(PREVIEWABLE.exec(String(params["a"]))![1]).toBe("shot0.png");
    } finally {
      delete process.env["MELITE_REPO_ROOT"];
    }
  });
});
