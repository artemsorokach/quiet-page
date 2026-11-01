/**
 * What «Видалити…» clears on this device: entries, drafts, own feeling words and account flags.
 * Look, language and the welcome flag stay, so the app still looks the same afterwards.
 */
export function personalKeys(uid: string | null): string[] {
  const keys = ['ts-entries', 'qp-draft:local', 'ts-myfeels', 'ts-hidfeels']
  return uid ? [...keys, `qp-draft:u:${uid}`, `ts-askpw-${uid}`, `ts-migrated-${uid}`] : keys
}

export function wipePersonalData(storage: Pick<Storage, 'removeItem'>, uid: string | null): void {
  for (const key of personalKeys(uid)) storage.removeItem(key)
}
