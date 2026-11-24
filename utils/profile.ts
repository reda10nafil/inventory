// Profilo dell'operatore di questo telefono (ACC1, ticket 32): nome, telefono, ruolo, foto e nome del telefono, in una
// chiave per telefono (`device:v1:profile`), senza login. Dà l'autore degli eventi nuovi della Cronologia. Funzioni pure.
import type { EventAuthor } from '../types';
import { isRole, roleName, type Role } from './roles';

export interface Profile {
  /** '' finché il profilo non è salvato la prima volta (a una modifica o al primo evento) */
  id: string;
  name: string;
  /** numero di telefono dell'operatore (facoltativo) */
  phone: string;
  role: Role;
  /** foto piccola come `data:image/…` (locale: un indirizzo `blob:` non sopravvive a una ricarica) */
  photo: string;
  /** nome di questo telefono («Banco 1») */
  device: string;
}

/** Senza account ogni telefono è Titolare. */
export const EMPTY_PROFILE: Profile = Object.freeze({ id: '', name: '', phone: '', role: 'titolare', photo: '', device: '' }) as Profile;

/** Limite della foto salvata (la quota dello storage del browser è la stessa dell'inventario). */
export const PHOTO_MAX_CHARS = 150_000;
const TEXT_MAX = 60;

const text = (v: unknown, max = TEXT_MAX) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Foto salvabile: `data:image/png|jpeg|webp;base64,…` entro il limite (la lunghezza prima dell'espressione). */
export const isProfilePhoto = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= PHOTO_MAX_CHARS && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);

export function normalizeProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_PROFILE };
  const r = raw as Record<string, unknown>;
  const photo = isProfilePhoto(r.photo) ? r.photo : '';
  return {
    id: text(r.id, 80),
    name: text(r.name),
    phone: text(r.phone, 30),
    role: isRole(r.role) ? r.role : 'titolare',
    photo,
    device: text(r.device),
  };
}

export const newProfileId = (): string =>
  `tel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Autore di un evento nuovo: id e nomi così come sono adesso (i vuoti non si scrivono; foto e telefono no). */
export function authorOf(p: Profile): EventAuthor {
  return { id: p.id, ...(p.name.trim() && { name: p.name.trim() }), ...(p.device.trim() && { device: p.device.trim() }) };
}

/** Riga «chi» della Cronologia: «Mario · Banco 1»; senza nomi «Questo telefono»; eventi di prima «—». */
export function authorText(author: EventAuthor | undefined): string {
  if (!author || typeof author !== 'object') return '—';
  const parts = [author.name, author.device].filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim());
  return parts.length ? parts.join(' · ') : 'Questo telefono';
}

/** Sottotitolo della voce «Accesso» in Impostazioni: lo stato, non la funzione. */
export function profileSubtitle(p: Profile): string {
  return p.name ? `${p.name} · ${roleName(p.role)}` : `${roleName(p.role)} · nome da scrivere`;
}
