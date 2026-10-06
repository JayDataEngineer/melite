// lora-section.spec.tsx — THE LORA BLOCK'S OWN WALLS: the block
// speaks exactly the manage plane's four verbs (lora_list,
// lora_install by path, lora_install by bytes, restart), asks for
// NOTHING on mount (the mount law), and renders the two honest
// boundaries the operator ordered: the engine's own combo (what
// /prompt will accept) and the user's own rows (with the unboarded
// and refused rows named, not discovered at run time).
//
// The transport is never under test: the manage lane is seated
// through the same seatManageNamespace seam the deck's apply uses,
// and the one refusal arm that is reachable — a block rendered
// before the manage contribution mounts — is pinned by its loud
// message, the panel's documented failure face.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import LoraBlock from "../../src/client/lora-section";
import { seatManageNamespace } from "../../src/client/assets-tab";
import type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from "@melite/estate-manage/types";
import type { RemoteResult } from "@deepseek-ai/dsh-typert-protocol";

interface Canned {
  data?: ManageJsonValue;
  detail?: string;
}

/** The list payload the real door serves (managePlane's lora_list:
 * engine combo, the user's parsed rows + problems, the unboarded
 * diff, the install dir). */
const LORA_LIST: Canned = {
  data: {
    engine_loras: ["flux-dev.safetensors", "z-image-turbo.safetensors"],
    user_rows: [{
      id: "u1",
      filename: "my-lora.safetensors",
      label: "My LoRA",
      families: ["z-image"],
      default_strength: 0.8,
    }],
    user_rows_path: "/x/user_loras.json",
    user_rows_present: true,
    user_row_problems: ["row u9: missing filename"],
    unboarded: ["ghost-lora.safetensors"],
    install_dir: "/x/loras",
  },
};

/** Seat ONE fake manage lane routing canned fixtures by action; every
 * act call is recorded verbatim so the assertions read the WIRE SHAPE
 * (the action + the payload fields), not a transport detail. */
function stubManageSeat(routes: Record<string, Canned | undefined>): Array<Record<string, unknown>> {
  const calls: Array<Record<string, unknown>> = [];
  seatManageNamespace({
    act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
      calls.push({ ...doc });
      const canned = routes[doc.action];
      if (canned === undefined) {
        return { ok: true, value: { action: doc.action, ok: true, detail: `unstubbed action ${doc.action}` } };
      }
      return { ok: true, value: { action: doc.action, ok: true, detail: canned.detail ?? `canned ${doc.action}`, data: canned.data } };
    },
  });
  return calls;
}

const actionsOf = (calls: Array<Record<string, unknown>>): string[] =>
  calls.map((call) => String(call["action"]));

/** Seat ONE fake binary fetch for the lora door (/v1/uploads/lora):
 *  every call is recorded verbatim (url + method + headers + the body
 *  object itself) so the assertions read the WIRE SHAPE — the File
 *  streams through as octet-stream, never a base64 data URL. */
interface FetchCall { url: string; init: RequestInit }
function stubLoraFetch(reply: { ok: boolean; status: number; error?: string } = { ok: true, status: 200 }): Array<FetchCall> {
  const calls: Array<FetchCall> = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init: init ?? {} });
    return {
      ok: reply.ok,
      status: reply.status,
      json: async () => ({ error: reply.error ?? "" }),
    } as unknown as Response;
  });
  return calls;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  seatManageNamespace(undefined);
});

test("THE MOUNT LAW: closed on render, asks for nothing until opened", () => {
  const calls = stubManageSeat({});
  render(<LoraBlock />);

  expect(screen.getByTestId("manage-loras")).toBeTruthy();
  expect(screen.getByText("Show LoRAs")).toBeTruthy();
  // the closed hint teaches the restart boundary before any fetch
  expect(screen.getByText(/Add a LoRA you already have:/)).toBeTruthy();
  expect(calls).toEqual([]);
});

test("opening the block posts lora_list once and renders both boundaries", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST });
  render(<LoraBlock />);

  fireEvent.click(screen.getByText("Show LoRAs"));

  // the engine's own combo — what /prompt accepts
  expect(await screen.findByText(/The engine accepts 2 LoRA name/)).toBeTruthy();
  expect(screen.getByText("install dir: /x/loras")).toBeTruthy();
  // the user's rows, with the unboarded and refused rows named
  expect(screen.getByText(/1 of your row\(s\) are not in the engine list yet/)).toBeTruthy();
  expect(screen.getByText("· ghost-lora.safetensors")).toBeTruthy();
  expect(screen.getByText("your rows: 1 — /x/user_loras.json")).toBeTruthy();
  // exact textContent match: RTL's default normalizer would collapse
  // the row's deliberate double-space separators
  expect(
    screen.getByText((_, el) => el?.textContent === "· My LoRA  (my-lora.safetensors)  @0.8  [z-image]"),
  ).toBeTruthy();
  expect(screen.getByText("refused row — row u9: missing filename")).toBeTruthy();
  expect(actionsOf(calls)).toEqual(["lora_list"]);
});

test("Refresh posts lora_list again — the sequence is a law, not a accident", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST });
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  fireEvent.click(screen.getByText("Refresh"));

  await waitFor(() => {
    expect(actionsOf(calls)).toEqual(["lora_list", "lora_list"]);
  });
});

test("Copy LoRA in posts lora_install with the parsed path + families, then refreshes", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST, lora_install: {} });
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  const button = screen.getByText("Copy LoRA in") as HTMLButtonElement;
  expect(button.disabled).toBe(true); // an empty path never posts

  const pathInput = screen.getByTestId("manage-loras").querySelector("input[placeholder='/abs/path/to/my_lora.safetensors']") as HTMLInputElement;
  fireEvent.change(pathInput, { target: { value: "/abs/my.safetensors" } });
  const familiesInput = screen.getByTestId("manage-loras").querySelector("input[placeholder='families (comma)']") as HTMLInputElement;
  fireEvent.change(familiesInput, { target: { value: "z-image, flux" } });
  expect(button.disabled).toBe(false);

  fireEvent.click(button);

  await waitFor(() => {
    expect(actionsOf(calls)).toEqual(["lora_list", "lora_install", "lora_list"]);
  });
  const install = calls.find((call) => call["action"] === "lora_install") as Record<string, ManageJsonValue>;
  expect(install["path"]).toBe("/abs/my.safetensors");
  // the comma list is parsed: trimmed, empties dropped
  expect(install["families"]).toEqual(["z-image", "flux"]);
});

test("THE BINARY DOOR (2026-10-17): the upload streams the File as octet-stream — no base64, no manage act", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST });
  const uploads = stubLoraFetch();
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  const fileInput = screen.getByTestId("manage-loras").querySelector("input[type='file']") as HTMLInputElement;
  const file = new File(["bytes"], "downloaded.safetensors", { type: "application/octet-stream" });
  fireEvent.change(fileInput, { target: { files: [file] } });

  await waitFor(() => { expect(uploads.length).toBe(1); });
  const { url, init } = uploads[0]!;
  // the name and the families ride the query; the door reads the
  // declared length from the transport, never from a JSON body
  expect(url).toBe("/v1/uploads/lora?filename=downloaded.safetensors&families=z-image");
  expect(init.method).toBe("POST");
  expect(String((init.headers as Record<string, string>)["content-type"])).toBe("application/octet-stream");
  // THE TRANSPORT CURE: the body IS the File — a 200MB LoRA costs
  // 200MB, never a ~267MB base64 string inside a manage act
  expect(init.body).toBe(file);
  // no install verb rode the manage lane; only the refresh did
  expect(actionsOf(calls)).toEqual(["lora_list", "lora_list"]);
});

test("Restart engine posts restart, then refreshes the list", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST, restart: {} });
  render(<LoraBlock />);
  fireEvent.click(screen.getByText("Show LoRAs"));
  await screen.findByText(/The engine accepts 2 LoRA name/);

  fireEvent.click(screen.getByText("Restart engine"));

  await waitFor(() => {
    expect(actionsOf(calls)).toEqual(["lora_list", "restart", "lora_list"]);
  });
});

test("a block rendered before the manage contribution mounts refuses loud", async () => {
  seatManageNamespace(undefined); // the loud-refusal arm: no lane seated
  render(<LoraBlock />);

  fireEvent.click(screen.getByText("Show LoRAs"));

  expect(await screen.findByText(/manage remote not mounted — the manage contribution must mount before any call/)).toBeTruthy();
  // and no list state was minted from the failure
  expect(screen.getByText(/The engine accepts 0 LoRA name/)).toBeTruthy();
});

// ── the shape arms (the block renders whatever the door answers) ──
// Every branch below is a DIFFERENT ANSWER from the manage door: a
// row with no label, no strength and no families; a door that fails;
// an install refused; a restart refused. The block's job is to say
// what is true about each, never to throw or to render a blank.

/** Open the block and let its one lora_list land. */
const open = async (): Promise<void> => {
  fireEvent.click(screen.getByText("Show LoRAs"))
  await waitFor(() => { expect(screen.queryByText("Show LoRAs")).toBeNull() })
}

/** A lane whose named action comes back REFUSED: the protocol's one
 *  failure face is { ok: false, detail } carrying the message
 *  (assets-tab.tsx:346-359), NOT a thrown error. */
const failingSeat = (action: string, message: string): void => {
  seatManageNamespace({
    act: async (doc: ManageActDoc): Promise<RemoteResult<ManageEnvelopeRow>> => {
      if (doc.action === action) {
        return {
          ok: false,
          error: { message, details: { action: doc.action, code: "manage/refused" } },
        } as unknown as RemoteResult<ManageEnvelopeRow>
      }
      return { ok: true, value: { action: doc.action, ok: true, detail: `canned ${doc.action}` } }
    },
  })
}

test("a user row with NO label, NO strength and NO families renders from its id", async () => {
  const calls = stubManageSeat({
    lora_list: {
      data: {
        engine_loras: [],
        user_rows: [{ id: "bare-row", filename: "bare.safetensors" }],
        user_rows_present: true,
        unboarded: [],
        install_dir: "/x/loras",
      },
    },
  })
  render(<LoraBlock />)
  await open()
  // exact textContent: the row's deliberate double-space separators
  // are part of the contract, and the absent fields must leave no
  // empty "@" or "[]" residue
  const line = await screen.findByText(
    (_, el) => el?.textContent === "\u00b7 bare-row  (bare.safetensors)",
  )
  expect(line.textContent).not.toContain("@")
  expect(line.textContent).not.toContain("[]")
  expect(actionsOf(calls)).toEqual(["lora_list"])
})

test("a door that FAILS the list speaks the refusal (never a blank panel)", async () => {
  failingSeat("lora_list", "engine unreachable")
  render(<LoraBlock />)
  await open()
  await waitFor(() => { expect(screen.getByText("engine unreachable")).toBeTruthy() })
})

test("an install the door refuses speaks the refusal and keeps the typed path", async () => {
  // the failing lane replaces the recording one, so this arm asserts
  // what the operator sees (the refusal and the surviving field),
  // not a call log
  failingSeat("lora_install", "no such file")
  render(<LoraBlock />)
  await open()
  const input = screen.getByPlaceholderText("/abs/path/to/my_lora.safetensors")
  fireEvent.change(input, { target: { value: "/nope/missing.safetensors" } })
  fireEvent.click(screen.getByText("Copy LoRA in"))
  await waitFor(() => { expect(screen.getByText("no such file")).toBeTruthy() })
  // the path survives the refusal — the operator corrects the field,
  // they do not retype it
  expect((input as HTMLInputElement).value).toBe("/nope/missing.safetensors")
})

test("a restart the door refuses speaks the refusal (the button never lies)", async () => {
  failingSeat("restart", "restart refused by the manager")
  render(<LoraBlock />)
  await open()
  fireEvent.click(screen.getByText("Restart engine"))
  await waitFor(() => { expect(screen.getByText("restart refused by the manager")).toBeTruthy() })
})

test("a file input cleared before a file is chosen asks for nothing", async () => {
  // the change event with no file is real (a dialog cancelled, a
  // selection cleared): the door must not post an install for nothing
  const calls = stubManageSeat({ lora_list: LORA_LIST })
  render(<LoraBlock />)
  await open()
  const picker = document.querySelector("input[type=file]") as HTMLInputElement
  fireEvent.change(picker, { target: { files: [] } })
  expect(actionsOf(calls)).toEqual(["lora_list"])
})

test("every door refuses loud when the manage lane is NOT mounted", async () => {
  // the block's documented failure face: mounted before the manage
  // contribution, each verb must speak rather than hang on a missing
  // lane — the list, the install, the upload and the restart.
  render(<LoraBlock />)
  seatManageNamespace(undefined)
  fireEvent.click(screen.getByText("Show LoRAs"))
  await waitFor(() => { expect(screen.getByText(/manage remote not mounted/)).toBeTruthy() })

  const input = screen.getByPlaceholderText("/abs/path/to/my_lora.safetensors")
  fireEvent.change(input, { target: { value: "/x/y.safetensors" } })
  fireEvent.click(screen.getByText("Copy LoRA in"))
  await waitFor(() => { expect(screen.getByText(/manage remote not mounted/)).toBeTruthy() })

  fireEvent.click(screen.getByText("Restart engine"))
  await waitFor(() => { expect(screen.getByText(/manage remote not mounted/)).toBeTruthy() })
})


// ── the thrown-verb arms ──
// postManage raises Error values ONLY (assets-tab.tsx:326-368): a
// lane that throws anything else is folded into {ok: false, detail}
// before it leaves the door, and the one rethrow is the lane's
// AbortError. thrownVoice reads that fact off the one seam.

test("a lane that throws a NON-Error is folded into a refusal, never a throw", async () => {
  // The proof the block's four catches rest on: the hostile value
  // arrives as postManage's transport REFUSAL (its own String(e)
  // detail), so it lands in the `reply.ok !== true` arm and not in a
  // catch — which is why thrownVoice can read e.message.
  seatManageNamespace({
    act: async (): Promise<RemoteResult<ManageEnvelopeRow>> => { throw "kablam" },
  })
  render(<LoraBlock />)
  fireEvent.click(screen.getByText("Show LoRAs"))
  await waitFor(() => { expect(screen.getByText("kablam")).toBeTruthy() })
})

test("the UPLOAD verb's catch speaks — a file chosen with no lane seated", async () => {
  // uploadChosen's catch was never driven: the no-lane path reaches it
  // through the refresh that follows the upload (the manage lane is
  // the missing seat; the binary fetch itself carries no lane).
  stubLoraFetch()
  render(<LoraBlock />)
  seatManageNamespace(undefined)
  const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
  const file = new File(["bytes"], "downloaded.safetensors", { type: "application/octet-stream" })
  fireEvent.change(fileInput, { target: { files: [file] } })

  await waitFor(() => {
    expect(screen.getByText(/manage remote not mounted/)).toBeTruthy()
  })
})

test("the door's own refusal speaks — a non-2xx upload answers its error body", async () => {
  // THE CURE'S REFUSAL ARM: the base64 read is gone (no FileReader
  // anywhere in the flow), so the catch's driver is the door itself —
  // a 413 answer speaks its error text, and no refresh rides a
  // failed install.
  stubManageSeat({ lora_list: LORA_LIST })
  stubLoraFetch({ ok: false, status: 413, error: "the LoRA is over the 512MB door cap" })
  render(<LoraBlock />)
  await open()
  const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
  const file = new File(["bytes"], "downloaded.safetensors", { type: "application/octet-stream" })
  fireEvent.change(fileInput, { target: { files: [file] } })
  await waitFor(() => { expect(screen.getByText(/over the 512MB door cap/)).toBeTruthy() })
})

test("a transport that throws mid-upload speaks too (the network died)", async () => {
  const calls = stubManageSeat({ lora_list: LORA_LIST })
  vi.stubGlobal("fetch", async (): Promise<Response> => { throw new Error("network went away") })
  render(<LoraBlock />)
  await open()
  const fileInput = document.querySelector("input[type=file]") as HTMLInputElement
  const file = new File(["bytes"], "downloaded.safetensors", { type: "application/octet-stream" })
  fireEvent.change(fileInput, { target: { files: [file] } })
  await waitFor(() => { expect(screen.getByText("network went away")).toBeTruthy() })
  // the upload died before any refresh verb was posted
  expect(actionsOf(calls)).toEqual(["lora_list"])
})
