/** The password or recovery code does not open the envelope (or the data was altered). */
export class WrongSecretError extends Error {
  constructor() {
    super('wrong-secret')
    this.name = 'WrongSecretError'
  }
}
