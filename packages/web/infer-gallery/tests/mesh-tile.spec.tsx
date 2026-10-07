// @vitest-environment jsdom
/**
 * mesh-tile — the model tile's click-to-load preview.
 *
 * The viewer is mocked HERE (jsdom has no WebGL and the kernels have
 * their own specs): what this file proves is the seat's own contract
 * — the tile paints an idle chip with zero GLB loaders mounted, an
 * explicit arm mounts exactly one viewer carrying the artifact's url,
 * arming never bubbles into the tile's drilldown door, and the seat
 * collapses back on close. The panel-wiring arm proves the grid
 * routes model artifacts here (the blank-tile regression: the seat
 * rendered null for the model kind).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { MESH_TILE_COPY, ModelTilePreview } from '../src/client/mesh-tile.tsx'
import { MediaPanel } from '../src/client/MediaPanel.tsx'
import type { RunRow } from '../src/client/decode.ts'

vi.mock('../src/client/mesh-view.tsx', () => ({
  MeshView: ({ url, file, height }: { url: string; file: string; height?: number | string }) => (
    <div data-testid="mesh-view" data-url={url} data-file={file} data-height={String(height)} />
  ),
}))

const URL_GLB = '/infer-gallery/artifact?path=run-9%2Fprop_final.glb'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('MESH_TILE_COPY — the tile preview dictionary', () => {
  it('names the artifact it arms', () => {
    expect(MESH_TILE_COPY.loadPreviewOf('prop_final.glb')).toBe('Load 3D preview of prop_final.glb')
  })
})

describe('ModelTilePreview — idle paints no loader', () => {
  it('shows the preview chip and mounts zero viewers on first paint', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    expect(screen.getByTestId('model-tile-load').textContent).toBe(MESH_TILE_COPY.loadPreview)
    expect(screen.getByTestId('model-tile-load').getAttribute('aria-label')).toBe(
      MESH_TILE_COPY.loadPreviewOf('prop_final.glb'),
    )
    expect(screen.queryByTestId('mesh-view')).toBeNull()
    expect(screen.queryByTestId('model-tile-preview')).toBeNull()
  })
})

describe('ModelTilePreview — arming mounts one viewer', () => {
  it('click arms the preview with the artifact url', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.click(screen.getByTestId('model-tile-load'))
    expect(screen.queryByTestId('model-tile-load')).toBeNull()
    const viewer = screen.getByTestId('mesh-view')
    expect(viewer.getAttribute('data-url')).toBe(URL_GLB)
    expect(viewer.getAttribute('data-file')).toBe('prop_final.glb')
  })

  it('Enter arms the preview', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.keyDown(screen.getByTestId('model-tile-load'), { key: 'Enter' })
    expect(screen.getByTestId('mesh-view')).toBeTruthy()
  })

  it('Space arms the preview', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.keyDown(screen.getByTestId('model-tile-load'), { key: ' ' })
    expect(screen.getByTestId('mesh-view')).toBeTruthy()
  })

  it('any other key leaves the seat idle', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.keyDown(screen.getByTestId('model-tile-load'), { key: 'x' })
    expect(screen.queryByTestId('mesh-view')).toBeNull()
    expect(screen.getByTestId('model-tile-load')).toBeTruthy()
  })
})

describe('ModelTilePreview — the seat never opens the drilldown', () => {
  function renderInTile(): { opened: string[] } {
    const opened: string[] = []
    render(
      <button type="button" onClick={() => { opened.push('drilldown') }}>
        <ModelTilePreview url={URL_GLB} file="prop_final.glb" />
      </button>,
    )
    return { opened }
  }

  it('arming by click stays in the tile', () => {
    const { opened } = renderInTile()
    fireEvent.click(screen.getByTestId('model-tile-load'))
    expect(screen.getByTestId('mesh-view')).toBeTruthy()
    expect(opened).toEqual([])
  })

  it('arming by keyboard stays in the tile', () => {
    const { opened } = renderInTile()
    fireEvent.keyDown(screen.getByTestId('model-tile-load'), { key: 'Enter' })
    expect(screen.getByTestId('mesh-view')).toBeTruthy()
    expect(opened).toEqual([])
  })

  it('orbiting the armed canvas stays in the tile', () => {
    const { opened } = renderInTile()
    fireEvent.click(screen.getByTestId('model-tile-load'))
    fireEvent.click(screen.getByTestId('model-tile-preview'))
    expect(screen.getByTestId('mesh-view')).toBeTruthy()
    expect(opened).toEqual([])
  })
})

describe('ModelTilePreview — close collapses the seat', () => {
  it('click closes back to the idle chip', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.click(screen.getByTestId('model-tile-load'))
    expect(screen.getByTestId('mesh-view')).toBeTruthy()
    fireEvent.click(screen.getByTestId('model-tile-close'))
    expect(screen.queryByTestId('mesh-view')).toBeNull()
    expect(screen.getByTestId('model-tile-load')).toBeTruthy()
  })

  it('Enter closes back to the idle chip', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.click(screen.getByTestId('model-tile-load'))
    fireEvent.keyDown(screen.getByTestId('model-tile-close'), { key: 'Enter' })
    expect(screen.queryByTestId('mesh-view')).toBeNull()
    expect(screen.getByTestId('model-tile-load')).toBeTruthy()
  })

  it('Space closes back to the idle chip', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.click(screen.getByTestId('model-tile-load'))
    fireEvent.keyDown(screen.getByTestId('model-tile-close'), { key: ' ' })
    expect(screen.queryByTestId('mesh-view')).toBeNull()
  })

  it('any other key keeps the seat armed', () => {
    render(<ModelTilePreview url={URL_GLB} file="prop_final.glb" />)
    fireEvent.click(screen.getByTestId('model-tile-load'))
    fireEvent.keyDown(screen.getByTestId('model-tile-close'), { key: 'y' })
    expect(screen.getByTestId('mesh-view')).toBeTruthy()
  })

  it('closing stays in the tile', () => {
    const opened: string[] = []
    render(
      <button type="button" onClick={() => { opened.push('drilldown') }}>
        <ModelTilePreview url={URL_GLB} file="prop_final.glb" />
      </button>,
    )
    fireEvent.click(screen.getByTestId('model-tile-load'))
    fireEvent.click(screen.getByTestId('model-tile-close'))
    expect(opened).toEqual([])
  })
})

describe('MediaPanel — model artifacts ride the tile preview seat', () => {
  const runsFeed = (runs: unknown[]): Promise<Response> =>
    Promise.resolve(new Response(JSON.stringify({ runs, errors: [] }), { status: 200 }))
  const draftsFeed = (): Promise<Response> =>
    Promise.resolve(new Response(JSON.stringify({ drafts: [], errors: [] }), { status: 200 }))
  const run = (over: Record<string, unknown>): RunRow =>
    ({ run_id: 'r9', created_at: 1, ...over }) as RunRow

  it('a mesh tile paints the preview chip, never a blank seat', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ prompt: 'a prop', artifacts: [{ url: URL_GLB, name: 'prop_final.glb', type: 'model' }] })])
        : draftsFeed())
    render(<MediaPanel />)
    const chip = await screen.findByTestId('model-tile-load')
    expect(chip.textContent).toBe(MESH_TILE_COPY.loadPreview)
    expect(chip.getAttribute('aria-label')).toBe(MESH_TILE_COPY.loadPreviewOf('prop_final.glb'))
    expect(screen.queryByTestId('mesh-view')).toBeNull()
  })

  it('arming the tile mounts the viewer inline, the drilldown stays shut', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ prompt: 'a prop', artifacts: [{ url: URL_GLB, name: 'prop_final.glb', type: 'model' }] })])
        : draftsFeed())
    render(<MediaPanel />)
    fireEvent.click(await screen.findByTestId('model-tile-load'))
    const viewer = await screen.findByTestId('mesh-view')
    expect(viewer.getAttribute('data-url')).toBe(URL_GLB)
    expect(screen.queryByTestId('drill-rename')).toBeNull()
  })

  it('the tile still opens the drilldown carrying the GLB url', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ prompt: 'a prop', artifacts: [{ url: URL_GLB, name: 'prop_final.glb', type: 'model' }] })])
        : draftsFeed())
    render(<MediaPanel />)
    const chip = await screen.findByTestId('model-tile-load')
    const tile = chip.closest('button') as HTMLElement | null
    expect(tile).toBeTruthy()
    fireEvent.click(tile as HTMLElement)
    const viewer = await screen.findByTestId('mesh-view')
    expect(viewer.getAttribute('data-url')).toBe(URL_GLB)
    const download = document.querySelector('a[download="prop_final.glb"]')
    expect(download?.getAttribute('href')).toBe(URL_GLB)
  })
})
