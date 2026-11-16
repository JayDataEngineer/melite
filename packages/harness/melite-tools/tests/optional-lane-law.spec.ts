/**
 * optional-lane-law.spec.ts — THE OPTIONAL-LANE WALL (operator law
 * 2026-11-16, the rc.3 deployed burn: "THE MAIN PACKAGES DEPEND ON
 * THE OPTIONAL PACKAGES — SO ONE IMAGE EDIT PACKAGE BEING NOT THERE
 * DESTROYS THE WHOLE SYSTEM"). A card package is an OPTIONAL lane
 * seat: a deployed tree installs a subset (the carriers its lock
 * declares), and the burn had @melite/image-image-edit PRESENT
 * while its @melite/models-h3-image-edit dependency was pruned —
 * the static import chain died from inside and took the whole
 * harness-tools load with it.
 *
 * The law this wall guards: an absent lane — the package missing,
 * or present with a pruned transitive — costs EXACTLY that lane's
 * tool (named, never silent); the harness, the estate and every
 * present lane boot. The static imports are structurally gone (the
 * registry row's depth axis); the loader is the only door.
 */
import { describe, expect, it, vi } from 'vitest'
import { cardLaneSeats, loadCardLanes, type CardLaneSeat } from '../src/index.ts'
import type { EstateCall } from '../src/estate.ts'

const fakeCall = {} as EstateCall

describe('THE OPTIONAL-LANE LAW — an absent card package never kills the harness', () => {
  it('a present lane table loads every tool (the guard changes nothing when all lanes seat)', async () => {
    const tools = await loadCardLanes(
      [
        { lane: 'a', seat: async () => ({ name: 'tool-a' }) as never },
        { lane: 'b', seat: async () => ({ name: 'tool-b' }) as never },
      ],
      () => { throw new Error('no lane may be absent here') },
    )
    expect(tools.map((t) => t.name)).toEqual(['tool-a', 'tool-b'])
  })

  it('a MISSING PACKAGE (ERR_MODULE_NOT_FOUND) costs exactly its lane — the others load, the absence is NAMED, nothing throws', async () => {
    const absent: string[] = []
    const tools = await loadCardLanes(
      [
        { lane: 'present-1', seat: async () => ({ name: 'one' }) as never },
        {
          lane: 'image-edit',
          seat: async () => {
            const err = new Error("Cannot find module '@melite/image-image-edit/tool'") as NodeJS.ErrnoException
            err.code = 'ERR_MODULE_NOT_FOUND'
            throw err
          },
        },
        { lane: 'present-2', seat: async () => ({ name: 'two' }) as never },
      ],
      (lane) => absent.push(lane),
    )
    expect(tools.map((t) => t.name)).toEqual(['one', 'two'])
    expect(absent).toEqual(['image-edit'])
  })

  it('a PRESENT package whose DEEP CHAIN dies (the exact burn: image-edit installed, its models dep pruned) costs exactly its lane', async () => {
    // the dynamic import of the tool module evaluates its card.js →
    // the models DECL import — absence anywhere in that chain
    // rejects at OUR guarded door
    const absent: Array<{ lane: string, code?: string }> = []
    const seats: CardLaneSeat[] = [
      { lane: 'music', seat: async () => ({ name: 'music' }) as never },
      {
        lane: 'image-edit',
        seat: async () => {
          const err = new Error("Cannot find module '@melite/models-h3-image-edit' imported from packages/image/image-edit/lib/card.js") as NodeJS.ErrnoException
          err.code = 'ERR_MODULE_NOT_FOUND'
          throw err
        },
      },
    ]
    const tools = await loadCardLanes(seats, (lane, err) => absent.push({ lane, code: (err as NodeJS.ErrnoException).code }))
    expect(tools.map((t) => t.name)).toEqual(['music'])
    expect(absent).toEqual([{ lane: 'image-edit', code: 'ERR_MODULE_NOT_FOUND' }])
  })

  it('THE REAL SEATS under a mocked-away package (the depth arm): five lanes load through the real table, the sixth is named', async () => {
    // the registry resets: the table's dynamic imports must resolve
    // through the doMock, never the cache the earlier arms seated
    vi.resetModules()
    vi.doMock('@melite/image-image-edit/tool', () => {
      throw new Error("Cannot find module '@melite/image-image-edit/tool'")
    })
    const fresh = await import('../src/index.ts')
    const absent: string[] = []
    const tools = await fresh.loadCardLanes(fresh.cardLaneSeats(fakeCall), (lane) => absent.push(lane))
    expect(absent).toEqual(['image-edit'])
    expect(tools).toHaveLength(5)
    vi.doUnmock('@melite/image-image-edit/tool')
  })

  it('THE REAL SEATS unmocked: all six lanes load through the guarded door (the guard never drops a present lane)', async () => {
    vi.resetModules()
    const fresh = await import('../src/index.ts')
    const absent: string[] = []
    const tools = await fresh.loadCardLanes(fresh.cardLaneSeats(fakeCall), (lane) => absent.push(lane))
    expect(absent).toEqual([])
    expect(tools).toHaveLength(6)
  })
})
