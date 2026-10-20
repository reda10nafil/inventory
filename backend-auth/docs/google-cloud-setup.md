# Google login, Drive backup, and Sheets export

## Provisioned services

- Google Cloud project: `syncro-flow-app-20261020` (display name: Syncro-Flow)
- Enabled APIs: Google Drive API and Google Sheets API
- Supabase project: `ymsnlixracwjgajldryb`
- Supabase OAuth callback: `https://ymsnlixracwjgajldryb.supabase.co/auth/v1/callback`
- App callback: `syncroflow://auth/callback`
- Web development callback: `http://localhost:8081/`

## One-time Google Console configuration

Google requires a human to create OAuth clients and accept the OAuth consent terms in Google Cloud Console; its API does not expose OAuth client creation. In the project above:

1. Configure the OAuth consent screen / Google Auth Platform with the app name, support email, and authorized domains. Add test users while the app is in testing.
2. Create an OAuth client of type **Web application**.
3. Add the exact Supabase callback above under **Authorized redirect URIs**. Add the deployed web origin under **Authorized JavaScript origins** after the production domain is known.
4. In Supabase Dashboard → Authentication → Providers → Google, enable Google and enter that client ID and client secret. Add these scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.file`, and `https://www.googleapis.com/auth/spreadsheets`.
5. In Supabase Dashboard → Authentication → URL Configuration, allow `syncroflow://auth/callback`, `http://localhost:8081/`, and the production app origin when available.
6. Add the Google account(s) as test users until OAuth verification/publishing is complete.
7. Rebuild/restart the app and sign in again so Google returns a fresh Drive/Sheets provider token.

The app requests the narrow `drive.file` scope. Files remain private in each operator's Google Drive; the app does not grant public link access. Product photo links in CSV/Sheets open only for people who have Google Drive access to those files. Supabase stores and synchronizes organization inventory; this Google backup is a separate per-account copy.

Do not put the Google client secret in the app, repository, or Expo config. Store it only in the Supabase Google provider configuration. No service-role key belongs in the client either.
