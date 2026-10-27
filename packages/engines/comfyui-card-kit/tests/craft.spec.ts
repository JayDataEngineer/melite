// craft.spec.ts — THE CARD-OWNED CRAFT SEAM's shared half (the
// agent-flow rework's slice 6). The formatting law the prose families
// declare is `collapsePromptSpace`; the per-card rewrites (anima's tag
// grammar) live with their family. These tests judge the spacing law
// alone: it removes the formatting a heredoc or a wrapped wire leaves
// behind and never touches the words.
import { describe, expect, it } from 'vitest'
import { collapsePromptSpace } from '../src/craft.ts'

describe('collapsePromptSpace (the prose formatting law)', () => {
  it('collapses whitespace runs — newlines and tabs become one space', () => {
    expect(collapsePromptSpace('a girl\n\nwalking\tthrough  the  rain')).toBe(
      'a girl walking through the rain',
    )
  })

  it('trims both ends (a wrapped heredoc leaves a leading newline)', () => {
    expect(collapsePromptSpace('   \n slow dolly in \n  ')).toBe('slow dolly in')
  })

  it('is the identity on already-legal text (a clean prompt never moves)', () => {
    expect(collapsePromptSpace('one continuous take, golden hour')).toBe(
      'one continuous take, golden hour',
    )
  })
})
