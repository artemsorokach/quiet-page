/**
 * In-browser stand-in for Firebase used only by the E2E build (`vite --mode e2e`).
 * State lives in localStorage under `fake-fb` so it survives reloads and can be copied
 * into a second browser context to act as "another device".
 */
export interface FakeUser {
  uid: string
  email: string
  password: string
}

export interface FakeState {
  users: FakeUser[]
  current: string | null
  docs: Record<string, Record<string, unknown>>
  offline?: boolean
}

const KEY = 'fake-fb'
const listeners = new Set<() => void>()

export function readState(): FakeState {
  const raw = localStorage.getItem(KEY)
  const parsed = raw ? (JSON.parse(raw) as Partial<FakeState>) : {}
  return { users: parsed.users ?? [], current: parsed.current ?? null, docs: parsed.docs ?? {}, offline: parsed.offline ?? false }
}

export function writeState(next: FakeState): void {
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

export function onStateChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5))
