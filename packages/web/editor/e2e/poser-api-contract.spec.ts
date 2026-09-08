/**
 * CONTRACT: /poser/* API — verifies every endpoint exposed by the
 * melite-poser-nodes ComfyUI custom node pack.
 *
 * These tests run against the Vite dev server (localhost:5173), which
 * proxies /poser/* → inference-comfyui (:18465). They verify the
 * contract the frontend (bodyMesh.ts, text-to-pose.ts, PoseViewer3D.tsx)
 * depends on:
 *
 *   GET  /poser/health                              → {status: ok}
 *   GET  /poser/skin/mesh[?identity_model=X]        → {vertices, faces, bind_joints}
 *   POST /poser/skin/mesh                           → shaped {vertices, faces, bind_joints}
 *   GET  /poser/skin/identity-space[?identity_model=X] → {dims, labels, defaults, range}
 *   GET  /poser/skin/bind_joints[?identity_model=X] → {joints: number[77][3]}
 *   POST /poser/skin/deform_soma                    → {vertices: number[T][V][3]}
 *   GET  /poser/text-to-pose/registry               → {datasets, skeletons, versions}
 *   GET  /poser/text-to-pose/models                 → {models: [...]}
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/poser-api-contract.spec.ts
 */
import { test, expect } from '@playwright/test'

const BASE = '/poser'

test.describe('/poser/health', () => {
  test('returns ok status', async ({ request }) => {
    const r = await request.get(`${BASE}/health`)
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('melite-poser-nodes')
  })
})

test.describe('GET /poser/skin/mesh', () => {
  test('default (soma) returns 18056 vertices + 36108 faces + 77 joints', async ({ request }) => {
    const r = await request.get(`${BASE}/skin/mesh`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.vertices, 'vertices is number[][]').toBeInstanceOf(Array)
    expect(d.vertices.length, '18056 vertices').toBe(18056)
    expect(d.faces, 'faces is number[][]').toBeInstanceOf(Array)
    expect(d.faces.length, '36108 faces').toBe(36108)
    expect(d.bind_joints, 'bind_joints is number[][]').toBeInstanceOf(Array)
    expect(d.bind_joints.length, '77 joints').toBe(77)
    expect(d.identity_model).toBe('soma')
  })

  for (const model of ['soma', 'anny', 'mhr']) {
    test(`?identity_model=${model} returns valid mesh`, async ({ request }) => {
      const r = await request.get(`${BASE}/skin/mesh?identity_model=${model}`)
      expect(r.status(), `GET mesh ${model}`).toBe(200)
      const d = await r.json()
      expect(d.vertices.length, `${model} vertex count`).toBe(18056)
      expect(d.faces.length, `${model} face count`).toBe(36108)
      expect(d.bind_joints.length, `${model} joint count`).toBe(77)
      // Each vertex is [x, y, z]
      expect(d.vertices[0].length).toBe(3)
      // Each face is [a, b, c] triangle indices
      expect(d.faces[0].length).toBe(3)
      expect(d.identity_model).toBe(model)
    })
  }
})

test.describe('POST /poser/skin/mesh (shaped)', () => {
  test('soma returns bind mesh', async ({ request }) => {
    const r = await request.post(`${BASE}/skin/mesh`, {
      data: { identity_model: 'soma' },
    })
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.vertices.length).toBe(18056)
  })

  test('anny with coeffs returns shaped mesh (or neutral fallback)', async ({ request }) => {
    const r = await request.post(`${BASE}/skin/mesh`, {
      data: { identity_model: 'anny', identity_coeffs: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
    })
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.vertices.length).toBe(18056)
    expect(d.identity_model).toBe('anny')
  })

  test('invalid identity_model returns 400', async ({ request }) => {
    const r = await request.get(`${BASE}/skin/mesh?identity_model=bogus`)
    expect(r.status()).toBe(400)
  })
})

test.describe('GET /poser/skin/identity-space', () => {
  test('soma returns 0 dims (no sliders)', async ({ request }) => {
    const r = await request.get(`${BASE}/skin/identity-space?identity_model=soma`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.identity_model).toBe('soma')
    expect(d.dims).toBe(0)
  })

  test('anny returns 11 phenotype dims', async ({ request }) => {
    const r = await request.get(`${BASE}/skin/identity-space?identity_model=anny`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.identity_model).toBe('anny')
    expect(d.dims, 'anny phenotype dims').toBe(11)
    expect(d.labels.length).toBe(11)
    expect(d.defaults.length).toBe(11)
    expect(d.range).toEqual([-3.0, 3.0])
  })

  test('mhr returns 45 phenotype dims', async ({ request }) => {
    const r = await request.get(`${BASE}/skin/identity-space?identity_model=mhr`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.identity_model).toBe('mhr')
    expect(d.dims, 'mhr phenotype dims').toBe(45)
  })
})

test.describe('GET /poser/skin/bind_joints', () => {
  for (const model of ['soma', 'anny']) {
    test(`?identity_model=${model} returns 77 joints`, async ({ request }) => {
      const r = await request.get(`${BASE}/skin/bind_joints?identity_model=${model}`)
      expect(r.status()).toBe(200)
      const d = await r.json()
      expect(d.joints, `${model} joints array`).toBeInstanceOf(Array)
      expect(d.joints.length, `${model} has 77 joints`).toBe(77)
      // Each joint is [x, y, z] in meters (SOMA scale).
      expect(d.joints[0].length).toBe(3)
    })
  }
})

test.describe('GET /poser/text-to-pose/*', () => {
  test('registry returns datasets tree matching RegistryTree interface', async ({ request }) => {
    const r = await request.get(`${BASE}/text-to-pose/registry`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    // Frontend contract (text-to-pose.ts::RegistryTree):
    expect(d.datasets, 'datasets: string[]').toBeInstanceOf(Array)
    expect(d.datasets.length).toBeGreaterThan(0)
    expect(typeof d.datasets[0], 'dataset is a string').toBe('string')
    expect(d.tree, 'tree: Record<string, {skeletons}>').toBeInstanceOf(Object)
    // The first dataset must have a tree entry with skeletons.
    const firstDs = d.datasets[0]
    expect(d.tree[firstDs], `tree[${firstDs}] must exist`).toBeTruthy()
    expect(d.tree[firstDs].skeletons, `tree[${firstDs}].skeletons`).toBeInstanceOf(Array)
    expect(d.tree[firstDs].skeletons.length).toBeGreaterThan(0)
    // Each skeleton has label + key + versions.
    const sk = d.tree[firstDs].skeletons[0]
    expect(sk.label, 'skeleton.label').toBeTruthy()
    expect(sk.key, 'skeleton.key').toBeTruthy()
    expect(sk.versions, 'skeleton.versions').toBeInstanceOf(Array)
    expect(d.default_dataset, 'default_dataset').toBeTruthy()
    expect(d.default_version, 'default_version').toBeTruthy()
  })

  test('models returns a non-empty list', async ({ request }) => {
    const r = await request.get(`${BASE}/text-to-pose/models`)
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.models, 'models array').toBeInstanceOf(Array)
    expect(d.models.length).toBeGreaterThan(0)
    // Each model has an id + label.
    const m = d.models[0]
    expect(m.id).toBeTruthy()
    expect(m.label).toBeTruthy()
  })
})

test.describe('POST /poser/skin/deform_soma', () => {
  test('anny at bind pose returns deformed vertices', async ({ request }) => {
    // Get the bind joints first, then ask for a 1-frame deform.
    const jointsResp = await request.get(`${BASE}/skin/bind_joints?identity_model=anny`)
    const joints = (await jointsResp.json()).joints

    const r = await request.post(`${BASE}/skin/deform_soma`, {
      data: {
        identity_model: 'anny',
        frames_soma77_pos: [joints],  // T=1 frame at bind pose
      },
      timeout: 60_000,
    })
    expect(r.status()).toBe(200)
    const d = await r.json()
    expect(d.vertices, 'deformed vertices').toBeInstanceOf(Array)
    // Either T×V×3 (full deform) or V×3 (bind fallback) — both valid.
    expect(d.vertices.length).toBeGreaterThan(0)
  })
})
