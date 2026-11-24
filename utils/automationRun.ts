// ESE (ticket 29): **esecuzione corretta delle automazioni personali**. Funzioni pure, con i test in
// `__tests__/automationRun.test.ts`. L'esecuzione (`CustomRunnerScreen`) chiede qui che cosa fa un passo sulla copia
// più recente del prodotto letto e scrive con le funzioni del contesto: spostamento e vendita con `moveProduct` e
// `sellProduct` (eventi «spostato» e «venduto», giacenza degli articoli a quantità), note e campi con `updateProduct`.
// - `runStep`: un passo d'azione → che cosa fare, oppure il rifiuto detto con il motivo (AU-V01…V06, P17);
// - `salePriceInput`: il prezzo scritto nella finestra della vendita, con la virgola (AU-V01);
// - `flowErrors`: che cosa non va in un flusso, per il costruttore (P16, AU-V06); `startError` per l'esecuzione;
// - `resumeIndex`, `loopIndex`: dove torna l'esecuzione dopo un rifiuto e a fine flusso;
// - `moveStepBy`, `canUseScannedLocation`: riordino dei passi e spunta «Usa l'ultima posizione» (AU-V12, AU-V06);
// - `fieldChoices`, `fieldOf`, `fieldValueOf`: «Imposta Campo» sui campi personalizzati, in `customData` (P17);
// - `automationsUsing`, `locationInUseText`: avviso eliminando una posizione usata da un passo «Sposta in» (AU-V05).
// Il formato delle automazioni salvate non cambia: «Imposta Campo» aggiunge solo la chiave facoltativa `fieldId`.
import type { CustomField, Product, ProductCustomData } from '../types';
import { moveOf, refusalText, saleOf } from './inventoryOps';
import { formatNumberInput, parseNumber } from './number';
import { fieldOptions, sameValue } from './fieldValues';
import { parseSalePrice, stockKey } from './stock';
import { placeWithShelf } from './shelves';

export interface RunStepConfig {
  locationId?: string;
  locationName?: string;
  tag?: string;
  /** Campo di «Imposta Campo» (ESE). Le automazioni di prima hanno solo `fieldName`, scritto a mano. */
  fieldId?: string;
  fieldName?: string;
  fieldValue?: string;
  pricePrompt?: boolean;
  useLastScannedLocation?: boolean;
}

/** Un passo salvato. `type` è una stringa qualunque: un'automazione salvata da una versione più nuova può avere tipi
 *  che questa non conosce, e l'esecuzione li deve rifiutare con un messaggio, non cadere. */
export interface RunStep {
  id?: string;
  type: string;
  label?: string;
  config?: RunStepConfig;
}

const KNOWN = ['scan_product', 'scan_location', 'move_to', 'mark_sold', 'add_tag', 'set_field'];

export const isKnownStep = (step: Pick<RunStep, 'type'>): boolean => KNOWN.includes(step.type);
export const isScanStep = (step: Pick<RunStep, 'type'>): boolean => step.type === 'scan_product' || step.type === 'scan_location';
/** «Sposta nella posizione letta»: solo con la spunta. Senza la chiave (automazioni scritte a mano) vale la posizione fissa. */
export const usesScannedLocation = (step: RunStep): boolean => step.type === 'move_to' && step.config?.useLastScannedLocation === true;

const fold = (value: string | undefined): string =>
  (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

// ── «Imposta Campo» (P17) ────────────────────────────────────

const SETTABLE: readonly string[] = ['text_short', 'text_long', 'number', 'currency', 'single_choice'];

/** I campi che «Imposta Campo» sa scrivere: personalizzati (non di sistema) e attivi, di testo, numero, valuta o scelta
 *  singola con le sue opzioni (non quelle collegate a posizioni o categorie). */
export function fieldChoices<F extends CustomField>(fields: readonly F[]): F[] {
  return fields.filter((f) => !f.isSystem && !f.deletedAt && SETTABLE.includes(f.type)
    && (f.type !== 'single_choice' || (!f.linkTo && fieldOptions(f).length > 0)));
}

/** Il campo di un passo: per id (passi nuovi); per le automazioni di prima, che hanno il nome scritto a mano, il campo
 *  con lo stesso nome (maiuscole e accenti indifferenti). `undefined` se non c'è (più). */
export function fieldOf<F extends CustomField>(config: RunStepConfig, fields: readonly F[]): F | undefined {
  const list = fieldChoices(fields);
  if (config.fieldId) return list.find((f) => f.id === config.fieldId);
  const name = fold(config.fieldName);
  return name ? list.find((f) => fold(f.name) === name) : undefined;
}

/**
 * Il valore di «Imposta Campo». `label` è quello da tenere nel passo e da mostrare (il testo scritto; per una scelta
 * l'etichetta dell'opzione, che si accetta anche per id); `value` è quello da salvare in `customData`, nella forma di
 * VAL (ticket 23), come Aggiungi e Modifica: per una scelta l'**id** dell'opzione, per numero e valuta il **numero**
 * («12,5» = 12,5; «1.200» = 1200). Nel passo resta il testo scritto, riletto con `parseNumber` («2,125» = 2,125).
 */
export function fieldValueOf(field: CustomField, raw: string | undefined): { ok: true; value: string | number; label: string } | { ok: false; error: string } {
  const text = (raw ?? '').trim();
  if (!text) return { ok: false, error: `Scrivi il valore di «${field.name}».` };
  if (field.type === 'number' || field.type === 'currency') {
    const n = parseNumber(text);
    if (n == null) return { ok: false, error: `«${text}» non è un numero (per esempio 12,5).` };
    return { ok: true, value: n, label: text };
  }
  if (field.type === 'single_choice') {
    const option = fieldOptions(field).find((o) => o.id === text || fold(o.label) === fold(text));
    return option ? { ok: true, value: option.id, label: option.label } : { ok: false, error: `«${text}» non è tra i valori di «${field.name}».` };
  }
  return { ok: true, value: text, label: text };
}

/** `customData` con il valore del campo: al suo posto se c'era, in fondo se no; la scheda del campo è quella di adesso. */
function withFieldValue(list: readonly ProductCustomData[], field: CustomField, value: unknown): ProductCustomData[] {
  const entry = { value, fieldSnapshot: field };
  const at = list.findIndex((d) => d.fieldSnapshot?.id === field.id);
  return at >= 0 ? list.map((d, i) => (i === at ? entry : d)) : [...list, entry];
}

// ── Esecuzione di un passo ───────────────────────────────────

export interface RunContext {
  /** Ultima posizione letta in questa esecuzione («Scansiona Posizione»). */
  locationId: string | null;
  /** S3 (scaffale come destinazione, da FLU1): lo scaffale letto con «Scansiona Posizione», se era uno scaffale; un
   *  «Sposta in» con la spunta «Usa l'ultima posizione» porta il prodotto su quello scaffale. */
  shelf?: { id: string; name: string } | null;
  /** Posizioni che esistono adesso. */
  locations: readonly { id: string; label: string }[];
  /** Campi personalizzati attivi (`useCustomFields().customFields`). */
  fields: readonly CustomField[];
  now: string;
}

export type StepOutcome =
  /** Note o campi: la schermata scrive `patch` con `updateProduct` (vuota se c'era già). */
  | { ok: true; op: 'patch'; patch: Partial<Product>; text: string }
  /** Spostamento possibile: la schermata chiama `moveProduct(id, to)` (`to` può essere `posizione/idScaffale`, S3). */
  | { ok: true; op: 'move'; to: string; text: string }
  /** Vendita al prezzo di listino: `sellProduct(id)`. */
  | { ok: true; op: 'sell'; text: string }
  /** Vendita con conferma del prezzo: la finestra si apre con `proposal` (listino con la virgola). */
  | { ok: true; op: 'ask_price'; proposal: string }
  | { ok: false; refusal: string };

const refuse = (refusal: string): StepOutcome => ({ ok: false, refusal });
const EDIT = 'modifica l\'automazione.';

/** Aggiunge «[tag]» in fondo alle note, a capo; `null` se il tag c'è già. Uguale nel Tagging di massa. */
export function notesWithTag(notes: string | undefined, tag: string): string | null {
  const current = notes || '';
  const entry = `[${tag}]`;
  if (current.includes(entry)) return null;
  return current ? `${current}\n${entry}` : entry;
}

/**
 * Che cosa fa un passo d'azione sul prodotto letto (la copia più recente: due passi di nota in fila vedono l'uno la
 * nota dell'altro, AU-V02). Un passo che non si può fare dà il motivo, e l'esecuzione non lo conta (AU-V03):
 * prodotto nel cestino (AU-V04), già venduto o esaurito, già in quella posizione, posizione del passo eliminata
 * (AU-V05), nessuna posizione letta (AU-V06), campo che non c'è più (P17), tipo di passo sconosciuto.
 */
export function runStep(product: Product | undefined, step: RunStep, ctx: RunContext): StepOutcome {
  const config = step.config ?? {};
  if (!isKnownStep(step)) {
    return refuse(`Passo sconosciuto («${step.type}»): questa automazione viene da una versione più nuova dell'app. Modificala per continuare.`);
  }
  if (isScanStep(step)) return refuse('Questo passo è una lettura.');
  if (!product) return refuse('Nessun prodotto letto: serve prima «Scansiona Prodotto».');
  if (product.deletedAt) return refuse(refusalText('trash', product.sku));

  switch (step.type) {
    case 'add_tag': {
      const tag = (config.tag ?? '').trim();
      if (!tag) return refuse(`Il passo non ha un tag: ${EDIT}`);
      const notes = notesWithTag(product.technicalNotes, tag);
      return notes == null
        ? { ok: true, op: 'patch', patch: {}, text: `🏷️ ${product.sku} ha già «${tag}»` }
        : { ok: true, op: 'patch', patch: { technicalNotes: notes }, text: `🏷️ Tag "${tag}" aggiunto` };
    }
    case 'set_field': {
      const field = fieldOf(config, ctx.fields);
      if (!field) return refuse(`Il campo «${config.fieldName || config.fieldId || '?'}» non c'è tra i campi personalizzati: ${EDIT}`);
      const v = fieldValueOf(field, config.fieldValue);
      if (!v.ok) return refuse(`${v.error} Poi ${EDIT}`);
      const current = (product.customData || []).find((d) => d.fieldSnapshot?.id === field.id);
      const text = `✏️ ${field.name} = ${v.label}`;
      // Lo stesso valore anche se salvato prima di VAL con l'etichetta o come testo («Buono» e il suo id, «12,5» e 12,5)
      if (current && sameValue(field, current.value, v.value, { options: fieldOptions(field), snapshots: [current.fieldSnapshot, field] })) {
        return { ok: true, op: 'patch', patch: {}, text };
      }
      return { ok: true, op: 'patch', patch: { customData: withFieldValue(product.customData || [], field, v.value) }, text };
    }
    case 'move_to': {
      const scanned = usesScannedLocation(step);
      const to = scanned ? ctx.locationId : config.locationId;
      if (!to) return refuse(scanned ? 'Nessuna posizione letta: serve prima «Scansiona Posizione».' : `Il passo non ha una posizione: ${EDIT}`);
      const place = ctx.locations.find((l) => l.id === to);
      if (!place) return refuse(scanned ? 'Posizione non trovata.' : `La posizione di questo passo non esiste più: ${EDIT}`);
      // S3: lo scaffale letto prima è la destinazione («Magazzino › A1»)
      const shelf = scanned ? ctx.shelf ?? undefined : undefined;
      const key = stockKey(to, shelf?.id);
      const where = placeWithShelf(place.label, shelf);
      const r = moveOf(product, key, ctx.now);
      // Già lì: niente da spostare e la catena continua, come prima di ESE (il prodotto è dove il passo lo vuole)
      if (!r.ok && r.reason === 'same_place') return { ok: true, op: 'patch', patch: {}, text: `📦 ${product.sku} è già in ${where}` };
      if (!r.ok) return refuse(refusalText(r.reason, product.sku));
      return { ok: true, op: 'move', to: key, text: `📦 Spostato in ${where}` };
    }
    case 'mark_sold': {
      // Prima della finestra del prezzo: un capo già venduto o nel cestino non la apre (AU-V03)
      const r = saleOf(product, undefined, 1, ctx.now);
      if (!r.ok) return refuse(refusalText(r.reason, product.sku));
      if (config.pricePrompt) return { ok: true, op: 'ask_price', proposal: formatNumberInput(product.sellPrice) };
      return { ok: true, op: 'sell', text: '💰 Venduto!' };
    }
    default:
      return refuse(`Passo sconosciuto («${step.type}»).`);
  }
}

/** Prezzo scritto nella finestra della vendita (AU-V01): «1300,50» = 1300,5; «5.900» = 5900; vuoto = listino. */
export function salePriceInput(input: string): { ok: true; price?: number } | { ok: false; refusal: string } {
  const price = parseSalePrice(input);
  if (price === null) return { ok: false, refusal: 'Scrivi un prezzo valido, per esempio 1300,50.' };
  return { ok: true, price };
}

// ── Il flusso ────────────────────────────────────────────────

export interface FlowContext {
  locations?: readonly { id: string }[];
  fields?: readonly CustomField[];
}

const FIRST_READ = 'Il primo passo deve essere una lettura: «Scansiona Prodotto» o «Scansiona Posizione».';

/**
 * Che cosa non va in un flusso (P16, AU-V06), un testo per errore; vuoto se si può salvare. Il primo passo è una
 * lettura; i passi d'azione vogliono un «Scansiona Prodotto» prima; «Sposta nella Posizione Scansionata» vuole un
 * «Scansiona Posizione» prima; con `locations` e `fields` anche le posizioni e i campi che non ci sono più.
 */
export function flowErrors(steps: readonly RunStep[], ctx: FlowContext = {}): string[] {
  if (steps.length === 0) return ['Aggiungi almeno uno step.'];
  const errors: string[] = [];
  if (!isScanStep(steps[0])) errors.push(FIRST_READ);
  let product = false;
  let place = false;
  steps.forEach((step, i) => {
    const n = `Passo ${i + 1}`;
    const name = step.label ? ` («${step.label}»)` : '';
    if (step.type === 'scan_product') { product = true; return; }
    if (step.type === 'scan_location') { place = true; return; }
    if (!isKnownStep(step)) { errors.push(`${n}: tipo sconosciuto («${step.type}»).`); return; }
    if (!product && i > 0) errors.push(`${n}${name}: serve prima «Scansiona Prodotto».`);
    if (usesScannedLocation(step) && !place) errors.push(`${n}${name}: «Sposta nella Posizione Scansionata» vuole prima «Scansiona Posizione».`);
    if (step.type === 'move_to' && !usesScannedLocation(step) && ctx.locations && !ctx.locations.some((l) => l.id === step.config?.locationId)) {
      errors.push(`${n}${name}: la posizione non esiste più.`);
    }
    if (step.type === 'set_field' && ctx.fields) {
      const field = fieldOf(step.config ?? {}, ctx.fields);
      const value = field ? fieldValueOf(field, step.config?.fieldValue) : null;
      if (!field) errors.push(`${n}${name}: il campo non c'è tra i campi personalizzati.`);
      else if (value && !value.ok) errors.push(`${n}${name}: ${value.error}`);
    }
  });
  return errors;
}

/** Perché un'automazione salvata non si può avviare (nessun passo o primo passo che non è una lettura, P16), o null. */
export function startError(steps: readonly RunStep[]): string | null {
  return steps.length === 0 || !isScanStep(steps[0]) ? 'Questa automazione non inizia con una lettura.' : null;
}

/** Dopo un rifiuto al passo `at`: l'ultimo «Scansiona Prodotto» prima (si legge il prodotto dopo), altrimenti l'ultima
 *  lettura prima, altrimenti il primo passo. */
export function resumeIndex(steps: readonly RunStep[], at: number): number {
  for (let i = Math.min(at, steps.length) - 1; i >= 0; i -= 1) if (steps[i].type === 'scan_product') return i;
  for (let i = Math.min(at, steps.length) - 1; i >= 0; i -= 1) if (isScanStep(steps[i])) return i;
  return 0;
}

/** A fine flusso si torna all'ultimo «Scansiona Prodotto» (lettura in fila); -1 se non c'è (l'automazione finisce). */
export function loopIndex(steps: readonly RunStep[]): number {
  for (let i = steps.length - 1; i >= 0; i -= 1) if (steps[i].type === 'scan_product') return i;
  return -1;
}

// ── Costruttore (AU-V12, AU-V06) ─────────────────────────────

/** Il passo `index` spostato di `delta` (−1 su, +1 giù), con `order` rinumerato; uguale se esce dai bordi. */
export function moveStepBy<S extends { order: number }>(steps: readonly S[], index: number, delta: number): S[] {
  const to = index + delta;
  if (index < 0 || index >= steps.length || to < 0 || to >= steps.length) return steps.map((s, i) => ({ ...s, order: i }));
  const next = [...steps];
  const [moved] = next.splice(index, 1);
  next.splice(to, 0, moved);
  return next.map((s, i) => ({ ...s, order: i }));
}

/** «Usa l'ultima posizione scansionata» si può scegliere solo se prima del passo c'è un «Scansiona Posizione». */
export function canUseScannedLocation(steps: readonly Pick<RunStep, 'type'>[], index: number): boolean {
  return steps.slice(0, Math.max(0, index)).some((s) => s.type === 'scan_location');
}

// ── Posizioni eliminate (AU-V05) ─────────────────────────────

/** Le automazioni con un passo «Sposta in» verso la posizione `locationId`. */
export function automationsUsing<A extends { name: string; steps: readonly RunStep[] }>(automations: readonly A[], locationId: string): A[] {
  return automations.filter((a) => a.steps.some((s) => s.type === 'move_to' && !usesScannedLocation(s) && s.config?.locationId === locationId));
}

/** Avviso nella conferma dell'eliminazione di una posizione usata da automazioni; '' se nessuna la usa. */
export function locationInUseText(names: readonly string[]): string {
  if (names.length === 0) return '';
  const list = names.map((n) => `«${n}»`).join(', ');
  const who = names.length === 1 ? `L'automazione ${list} la usa` : `Le automazioni ${list} la usano`;
  return `${who} in un passo «Sposta in»: dopo l'eliminazione quel passo si rifiuta finché non modifichi l'automazione.`;
}
