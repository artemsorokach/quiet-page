export interface FirebaseApp {
  name: string
}

export function initializeApp(_config: unknown): FirebaseApp {
  return { name: 'fake' }
}
