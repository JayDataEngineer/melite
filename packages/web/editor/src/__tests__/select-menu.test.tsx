import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectMenu } from '@melite/ui/select-menu'

const opts = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
] as const

function openAndGetListbox() {
  fireEvent.click(screen.getByRole('button', { name: /Alpha|Beta|Gamma/ }))
  return screen.getByRole('listbox')
}

describe('SelectMenu', () => {
  it('renders the selected label', () => {
    render(<SelectMenu value="b" options={opts as any} onChange={() => {}} />)
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('opens the list and fires onChange on option click', () => {
    const onChange = vi.fn()
    render(<SelectMenu value="a" options={opts as any} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    fireEvent.click(screen.getByText('Gamma'))
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('does not open when disabled', () => {
    const onChange = vi.fn()
    render(<SelectMenu value="a" options={opts as any} onChange={onChange} disabled />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('falls back to rendering value when no option matches', () => {
    render(<SelectMenu value="unknown" options={opts as any} onChange={() => {}} />)
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })

  it('button has aria-haspopup=listbox and aria-expanded', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    const btn = screen.getByRole('button', { name: /Alpha/ })
    expect(btn).toHaveAttribute('aria-haspopup', 'listbox')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('button aria-expanded=true when open', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    const btn = screen.getByRole('button', { name: /Alpha/ })
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('options have role=option and aria-selected', () => {
    render(<SelectMenu value="b" options={opts as any} onChange={() => {}} />)
    openAndGetListbox()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[2]).toHaveAttribute('aria-selected', 'false')
  })

  it('closes after selecting an option', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Gamma'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closing re-opens when clicking the button again', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    const btn = screen.getByRole('button', { name: /Alpha/ })
    fireEvent.click(btn)
    fireEvent.click(screen.getByText('Gamma')) // selects + closes
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('button renders chevron icon', () => {
    const { container } = render(
      <SelectMenu value="a" options={opts as any} onChange={() => {}} />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg!.classList.toString()).toContain('opacity-60')
  })

  it('applies buttonClassName to button', () => {
    render(
      <SelectMenu
        value="a"
        options={opts as any}
        onChange={() => {}}
        buttonClassName="my-btn-class"
      />,
    )
    const btn = screen.getByRole('button', { name: /Alpha/ })
    expect(btn.className).toContain('my-btn-class')
  })

  it('applies className to the outer wrapper', () => {
    const { container } = render(
      <SelectMenu
        value="a"
        options={opts as any}
        onChange={() => {}}
        className="wrapper-class"
      />,
    )
    const wrapper = container.firstElementChild!
    expect(wrapper.className).toContain('wrapper-class')
  })

  it('applies popoverClassName to the listbox', () => {
    render(
      <SelectMenu
        value="a"
        options={opts as any}
        onChange={() => {}}
        popoverClassName="pop-custom"
      />,
    )
    openAndGetListbox()
    const listbox = screen.getByRole('listbox')
    expect(listbox.className).toContain('pop-custom')
  })

  it('passes aria-label and title through to button', () => {
    render(
      <SelectMenu
        value="a"
        options={opts as any}
        onChange={() => {}}
        aria-label="Pick sampler"
        title="Select a sampler"
      />,
    )
    const btn = screen.getByRole('button', { name: 'Pick sampler' })
    expect(btn).toHaveAttribute('title', 'Select a sampler')
  })

  it('disabled button has opacity-50 class', () => {
    render(
      <SelectMenu value="a" options={opts as any} onChange={() => {}} disabled />,
    )
    const btn = screen.getByRole('button', { name: /Alpha/ })
    expect(btn.className).toContain('opacity-50')
    expect(btn).toHaveAttribute('disabled')
  })
})

// ─── Keyboard navigation ──────────────────────────────────────
describe('SelectMenu — keyboard', () => {
  it('Escape closes the listbox', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ArrowDown moves hover down', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    // initial hover is index 0 (value=a matches opts[0])
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    // hover should be at index 2 now
    // Enter should select 'c'
    fireEvent.keyDown(window, { key: 'Enter' })
    // After selection, listbox closes
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ArrowUp at top stays at index 0', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    // Already at 0 — ArrowUp should clamp
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'Enter' })
    // Re-selects 'a'
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ArrowDown at bottom stays at last index', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    // Move to bottom
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    // Already at 2 — one more should clamp
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    // 'c' selected
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('Enter selects the hovered option', () => {
    const onChange = vi.fn()
    render(<SelectMenu value="a" options={opts as any} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    fireEvent.keyDown(window, { key: 'ArrowDown' }) // hover → 1
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('Space selects the hovered option', () => {
    const onChange = vi.fn()
    render(<SelectMenu value="a" options={opts as any} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    fireEvent.keyDown(window, { key: 'ArrowDown' }) // hover → 1
    fireEvent.keyDown(window, { key: ' ' })
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

// ─── Click-outside ────────────────────────────────────────────
describe('SelectMenu — click-outside', () => {
  it('clicking outside the popover closes it', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    // mousedown on document body (outside both button and popover)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('clicking the button again toggles the listbox closed', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    const btn = screen.getByRole('button', { name: /Alpha/ })
    fireEvent.click(btn)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.click(btn)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('clicking inside the popover does NOT close it', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    const listbox = screen.getByRole('listbox')
    // mousedown inside the listbox
    fireEvent.mouseDown(listbox)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })
})

// ─── Option hover highlight ───────────────────────────────────
describe('SelectMenu — hover highlight', () => {
  it('hovered option gets bg-muted class (when not the selected one)', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    openAndGetListbox()
    const options = screen.getAllByRole('option')
    // hover starts at 0 (value=a) — so option[0] is selected, NOT bg-muted
    // Option[1] is not hovered yet, option[2] not hovered
    // ArrowDown once → hover=1 → option[1] is hovered AND selected=value=b? No,
    // hover is index 1, but value is still 'a'. So option[1] gets bg-muted.
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    const beta = options[1]
    expect(beta.className).toContain('bg-muted')
  })

  it('selected option gets bg-brand/15 class', () => {
    render(<SelectMenu value="b" options={opts as any} onChange={() => {}} />)
    openAndGetListbox()
    const options = screen.getAllByRole('option')
    // value=b → option[1] is selected
    expect(options[1].className).toContain('bg-brand/15')
    expect(options[1].className).toContain('text-brand')
  })
})

// ─── Options rendering ────────────────────────────────────────
describe('SelectMenu — options rendering', () => {
  it('renders all options with correct labels', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    openAndGetListbox()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options.map((o) => o.textContent)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('each option button is full-width', () => {
    render(<SelectMenu value="a" options={opts as any} onChange={() => {}} />)
    openAndGetListbox()
    const options = screen.getAllByRole('option')
    options.forEach((opt) => {
      expect(opt.className).toContain('w-full')
    })
  })
})
