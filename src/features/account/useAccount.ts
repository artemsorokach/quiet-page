import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { indexedDbDevice } from '../../core/keys/indexedDbDevice.ts'
import { KeySession, type Unlocked } from '../../core/keys/session.ts'
import { LOCAL_KEY, LocalEntryStore } from '../../core/store/localStore.ts'
import type { EntryStore } from '../../core/store/types.ts'
import type { AuthActions } from './AuthScreen.tsx'
import type { KeyActions, KeyMode } from './KeyScreen.tsx'
import type { SecurityMode } from './SecurityScreen.tsx'

type Runtime = typeof import('./accountRuntime.ts')
type CloudStore = InstanceType<Runtime['CloudEntryStore']>

export type Phase =
  | { kind: 'starting' }
  | { kind: 'local' }
  | { kind: 'signIn' }
  | { kind: 'key'; mode: KeyMode }
  | { kind: 'code'; code: string }
  | { kind: 'cloud' }
  | { kind: 'security'; mode: SecurityMode }

export interface Account {
  phase: Phase
  store: EntryStore
  email: string
  canRecover: boolean
  authActions: AuthActions
  authErrorKey: (error: unknown) => 'errCred' | 'errExists' | 'errWeak' | 'errEmail' | 'errAuth'
  keyActions: KeyActions
  setKeyMode: (mode: KeyMode) => void
  showSignIn: () => void
  backToLocal: () => void
  finishCode: () => void
  security: {
    askEveryTime: boolean
    setAskEveryTime: (on: boolean) => Promise<void>
    open: (mode: SecurityMode) => void
    close: () => void
    changePassword: (current: string, next: string) => Promise<void>
    newCode: (current: string) => Promise<void>
  }
}

const askEveryTimeKey = (uid: string) => `ts-askpw-${uid}`
const migratedKey = (uid: string) => `ts-migrated-${uid}`

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

let runtimePromise: Promise<Runtime> | null = null
const loadRuntime = () => (runtimePromise ??= import('./accountRuntime.ts'))

/** Copies entries kept in this browser into the encrypted cloud store once, then clears them. */
async function migrateLocal(local: LocalEntryStore, cloud: EntryStore, uid: string): Promise<void> {
  if (readFlag(migratedKey(uid))) return
  const records = await local.list()
  let failed = 0
  for (const record of records) {
    try {
      await cloud.put(record)
    } catch {
      failed += 1
    }
  }
  if (failed === 0) {
    localStorage.setItem(migratedKey(uid), 'true')
    localStorage.setItem(LOCAL_KEY, '[]')
  }
}

/** Who is signed in, whether their entries are unlocked, and which store the screens use. */
export function useAccount(lang: string): Account {
  const local = useMemo(() => new LocalEntryStore(localStorage), [])
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' })
  const [store, setStore] = useState<EntryStore>(local)
  const [email, setEmail] = useState('')
  const runtime = useRef<Runtime | null>(null)
  const session = useRef<KeySession | null>(null)
  const uid = useRef<string | null>(null)
  const pending = useRef<{ unlocked: Unlocked; password?: string } | null>(null)
  const cloud = useRef<CloudStore | null>(null)
  /** the unlocked key while in the cloud phase */
  const active = useRef<Unlocked | null>(null)
  const [askEveryTime, setAskState] = useState(false)

  const rt = () => {
    if (!runtime.current) throw new Error('runtime-not-loaded')
    return runtime.current
  }
  const need = () => {
    if (!session.current) throw new Error('no-session')
    return session.current
  }

  async function startCloud(unlocked: Unlocked) {
    const currentUid = uid.current
    if (!currentUid) return
    cloud.current?.close()
    const cloudStore = new (rt().CloudEntryStore)(rt().firebaseClient().db, currentUid, unlocked.key)
    cloud.current = cloudStore
    active.current = unlocked
    pending.current = null
    setAskState(readFlag(askEveryTimeKey(currentUid)))
    await migrateLocal(local, cloudStore, currentUid)
    setStore(cloudStore)
    setPhase({ kind: 'cloud' })
  }

  async function openKeyScreen() {
    const state = await session.current?.inspect()
    setPhase({ kind: 'key', mode: state ?? 'offline' })
  }

  useEffect(() => {
    let stop: (() => void) | null = null
    let cancelled = false
    void loadRuntime().then((loaded) => {
      if (cancelled) return
      runtime.current = loaded
      const { auth, db } = loaded.firebaseClient()
      stop = loaded.watchUser(auth, (user) => {
        cloud.current?.close()
        cloud.current = null
        active.current = null
        if (!user) {
          session.current = null
          uid.current = null
          setEmail('')
          setStore(local)
          setPhase((current) => (current.kind === 'signIn' ? current : { kind: 'local' }))
          return
        }
        uid.current = user.uid
        setEmail(user.email ?? '')
        session.current = new KeySession({
          uid: user.uid,
          doc: new loaded.FirestoreUserDoc(db, user.uid),
          device: indexedDbDevice,
          askEveryTime: () => readFlag(askEveryTimeKey(user.uid)),
        })
        void session.current.restore().then((unlocked) => (unlocked ? startCloud(unlocked) : openKeyScreen()))
      })
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [local])

  const keyActions: KeyActions = {
    create: async (password) => {
      const { unlocked, recoveryCode } = await need().create(password)
      pending.current = { unlocked }
      setPhase({ kind: 'code', code: recoveryCode })
    },
    open: async (password) => {
      const { unlocked, recoveryCode } = await need().openWithPassword(password)
      if (recoveryCode) {
        pending.current = { unlocked }
        setPhase({ kind: 'code', code: recoveryCode })
      } else await startCloud(unlocked)
    },
    recover: async (code) => {
      pending.current = { unlocked: await need().openWithRecoveryCode(code) }
      setPhase({ kind: 'key', mode: 'setpw' })
    },
    setPassword: async (password) => {
      const current = pending.current
      if (!current) throw new Error('no-pending-key')
      await need().setPassword(current.unlocked, password)
      pending.current = { ...current, password }
      setPhase({ kind: 'key', mode: 'pwdone' })
    },
    newCode: async () => {
      const current = pending.current
      if (!current?.password) throw new Error('no-pending-key')
      const code = await need().renewRecoveryCode(current.unlocked, current.password)
      setPhase({ kind: 'code', code })
    },
    continueAfterPassword: () => {
      if (pending.current) void startCloud(pending.current.unlocked)
    },
    startOver: async () => {
      await need().startOver()
      setPhase({ kind: 'key', mode: 'new' })
    },
    retry: () => void openKeyScreen(),
    signOut: () => {
      void (session.current?.forgetDevice() ?? Promise.resolve()).finally(() => rt().signOutEverywhere(rt().firebaseClient().auth))
    },
  }

  const authActions: AuthActions = {
    google: async () => (await loadRuntime()).signInWithGoogle((await loadRuntime()).firebaseClient().auth, lang),
    email: async (address, password, isNew) => {
      const loaded = await loadRuntime()
      await loaded.signInWithEmail(loaded.firebaseClient().auth, address, password, isNew)
    },
    reset: async (address) => {
      const loaded = await loadRuntime()
      await loaded.resetPassword(loaded.firebaseClient().auth, address, lang)
    },
  }

  const unlockedNow = () => {
    if (!active.current) throw new Error('locked')
    return active.current
  }

  const security: Account['security'] = {
    askEveryTime,
    setAskEveryTime: async (on) => {
      const currentUid = uid.current
      if (!currentUid) return
      localStorage.setItem(askEveryTimeKey(currentUid), JSON.stringify(on))
      setAskState(on)
      await need().rememberIfAllowed(unlockedNow())
    },
    open: (mode) => setPhase({ kind: 'security', mode }),
    close: () => setPhase({ kind: 'cloud' }),
    changePassword: (current, next) => need().changePassword(unlockedNow(), current, next),
    newCode: async (current) => {
      const code = await need().renewRecoveryCode(unlockedNow(), current)
      setPhase({ kind: 'code', code })
    },
  }

  return {
    security,
    phase,
    store,
    email,
    canRecover: session.current?.hasRecoveryCode ?? false,
    authActions,
    authErrorKey: (error) => runtime.current?.authErrorKey(error) ?? 'errAuth',
    keyActions,
    setKeyMode: (mode) => setPhase({ kind: 'key', mode }),
    showSignIn: () => setPhase({ kind: 'signIn' }),
    backToLocal: () => setPhase({ kind: uid.current ? 'cloud' : 'local' }),
    finishCode: () => {
      if (pending.current) void startCloud(pending.current.unlocked)
      else setPhase({ kind: 'cloud' })
    },
  }
}
