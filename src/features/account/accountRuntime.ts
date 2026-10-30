/**
 * Everything that needs the Firebase SDK, loaded on demand so the page can be written in
 * before the (large) SDK arrives.
 */
export { authErrorKey, resetPassword, signInWithEmail, signInWithGoogle, signOutEverywhere, watchUser } from '../../core/auth/auth.ts'
export { firebaseClient } from '../../core/firebase/client.ts'
export { FirestoreUserDoc } from '../../core/firebase/userDoc.ts'
export { CloudEntryStore } from '../../core/store/cloudStore.ts'
