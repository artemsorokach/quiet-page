import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'

/** Public web config of the Firebase project `quiet-page` (not a secret: access is governed by
 *  Firestore rules, authorised domains and on-device encryption). */
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAHpt3fIKx8M5lZ7K_RqYF7-qpKOFwIncc',
  authDomain: 'quiet-page.firebaseapp.com',
  projectId: 'quiet-page',
  storageBucket: 'quiet-page.firebasestorage.app',
  messagingSenderId: '262943215245',
  appId: '1:262943215245:web:d9dfaf3d070c9aae7fdcc4',
} as const

export interface FirebaseClient {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let client: FirebaseClient | null = null

export function firebaseClient(): FirebaseClient {
  if (client) return client
  const app = initializeApp(FIREBASE_CONFIG)
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  client = { app, auth: getAuth(app), db }
  return client
}
