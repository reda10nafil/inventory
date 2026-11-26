// 26/11: sul web l'accesso con l'account del telefono non c'è (stessa forma di `googleAccount.ts`, senza la libreria).
export const GOOGLE_WEB_CLIENT_ID = '1054019076661-5f6ehqhh75rbnfih5e7h9j07u9rdu7sj.apps.googleusercontent.com';
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const googleAccountAvailable = false;

export async function chooseGoogleAccount(): Promise<{ idToken: string; email: string | null } | null> {
  throw new Error('L\'accesso con Google si fa dal telefono.');
}

export async function googleAccessToken(): Promise<string | null> {
  return null;
}

export async function forgetGoogleAccount(): Promise<void> {}
