/**
 * SyncroFlow — mediaCompressor (Bare RN 0.81.5)
 * Wrapper react-native-compressor + react-native-image-crop-picker
 *
 * compressToWebP(uri): Promise<string>
 * - multi-thread (native thread pool, non JS)
 * - resize max 1920x1080 (contain, no upscale)
 * - strip EXIF
 * - quality 0.75
 * - output .webp
 * - fallback se nativo non disponibile (ritorna uri originale)
 *
 * Bare RN: nessun expo-image-manipulator / expo-file-system.
 * Autolinking: react-native-compressor (iOS pod, Android gradle) + react-native-image-crop-picker.
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CompressOptions = {
  /** Max width — default 1920 */
  maxWidth?: number;
  /** Max height — default 1080 */
  maxHeight?: number;
  /** 0..1 — default 0.75 */
  quality?: number;
  /** Output extension — default 'webp' */
  output?: 'webp' | 'jpg' | 'png';
};

export type CompressorResult = {
  uri: string;
  sizeBefore?: number;
  sizeAfter?: number;
  usedFallback: boolean;
};

// ---------------------------------------------------------------------------
// Native availability probe (lazy, cached)
// ---------------------------------------------------------------------------
let compressorModule: any = null;
let compressorAvailable: boolean | null = null;

function getCompressor(): any | null {
  if (compressorAvailable !== null) return compressorAvailable ? compressorModule : null;
  try {
    // react-native-compressor v1.x: { Image: { compress } }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-compressor');
    const candidate = mod?.Image ?? mod?.CompressorImage ?? mod?.default?.Image ?? mod;
    if (candidate && typeof candidate.compress === 'function') {
      compressorModule = candidate;
      compressorAvailable = true;
      return compressorModule;
    }
    // Fallback: module exports compress directly
    if (typeof mod?.compress === 'function') {
      compressorModule = mod;
      compressorAvailable = true;
      return compressorModule;
    }
    compressorAvailable = false;
    return null;
  } catch {
    compressorAvailable = false;
    return null;
  }
}

export function isCompressorAvailable(): boolean {
  return !!getCompressor();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function toWebPExt(uri: string): string {
  // Mantieni directory, sostituisci estensione con .webp
  const qIdx = uri.indexOf('?');
  const clean = qIdx >= 0 ? uri.slice(0, qIdx) : uri;
  const dot = clean.lastIndexOf('.');
  const slash = clean.lastIndexOf('/');
  if (dot > slash) return clean.slice(0, dot) + '.webp';
  return clean + '.webp';
}

function stripFilePrefix(uri: string): string {
  return uri.startsWith('file://') ? uri : uri;
}

// ---------------------------------------------------------------------------
// Core: compressToWebP
// ---------------------------------------------------------------------------
/**
 * Comprime un'immagine locale a WebP 1920x1080, quality 0.75, strip EXIF.
 * Multi-thread: il lavoro avviene su thread nativo (Compressor dispatch queue / Android Executor).
 *
 * @param uri - file:// path o content:// (da image-crop-picker / camera)
 * @returns Promise<string> — uri del file .webp compresso (file://)
 *
 * Fallback: se il modulo nativo non è linkato (es. dev senza pod install),
 * ritorna l'uri originale e logga warning — nessuna eccezione.
 */
export async function compressToWebP(uri: string, opts: CompressOptions = {}): Promise<string> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.75,
    output = 'webp',
  } = opts;

  if (!uri || typeof uri !== 'string') {
    throw new Error('[mediaCompressor] uri invalido');
  }

  const compressor = getCompressor();

  if (!compressor) {
    console.warn(
      '[mediaCompressor] react-native-compressor non disponibile — fallback uri originale. ' +
        'Esegui pod install / gradle sync e rebuild bare.'
    );
    return uri;
  }

  const inputUri = stripFilePrefix(uri);

  // react-native-compressor API varia per versione — normalizziamo
  // v1: Image.compress(uri, { compressionMethod, maxWidth, maxHeight, quality, output, ... })
  // Alcune fork: Image.compress(uri, { maxWidth, maxHeight, quality, returnableOutputType, output })
  const compressArgs: Record<string, unknown> = {
    compressionMethod: 'auto', // auto = intelligente su dimensioni
    maxWidth,
    maxHeight,
    quality, // 0..1
    output, // 'webp' — Android richiede libwebp, iOS 14+ nativo
    // Strip EXIF: su iOS il compressor rimuove EXIF di default se non si passa exif flag;
    // su Android: useStripExif / keepExif a seconda della versione
    // Tentiamo entrambe le chiavi per compatibilità
    keepExif: false,
    stripExif: true,
    // File output: se supportato, forza .webp su cache dir
    returnableOutputType: 'uri',
    // Multi-thread hint — Android Executor, iOS GCD
    // Alcune versioni espongono `concurrent` o usano pool interno automaticamente
  };

  try {
    // Tentativo 1: Image.compress(uri, options)
    let resultUri: string | null = null;

    if (typeof compressor.compress === 'function') {
      const res = await compressor.compress(inputUri, compressArgs);
      // res può essere string uri o { uri } o { path }
      if (typeof res === 'string') resultUri = res;
      else if (res && typeof res === 'object') {
        resultUri = (res as any).uri ?? (res as any).path ?? (res as any).outputUri ?? null;
      }
    }

    if (resultUri && typeof resultUri === 'string' && resultUri.length > 0) {
      // Normalizza file:// prefix
      if (!resultUri.startsWith('file://') && !resultUri.startsWith('content://') && !resultUri.startsWith('/')) {
        // Alcune versioni ritornano solo path senza prefix
        resultUri = 'file://' + resultUri;
      }
      return resultUri;
    }

    // Se il compressor ritorna empty, fallback
    console.warn('[mediaCompressor] compress ritorna vuoto — fallback originale');
    return uri;
  } catch (e: any) {
    // WebP non supportato su device vecchio → fallback jpg
    const msg = String(e?.message ?? e);
    const isWebPUnsupported = /webp|unsupported|encoder/i.test(msg);

    if (isWebPUnsupported && output === 'webp') {
      console.warn('[mediaCompressor] WebP non supportato, retry jpg:', msg);
      try {
        const retry = await compressor.compress(inputUri, {
          ...compressArgs,
          output: 'jpg',
        });
        const retryUri = typeof retry === 'string' ? retry : (retry as any)?.uri ?? (retry as any)?.path;
        if (retryUri) return retryUri;
      } catch (retryErr) {
        console.warn('[mediaCompressor] retry jpg fallito:', retryErr);
      }
    }

    console.warn('[mediaCompressor] compress fallito — fallback originale:', e);
    return uri;
  }
}

// ---------------------------------------------------------------------------
// Picker helper opzionale — wrapper image-crop-picker → compressToWebP
// ---------------------------------------------------------------------------
/**
 * Apre il picker nativo (react-native-image-crop-picker) e ritorna direttamente il .webp compresso.
 * Se il picker non è disponibile, lancia — il chiamante può fallback su react-native-image-picker.
 *
 * @example
 * const webpUri = await pickAndCompressToWebP({ cropping: true });
 */
export async function pickAndCompressToWebP(options: Record<string, unknown> = {}): Promise<string | null> {
  let picker: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-image-crop-picker');
    picker = mod?.default ?? mod;
  } catch {
    throw new Error('[mediaCompressor] react-native-image-crop-picker non disponibile');
  }

  if (!picker || typeof picker.openPicker !== 'function') {
    throw new Error('[mediaCompressor] picker.openPicker non trovato');
  }

  const image = await picker.openPicker({
    mediaType: 'photo',
    compressImageQuality: 1, // disabilita compressione picker — facciamo noi WebP
    includeExif: false, // strip EXIF già qui
    cropping: false,
    ...options,
  } as any);

  const pickedUri: string | undefined = (image as any)?.path ?? (image as any)?.sourceURL ?? (image as any)?.uri;
  if (!pickedUri) return null;

  return compressToWebP(pickedUri.startsWith('file://') ? pickedUri : 'file://' + pickedUri);
}

/**
 * Camera → WebP pipeline.
 */
export async function openCameraAndCompressToWebP(options: Record<string, unknown> = {}): Promise<string | null> {
  let picker: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-image-crop-picker');
    picker = mod?.default ?? mod;
  } catch {
    throw new Error('[mediaCompressor] react-native-image-crop-picker non disponibile');
  }

  const image = await picker.openCamera({
    mediaType: 'photo',
    compressImageQuality: 1,
    includeExif: false,
    ...options,
  } as any);

  const pickedUri: string | undefined = (image as any)?.path ?? (image as any)?.sourceURL;
  if (!pickedUri) return null;
  return compressToWebP(pickedUri.startsWith('file://') ? pickedUri : 'file://' + pickedUri);
}

// ---------------------------------------------------------------------------
// Utility: stima risparmio (opzionale, richiede react-native-fs se disponibile)
// ---------------------------------------------------------------------------
export async function getFileSize(uri: string): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RNFS = require('react-native-fs');
    const path = uri.replace('file://', '');
    const stat = await RNFS.stat(path);
    return Number(stat.size);
  } catch {
    return null;
  }
}

export default {
  compressToWebP,
  pickAndCompressToWebP,
  openCameraAndCompressToWebP,
  isCompressorAvailable,
  getFileSize,
};
