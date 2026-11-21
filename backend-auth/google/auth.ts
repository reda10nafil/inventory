import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'com.synchroflow',
  path: 'oauth/callback'
});

/**
 * Configura il discovery document per Google OAuth
 */
export const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token'
};

/**
 * Inizia il flusso di login con Google
 */
export async function signInWithGoogle() {
  try {
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
      responseType: AuthSession.ResponseType.Token
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.params) {
      const { id_token, access_token } = result.params;
      return {
        success: true,
        idToken: id_token,
        accessToken: access_token,
        user: undefined
      };
    }
  } catch (error) {
    console.error('Errore signInWithGoogle:', error);
  }

  return { success: false };
}

/**
 * Logout da Google
 */
export async function signOut() {
  try {
    await AuthSession.dismiss();
  } catch (error) {
    console.warn('Errore durante signOut:', error);
  }
}

export default { signInWithGoogle, signOut, discovery };
