import { onStateChange, readState, tick, writeState, type FakeUser } from './state.ts'

export interface User {
  uid: string
  email: string | null
}

export interface Auth {
  languageCode: string | null
}

const fail = (code: string) => Object.assign(new Error(code), { code })
const asUser = (user: FakeUser): User => ({ uid: user.uid, email: user.email })

function currentUser(): User | null {
  const state = readState()
  const user = state.users.find((u) => u.uid === state.current)
  return user ? asUser(user) : null
}

export class GoogleAuthProvider {}

export const getAuth = (_app: unknown): Auth => ({ languageCode: null })

export function onAuthStateChanged(_auth: Auth, callback: (user: User | null) => void): () => void {
  let last: string | null | undefined
  const emit = () => {
    const user = currentUser()
    const id = user?.uid ?? null
    if (id === last) return
    last = id
    callback(user)
  }
  void tick().then(emit)
  return onStateChange(() => void tick().then(emit))
}

function signIn(user: FakeUser): void {
  const state = readState()
  writeState({ ...state, current: user.uid })
}

export async function createUserWithEmailAndPassword(_auth: Auth, email: string, password: string): Promise<void> {
  await tick()
  if (!/^\S+@\S+$/.test(email)) throw fail('auth/invalid-email')
  if (password.length < 6) throw fail('auth/weak-password')
  const state = readState()
  if (state.users.some((u) => u.email === email)) throw fail('auth/email-already-in-use')
  const user = { uid: `u-${email.replace(/\W/g, '')}`, email, password }
  writeState({ ...state, users: [...state.users, user] })
  signIn(user)
}

export async function signInWithEmailAndPassword(_auth: Auth, email: string, password: string): Promise<void> {
  await tick()
  const user = readState().users.find((u) => u.email === email && u.password === password)
  if (!user) throw fail('auth/invalid-credential')
  signIn(user)
}

export async function signInWithPopup(_auth: Auth, _provider: GoogleAuthProvider): Promise<void> {
  await tick()
  const state = readState()
  const email = 'google.person@example.com'
  const existing = state.users.find((u) => u.email === email)
  const user = existing ?? { uid: 'u-google', email, password: '' }
  if (!existing) writeState({ ...state, users: [...state.users, user] })
  signIn(user)
}

export const signInWithRedirect = signInWithPopup
export const getRedirectResult = async (_auth: Auth) => null
export const sendPasswordResetEmail = async (_auth: Auth, _email: string) => tick()

export async function signOut(_auth: Auth): Promise<void> {
  await tick()
  writeState({ ...readState(), current: null })
}
