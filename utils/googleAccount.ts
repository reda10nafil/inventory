// 26/11: accesso con l'account Google già presente sul telefono, come il backup di WhatsApp: si sceglie l'account,
// niente password. `@react-native-google-signin/google-signin` 16.2.0 (accesso nativo di Android). Il token d'identità
// va a Supabase (`signInWithIdToken`): ogni account ha il suo spazio nel cloud (prodotti e foto separati per negozio).
// Client OAuth nel progetto Google Cloud «Syncro-Flow» (syncro-flow-app-20261020), creati il 26/11:
// - Web (Supabase): serve qui come `webClientId`, il token d'identità è emesso per lui;
// - Android: pacchetto com.redako35.syncroflow e SHA-1 della chiave di firma (Google lo riconosce da solo).
// Sul web Metro prende `googleAccount.web.ts`, che non importa la libreria.
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

export const GOOGLE_WEB_CLIENT_ID = '1054019076661-5f6ehqhh75rbnfih5e7h9j07u9rdu7sj.apps.googleusercontent.com';
/** Permesso su Drive limitato ai file creati dall'app (per il backup delle foto, passo successivo). */
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: [DRIVE_FILE_SCOPE] });
  configured = true;
}

export const googleAccountAvailable = true;

/** Scelta dell'account Google del telefono: il token d'identità per Supabase, o null se l'utente annulla. */
export async function chooseGoogleAccount(): Promise<{ idToken: string; email: string | null } | null> {
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null; // annullato
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google non ha dato il token d\'accesso.');
    return { idToken, email: response.data.user.email ?? null };
  } catch (error) {
    if (isErrorWithCode(error) && (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS)) return null;
    throw error;
  }
}

/** Token per Drive dell'account scelto (rinnovato da Google Play Services), o null senza account. */
export async function googleAccessToken(): Promise<string | null> {
  configure();
  try {
    if (!GoogleSignin.getCurrentUser()) {
      const silent = await GoogleSignin.signInSilently();
      if (silent.type !== 'success') return null;
    }
    return (await GoogleSignin.getTokens()).accessToken;
  } catch {
    return null;
  }
}

export async function forgetGoogleAccount(): Promise<void> {
  configure();
  try { await GoogleSignin.signOut(); } catch { /* già uscito */ }
}
