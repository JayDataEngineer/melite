/**
 * Estate Typert remotes load from SOURCE through the
 * standard-decorator plugin — the regression pin for the decorator
 * wall (ledger §TEST-7). Before vitest.shared.ts lowered the `@Remote`
 * standard decorators, these imports died in node:vm with a
 * SyntaxError and every lane resolved the remotes through built lib;
 * the wall is down, so the four remotes ride the source plane like
 * every other workspace package.
 */
import { describe, expect, it } from 'vitest'
import * as drafts from '@melite/estate-drafts'
import * as manage from '@melite/estate-manage'
import * as media from '@melite/estate-media'
import * as runs from '@melite/estate-runs'

describe('estate remotes load from src (decorator wall regression)', () => {
  it('drafts exports its remote services and spec gates', () => {
    expect(typeof drafts.DraftsRemoteService).toBe('function')
    expect(typeof drafts.BenchRemoteService).toBe('function')
    expect(typeof drafts.draftIdOk).toBe('function')
    expect(drafts.name).toBe('estate-drafts')
  })

  it('manage exports its remote service and plugin', () => {
    expect(typeof manage.ManageRemoteService).toBe('function')
    expect(typeof manage.manageRemotePlugin).toBe('object')
  })

  it('media exports its plugin entry points', () => {
    expect(media.name).toBe('estate-media')
    expect(typeof media.apply).toBe('function')
    expect(typeof media.mediaUrl).toBe('function')
  })

  it('runs exports its remote service and plugin', () => {
    expect(typeof runs.RunsRemoteService).toBe('function')
    expect(typeof runs.runsRemotePlugin).toBe('object')
  })
})
