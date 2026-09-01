# Permissions Audit — Pre-eject vs Post-eject

> Generato Fase 0 — 2026-09-02 — Branch chore/remove-expo-full-eject
> Fonte: android/app/src/main/AndroidManifest.xml:1 + app.json:23 + expo plugin requirements

## Pre-eject (Expo managed — 22 permessi)

| Permission | Richiesta da | Uso reale? | Post-eject keep? |
|---|---|---|---|
| ACCESS_COARSE_LOCATION | expo-location transitive | mai importato | REMOVE |
| ACCESS_FINE_LOCATION | expo-location | mai importato | REMOVE |
| CAMERA | expo-camera:17.0.10 + scanner.tsx | Sì — BarcodeScanner.tsx:3 CameraView | KEEP |
| INTERNET | expo / fetch qrserver+zxing | Sì — barcodeDecoder.ts fetch | KEEP |
| MODIFY_AUDIO_SETTINGS | expo-av SoundService | Sì — SoundService.ts Audio.Sound | KEEP (RN Sound) |
| NFC | app.json nfc + nfc-manager | Sì — GS1 Tag programming | KEEP |
| READ_CALENDAR | expo-calendar | mai importato | REMOVE |
| READ_CONTACTS | expo-contacts | mai importato | REMOVE |
| READ_EXTERNAL_STORAGE | expo-image-picker/document-picker legacy | Legacy — da migrare a READ_MEDIA_* | REMOVE (Android 13+ media) |
| READ_MEDIA_AUDIO | expo-file-system/media-library | non usato | REMOVE |
| READ_MEDIA_IMAGES | expo-image-picker | Sì (galleria) | KEEP |
| READ_MEDIA_VIDEO | expo-video/media-library | non usato | REMOVE |
| READ_MEDIA_VISUAL_USER_SELECTED | Android 14 partial media | Sì (image-picker) | KEEP |
| RECORD_AUDIO | expo-av / expo-audio | non usato (solo playback) | REMOVE |
| SYSTEM_ALERT_WINDOW | expo-dev-client? | non usato prod | REMOVE |
| USE_BIOMETRIC / USE_FINGERPRINT | expo-local-authentication | mai importato | REMOVE |
| VIBRATE | SoundService fallback Vibration | Sì — SoundService fallback | KEEP |
| WRITE_CALENDAR | expo-calendar | mai importato | REMOVE |
| WRITE_CONTACTS | expo-contacts | mai importato | REMOVE |
| WRITE_EXTERNAL_STORAGE | expo-file-system legacy | Legacy — scoped storage | REMOVE |

Meta-data da rimuovere: expo.modules.updates.*, exp+syncro-flow scheme (keep solo syncroflow://).

## Post-eject target (5-7 permessi)

```
CAMERA
NFC
INTERNET
VIBRATE
READ_MEDIA_IMAGES
READ_MEDIA_VISUAL_USER_SELECTED
(MODIFY_AUDIO_SETTINGS se RN Sound lo richiede — già in manifest, keep)
```

Verifica Fase 5: AndroidManifest.xml deve contenere solo questi 6-7 + nessun meta-data expo.
