// Fornitori e clienti (M10, ticket 07): anagrafica minima per spazio. Funzioni pure: il contesto e le schermate
// le chiamano. Nei movimenti resta solo l'id del contatto (`contactId` negli eventi `stock`), mai una copia del nome.
import type { MovementKind, TimelineEvent } from '../types';

export type ContactKind = 'fornitore' | 'cliente';

export interface Contact {
  /** Opaco e per sempre: non dipende dal nome (vedi `newContactId`). */
  id: string;
  name: string;
  kind: ContactKind;
  phone?: string;
  email?: string;
  note?: string;
}

/** Dati del modulo, senza id. */
export type ContactInput = Omit<Contact, 'id'>;
export type ContactFilter = 'tutti' | ContactKind;

export const CONTACT_KINDS: readonly ContactKind[] = ['fornitore', 'cliente'];
export const CONTACT_KIND_LABELS: Record<ContactKind, string> = { fornitore: 'Fornitore', cliente: 'Cliente' };
/** Icona del tipo (nomi di `AppIcon`), uguale nell'elenco e nelle pillole di Movimenta. */
export const CONTACT_KIND_ICONS: Record<ContactKind, string> = { fornitore: 'local-shipping', cliente: 'person' };

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const isKind = (value: unknown): value is ContactKind => value === 'fornitore' || value === 'cliente';
// Maiuscole e accenti indifferenti: «Àncora» e «ancora» sono lo stesso nome.
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
const byName = (a: Contact, b: Contact) => fold(a.name).localeCompare(fold(b.name)) || a.id.localeCompare(b.id);

/** Dati del modulo puliti: spazi tolti, campi facoltativi vuoti non salvati. */
export function contactData(input: ContactInput): ContactInput {
  const phone = text(input.phone);
  const email = text(input.email);
  const note = text(input.note);
  return { name: text(input.name), kind: input.kind, ...(phone && { phone }), ...(email && { email }), ...(note && { note }) };
}

/**
 * Lista salvata → contatti. Assente o rovinata → elenco vuoto (chi legge non scrive nulla). Le voci malformate
 * (senza id o nome, tipo sconosciuto, id già visto, non oggetti) si scartano una per una, senza eccezioni.
 */
export function parseContacts(raw: string | null | undefined): Contact[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const list: Contact[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const id = text(item.id);
    const name = text(item.name);
    if (!id || !name || !isKind(item.kind) || seen.has(id)) continue;
    seen.add(id);
    list.push({ id, ...contactData({ name, kind: item.kind, phone: text(item.phone), email: text(item.email), note: text(item.note) }) });
  }
  return list;
}

/**
 * Id di un contatto nuovo, generato come quello dei prodotti (`istante-casuale`) e **non** dal nome: resta per
 * sempre negli eventi, e un id derivato dal nome, dopo un'eliminazione o con un omonimo, attaccherebbe i movimenti
 * vecchi a un contatto nuovo.
 */
export function newContactId(existing: readonly Pick<Contact, 'id'>[], now: number = Date.now(), random: number = Math.random()): string {
  const ids = new Set(existing.map((c) => c.id));
  const base = `${now}-${random.toString(36).slice(2, 11) || '0'}`;
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Errore per un contatto nuovo o modificato (`editingId` = quello che si modifica), altrimenti null.
 * Il doppione si controlla **per tipo**: la stessa ditta fornitore e cliente sono due voci.
 */
export function contactNameError(name: string, kind: ContactKind, existing: readonly Contact[], editingId?: string): string | null {
  const clean = name.trim();
  if (!clean) return 'Inserisci un nome per il contatto';
  if (existing.some((c) => c.id !== editingId && c.kind === kind && fold(c.name) === fold(clean))) {
    return `Esiste già il ${CONTACT_KIND_LABELS[kind].toLocaleLowerCase()} "${clean}"`;
  }
  return null;
}

/** Elenco per la schermata: tutti, solo fornitori o solo clienti, in ordine di nome. */
export function filterContacts(contacts: readonly Contact[], filter: ContactFilter): Contact[] {
  return contacts.filter((c) => filter === 'tutti' || c.kind === filter).sort(byName);
}

/**
 * Contatti da proporre nella finestra Movimenta: prima quelli del tipo suggerito (carico → fornitori,
 * scarico → clienti), poi gli altri, senza toglierne nessuno: un reso in carico viene da un cliente.
 * Trasferimento e rettifica non hanno contatto.
 */
export function contactsForMovement(contacts: readonly Contact[], kind: MovementKind): Contact[] {
  if (kind !== 'carico' && kind !== 'scarico') return [];
  const suggested: ContactKind = kind === 'carico' ? 'fornitore' : 'cliente';
  return [...contacts].sort((a, b) => Number(b.kind === suggested) - Number(a.kind === suggested) || byName(a, b));
}

/** Nome del contatto; `undefined` se l'id non è in elenco (chi chiama sceglie il ripiego: il CSV scrive l'id). */
export function contactName(contacts: readonly Contact[], id: string | undefined): string | undefined {
  return id ? contacts.find((c) => c.id === id)?.name : undefined;
}

/** «Fornitore Rossi», «Cliente Bianchi» per il testo dei movimenti; `undefined` se l'id non è in elenco. */
export function contactLabel(contacts: readonly Contact[], id: string | undefined): string | undefined {
  const contact = id ? contacts.find((c) => c.id === id) : undefined;
  return contact ? `${CONTACT_KIND_LABELS[contact.kind]} ${contact.name}` : undefined;
}

// Un solo filtro per «i suoi movimenti» e per «usato»: gli eventi `stock` con quel contatto.
const contactIdOf = (event: Pick<TimelineEvent, 'type' | 'details'>): string | undefined =>
  (event.type === 'stock' && event.details?.contactId) || undefined;

/**
 * Movimenti di un contatto, nell'ordine della Cronologia. Anche quelli dei prodotti nel cestino o eliminati per
 * sempre: i loro eventi restano in Cronologia («Prodotto eliminato») e nel report dei movimenti.
 */
export function contactEvents<T extends Pick<TimelineEvent, 'type' | 'details'>>(timeline: readonly T[], contactId: string): T[] {
  return timeline.filter((event) => contactIdOf(event) === contactId);
}

/** Quanti movimenti ha ogni contatto (id → numero): un contatto usato non si elimina. */
export function contactUsage(timeline: readonly Pick<TimelineEvent, 'type' | 'details'>[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of timeline) {
    const id = contactIdOf(event);
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Perché un contatto non si può eliminare (`used` = i suoi movimenti), altrimenti null. */
export function contactDeleteError(contact: Pick<Contact, 'name'>, used: number): string | null {
  if (used <= 0) return null;
  const count = used === 1 ? '1 movimento' : `${used} movimenti`;
  return `"${contact.name}" compare in ${count}: non si può eliminare, altrimenti quei movimenti resterebbero senza nome. Puoi modificarlo.`;
}
