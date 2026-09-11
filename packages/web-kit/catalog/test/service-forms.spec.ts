// service-forms.spec.ts — the form-tag vocabulary client: the load
// cache + inflight collapse, the listener fan-out, the sidebar-key
// primitive, and the rail-ordered sidebar builder.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  formForSidebarKey,
  formSidebarItems,
  getCachedForms,
  isAudioForm,
  isEditForm,
  isGenerateForm,
  isMusicForm,
  isTtsForm,
  isVoiceForm,
  isVoiceStudioForm,
  loadForms,
  subscribeForms,
} from "../src/serviceForms.ts";
import type { FormsData } from "../src/serviceForms.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });

const FORMS: FormsData = {
  form_tts: { sidebar_key: "tts_speak", label: "TTS", genre: "audio", order: 2 },
  form_voice: { sidebar_key: "voice_creator", label: "Voice", genre: "audio", order: 1 },
  form_voice_studio: { sidebar_key: "voice_studio", label: "Studio", genre: "audio" },
  form_music: { sidebar_key: "generate_music", label: "Music", genre: "audio", order: 1 },
  form_sound: { sidebar_key: "generate_sound", label: "Sound", genre: "audio" },
  form_generate: { sidebar_key: "generate", label: "Generate", genre: "image", order: 0 },
  form_edit: { sidebar_key: "edit", genre: "image", order: 0 },
};

describe("loadForms cache + inflight", () => {
  it("loads once, serves the cache, force bypasses it", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return json({ forms: FORMS });
    }) as typeof fetch;
    const first = await loadForms();
    assert.equal(first["form_tts"]?.sidebar_key, "tts_speak");
    assert.deepEqual(getCachedForms(), first);
    await loadForms();
    assert.equal(calls, 1);
    await loadForms({ force: true });
    assert.equal(calls, 2);
  });

  it("collapses concurrent loads into one fetch", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return json({ forms: FORMS });
    }) as typeof fetch;
    const [a, b] = await Promise.all([loadForms({ force: true }), loadForms({ force: true })]);
    assert.equal(calls, 1);
    assert.deepEqual(a, b);
  });

  it("keeps the old cache on HTTP failures and bad JSON", async () => {
    // 4xx: apiFetch returns without retry (fast); the funnel keeps _cache.
    globalThis.fetch = (async () => new Response("bad", { status: 404 })) as typeof fetch;
    const cached = await loadForms({ force: true });
    assert.ok("form_tts" in cached);
    globalThis.fetch = (async () => json({})) as typeof fetch;
    assert.deepEqual(await loadForms({ force: true }), {});
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => {
        throw new Error("parse fail");
      },
    })) as unknown as typeof fetch;
    assert.deepEqual(await loadForms({ force: true }), {});
  });

  it("keeps the old cache when the fetch itself throws", async () => {
    const realRandom = Math.random;
    Math.random = () => 0; // minimal backoff jitter for the retry sleeps
    try {
      globalThis.fetch = (async () => {
        throw new Error("down");
      }) as typeof fetch;
      assert.deepEqual(await loadForms({ force: true }), {});
    } finally {
      Math.random = realRandom;
    }
  }, 20_000);
});

describe("subscribeForms", () => {
  it("fans out on load and supports unsubscribe, surviving bad listeners", async () => {
    globalThis.fetch = (async () => json({ forms: FORMS })) as typeof fetch;
    let good = 0;
    const unsub = subscribeForms(() => {
      good++;
    });
    subscribeForms(() => {
      throw new Error("listener fault");
    });
    await loadForms({ force: true });
    assert.equal(good, 1);
    unsub();
    await loadForms({ force: true });
    assert.equal(good, 1);
  });
});

describe("sidebar-key primitive", () => {
  it("reverse-resolves tags and classifies the common surfaces", () => {
    assert.equal(formForSidebarKey("tts_speak", FORMS), "form_tts");
    assert.equal(formForSidebarKey("nope", FORMS), undefined);
    assert.equal(isTtsForm("tts_speak"), true);
    assert.equal(isTtsForm("generate"), false);
    assert.equal(isVoiceForm("voice_creator"), true);
    assert.equal(isVoiceStudioForm("voice_studio"), true);
    assert.equal(isMusicForm("generate_music"), true);
    assert.equal(isGenerateForm("generate"), true);
    assert.equal(isEditForm("edit"), true);
    assert.equal(isEditForm("generate"), false);
    assert.equal(isAudioForm("tts_speak"), true);
    assert.equal(isAudioForm("voice_creator"), true);
    assert.equal(isAudioForm("voice_studio"), true);
    assert.equal(isAudioForm("generate_music"), true);
    assert.equal(isAudioForm("generate_sound"), true);
    assert.equal(isAudioForm("generate"), false);
    assert.equal(isAudioForm("generate", FORMS), false);
  });
});

describe("formSidebarItems", () => {
  it("groups by genre, orders by (order, label), skips keyless rows", () => {
    const items = formSidebarItems({
      ...FORMS,
      junk_no_genre: { sidebar_key: "x", label: "X" },
      junk_no_key: { label: "Y", genre: "audio" },
    });
    assert.deepEqual(
      items["audio"].map((i) => i.name),
      ["generate_music", "voice_creator", "tts_speak", "generate_sound", "voice_studio"],
    );
    assert.deepEqual(
      items["image"].map((i) => i.name),
      ["edit", "generate"],
    );
    assert.equal(items["image"][0].label, "edit");
    assert.equal(items["image"][1].label, "Generate");
    assert.equal(items["audio"][0].genre, "audio");
  });
});
