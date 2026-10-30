import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'

export type AuthErrorKey = 'errCred' | 'errExists' | 'errWeak' | 'errEmail' | 'errAuth'

/** Maps Firebase error codes to the messages the person sees. */
export function authErrorKey(error: unknown): AuthErrorKey {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : ''
  if (/wrong-password|invalid-credential|user-not-found|invalid-login/.test(code)) return 'errCred'
  if (/email-already-in-use/.test(code)) return 'errExists'
  if (/weak-password/.test(code)) return 'errWeak'
  if (/invalid-email|missing-email/.test(code)) return 'errEmail'
  return 'errAuth'
}

const isClosedByPerson = (error: unknown) => /popup-closed/.test(String((error as { code?: string })?.code ?? ''))
const needsRedirect = (error: unknown) =>
  /popup-blocked|operation-not-supported|cancelled-popup/.test(String((error as { code?: string })?.code ?? ''))

export async function signInWithGoogle(auth: Auth, lang: string): Promise<void> {
  auth.languageCode = lang
  const provider = new GoogleAuthProvider()
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    if (isClosedByPerson(error)) return
    if (needsRedirect(error)) return signInWithRedirect(auth, provider)
    throw error
  }
}

export async function signInWithEmail(auth: Auth, email: string, password: string, isNew: boolean): Promise<void> {
  if (isNew) await createUserWithEmailAndPassword(auth, email, password)
  else await signInWithEmailAndPassword(auth, email, password)
}

export function resetPassword(auth: Auth, email: string, lang: string): Promise<void> {
  auth.languageCode = lang
  return sendPasswordResetEmail(auth, email)
}

export function watchUser(auth: Auth, onChange: (user: User | null) => void): () => void {
  getRedirectResult(auth).catch(() => undefined)
  return onAuthStateChanged(auth, onChange)
}

export const signOutEverywhere = (auth: Auth) => signOut(auth)
