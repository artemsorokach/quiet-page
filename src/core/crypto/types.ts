/** AES-GCM ciphertext with its IV, both base64. */
export interface SealedJson {
  iv: string
  ct: string
}

/** A data key wrapped by a key derived from a secret (password or recovery code). */
export interface Envelope extends SealedJson {
  /** PBKDF2 salt, base64 */
  salt: string
  /** PBKDF2-SHA-256 iteration count */
  iter: number
}

/** Stored in Firestore at users/{uid}.keyring */
export interface Keyring {
  v: 2
  /** Random id of this data key; lets a device notice that the keyring was replaced */
  kid: string
  /** Envelope opened by the password */
  pw: Envelope
  /** Envelope opened by the recovery code */
  rc: Envelope
}

export interface KdfOptions {
  iterations?: number
}
