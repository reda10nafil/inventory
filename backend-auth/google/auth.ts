import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = makeRedirectUri({
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
  const result = await Google.signInAsync({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets']
  });

  if (result.type === 'success') {
    const { idToken, accessToken } = result.params;
    return {
      success: true,
      idToken,
      accessToken,
      user: result.user
    };
  }

  return { success: false };
}

/**
 * Logout da Google
 */
export async function signOut() {
  await Google.signOutAsync();
}

export default { signInWithGoogle, signOut, discovery };
