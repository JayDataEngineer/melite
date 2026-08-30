/**
 * deckStore — tiny module store (galleryStore pattern): open flag for the
 * sidebar entry, plus the deck-launched run ids so RunCards survive card
 * switches inside the overlay.
 */
type Listener = () => void

export interface DeckState {
  open: boolean
  runs: string[]
}

let state: DeckState = { open: false, runs: [] }
const listeners = new Set<Listener>()

function emit(): void { for (const l of listeners) l() }

export const deckStore = {
  subscribe(l: Listener): () => void {
    listeners.add(l)
    return () => { listeners.delete(l) }
  },
  snapshot(): DeckState { return state },
  isOpen(): boolean { return state.open },
  toggle(): void { state = { ...state, open: !state.open }; emit() },
  close(): void { state = { ...state, open: false }; emit() },
  addRun(runId: string): void {
    if (state.runs.includes(runId)) return
    state = { ...state, runs: [runId, ...state.runs].slice(0, 12) }
    emit()
  },
  removeRun(runId: string): void {
    state = { ...state, runs: state.runs.filter(r => r !== runId) }
    emit()
  },
}
