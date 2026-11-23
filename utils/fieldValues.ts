// VAL (ticket 23): **valori dei campi personalizzati**. Funzioni pure, con i test in `__tests__/fieldValues.test.ts`.
// Le usano il disegnatore unico dei campi (`components/FieldInput.tsx`, Aggiungi e Modifica), la Scheda, la Cronologia
// (`utils/productChanges.ts`), Campi Personalizzati (editor delle opzioni) e «Imposta Campo» delle automazioni.
// - Opzioni a **id stabili** (CAM-F1): `fieldOptions` legge le opzioni di un campo (gli id di sempre, mai rinumerati;
//   `opt_<posizione>` a un campo che ha solo le etichette), `normalizeField` le scrive una volta nel registro,
//   `newOptionId` dà l'id di un'opzione nuova (mai una posizione, mai riusato).
// - Valori salvati: le scritture nuove salvano l'**id** dell'opzione (i tipi di pelle collegati, punto 7, il loro id;
//   Posizioni e Categorie collegate ancora il nome) e i **numeri come numero** (CAM-F2). I valori di prima (etichette,
//   numeri scritti come testo) si leggono senza riscriverli: `optionOf` trova l'opzione di un'etichetta anche
//   rinominata, passando dalla copia del campo salvata col prodotto (`fieldSnapshot`).
// - Contatore (CAM-F3): `stepperRange`, `stepFrom`, `stepperDefaults` (in Aggiungi il minimo è il valore vero, salvato).
// - Modulo: `formValue` (valore salvato → modulo), `savedValue` (modulo → valore da salvare, con il rifiuto di un numero
//   sbagliato), `sameValue` (lo stesso valore scritto in due forme), `valueText` (testo da mostrare).
import type { CustomField } from '../types';
import { formatNumber, formatNumberInput, parseNumber } from './number';
import { formatPrice } from './price';
import { isEmptyValue } from './formValidation';

export interface FieldOption {
  id: string;
  label: string;
  color?: string;
  icon?: string;
}

type OptionsSource = Pick<CustomField, 'options' | 'dataset'>;
type Lists = {
  locations?: readonly { id: string; label: string }[];
  categories?: readonly { id: string; label: string }[];
  furTypes?: readonly { id: string; label: string }[];
};

export const isChoiceField = (field: Pick<CustomField, 'type'>): boolean =>
  field.type === 'single_choice' || field.type === 'multi_choice';
export const isNumberField = (field: Pick<CustomField, 'type'>): boolean => field.type === 'number' || field.type === 'currency';
export const isStepper = (field: Pick<CustomField, 'type' | 'uiType'>): boolean => field.uiType === 'stepper';

// ── Opzioni ──────────────────────────────────────────────────

/**
 * Opzioni di un campo a scelta scritte a mano. `options` è la fonte e i suoi id restano quelli salvati (vincolo 2 di
 * `map-3.md`: mai rinumerare); un campo che ha solo `dataset` (le etichette) riceve `opt_<posizione>`, la forma che
 * l'editor ha sempre dato. Etichette vuote saltate, id doppi resi unici.
 */
export function fieldOptions(field: OptionsSource | undefined | null): FieldOption[] {
  if (!field) return [];
  const own = Array.isArray(field.options) && field.options.length > 0 ? field.options : null;
  const source: unknown[] = own ?? (Array.isArray(field.dataset) ? field.dataset.map((label: unknown, i: number) => ({ id: `opt_${i}`, label })) : []);
  const ids = new Set<string>();
  const out: FieldOption[] = [];
  source.forEach((item, i) => {
    const o = (item && typeof item === 'object' ? item : { label: item }) as { id?: unknown; label?: unknown; color?: unknown; icon?: unknown };
    const rawId = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `opt_${i}`;
    const label = String(o.label ?? (typeof o.id === 'string' ? o.id : '') ?? '').trim();
    if (!label) return;
    let id = rawId;
    for (let n = 2; ids.has(id); n += 1) id = `${rawId}_${n}`;
    ids.add(id);
    out.push({ id, label, ...(typeof o.color === 'string' && o.color && { color: o.color }), ...(typeof o.icon === 'string' && o.icon && { icon: o.icon }) });
  });
  return out;
}

/**
 * Campo del registro letto: per un campo a scelta scritto a mano `options` diventa la fonte (con gli id di sempre) e
 * `dataset` resta allineato alle etichette. Stesso oggetto se non c'è nulla da cambiare (il registro si salva solo
 * allora, una volta sola). I campi collegati a una lista dell'app e gli altri tipi restano come sono.
 */
export function normalizeField<F extends CustomField>(field: F): F {
  if (!isChoiceField(field) || field.linkTo) return field;
  const options = fieldOptions(field);
  if (!options.length) return field;
  const dataset = options.map((o) => o.label);
  if (JSON.stringify(field.options) === JSON.stringify(options) && JSON.stringify(field.dataset) === JSON.stringify(dataset)) return field;
  return { ...field, options, dataset };
}

/** Id per un'opzione nuova: non è una posizione e non si riusa mai, così un valore salvato non passa a un'altra opzione. */
export function newOptionId(existing: readonly { id: string }[], now: number = Date.now(), random: () => number = Math.random): string {
  const ids = new Set(existing.map((o) => o.id));
  let id = '';
  do id = `opt_${now}_${random().toString(36).slice(2, 6) || '0'}`; while (ids.has(id));
  return id;
}

/** Opzioni da mostrare: quelle del campo, oppure la lista dell'app a cui è collegato (Posizioni, Categorie, Tipi di pelle). */
export function choiceOptions(field: Pick<CustomField, 'options' | 'dataset' | 'linkTo'>, lists: Lists = {}): FieldOption[] {
  if (field.linkTo === 'locations') return (lists.locations ?? []).map(({ id, label }) => ({ id, label }));
  if (field.linkTo === 'libraries') return (lists.categories ?? []).map(({ id, label }) => ({ id, label }));
  if (field.linkTo === 'furType') return (lists.furTypes ?? []).map(({ id, label }) => ({ id, label }));
  return fieldOptions(field);
}

/** Le scelte collegate a Posizioni e Categorie salvano ancora il nome, come prima di VAL: una posizione o una categoria
 *  si eliminano senza guardare i campi, e un id resterebbe senza nome. Le altre salvano l'id. */
export const savesLabel = (field: Pick<CustomField, 'linkTo'>): boolean => field.linkTo === 'locations' || field.linkTo === 'libraries';

// ── Valori delle scelte ──────────────────────────────────────

/** Valori di una scelta, anche se una multipla è stata salvata da singola. */
export function choiceList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' || typeof v === 'number').map(String);
  return typeof value === 'string' || typeof value === 'number' ? (String(value) ? [String(value)] : []) : [];
}

/**
 * Opzione di un valore salvato, nell'ordine: 1. l'id di un'opzione di adesso; 2. l'etichetta di un'opzione di adesso
 * (i valori salvati prima di VAL sono etichette); 3. l'etichetta nella copia del campo salvata col prodotto
 * (`snapshot`): il suo id porta all'opzione di adesso, anche rinominata («M» → «Media»). Altrimenti nessuna.
 * L'etichetta di adesso viene prima della copia: prima di VAL l'editor rinumerava le opzioni a ogni eliminazione, e
 * l'id di una copia vecchia può indicare un'altra opzione.
 */
export function optionOf(value: unknown, options: readonly FieldOption[], snapshot?: OptionsSource | null): FieldOption | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const v = String(value);
  if (!v) return undefined;
  const byId = options.find((o) => o.id === v);
  if (byId) return byId;
  const byLabel = options.find((o) => o.label === v);
  if (byLabel) return byLabel;
  if (!snapshot) return undefined;
  const old = fieldOptions(snapshot).find((o) => o.label === v);
  return old ? options.find((o) => o.id === old.id) : undefined;
}

/** Etichetta da mostrare per un valore di una scelta: quella di adesso; per un'opzione che non c'è più, quella della
 *  copia salvata col prodotto; altrimenti il valore com'è. */
export function choiceLabel(value: unknown, options: readonly FieldOption[], snapshot?: OptionsSource | null): string {
  const option = optionOf(value, options, snapshot);
  if (option) return option.label;
  const v = String(value ?? '');
  return fieldOptions(snapshot).find((o) => o.id === v)?.label ?? v;
}

export function isSelected(value: unknown, option: FieldOption, options: readonly FieldOption[], snapshot?: OptionsSource | null): boolean {
  return choiceList(value).some((v) => optionOf(v, options, snapshot)?.id === option.id);
}

/**
 * Valore dopo il tocco di un'opzione: la singola si sceglie o si toglie, la multipla aggiunge o toglie. Si salva l'id
 * (con `byLabel` il nome, per Posizioni e Categorie); in una multipla toccata anche le etichette di prima diventano
 * id, e un valore che non è più un'opzione resta com'è.
 */
export function toggleOption(
  value: unknown,
  option: FieldOption,
  options: readonly FieldOption[],
  multi: boolean,
  { snapshot, byLabel = false }: { snapshot?: OptionsSource | null; byLabel?: boolean } = {},
): string | string[] | null {
  const save = (o: FieldOption) => (byLabel ? o.label : o.id);
  const selected = isSelected(value, option, options, snapshot);
  if (!multi) return selected ? null : save(option);
  const list = [...new Set(choiceList(value).map((v) => {
    const o = optionOf(v, options, snapshot);
    return o ? save(o) : v;
  }))];
  return selected ? list.filter((v) => v !== save(option)) : [...list, save(option)];
}

// ── Editor delle opzioni (Campi Personalizzati, `OptionsEditor`) ──

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

/** Prodotti (cestino compreso) che hanno scelto l'opzione `optionId` del campo, anche con l'etichetta di prima. */
export function optionUsage(
  products: readonly { deletedAt?: string; customData?: readonly { value: unknown; fieldSnapshot?: Pick<CustomField, 'id' | 'options' | 'dataset'> }[] }[],
  field: Pick<CustomField, 'id' | 'options' | 'dataset'>,
  optionId: string,
): { active: number; trashed: number } {
  const options = fieldOptions(field);
  let active = 0;
  let trashed = 0;
  for (const p of products) {
    const entry = (p.customData || []).find((d) => d.fieldSnapshot?.id === field.id);
    if (!entry || !choiceList(entry.value).some((v) => optionOf(v, options, entry.fieldSnapshot)?.id === optionId)) continue;
    if (p.deletedAt) trashed += 1;
    else active += 1;
  }
  return { active, trashed };
}

/** Errore del nome di un valore (vuoto o già usato, maiuscole e accenti indifferenti), altrimenti null. */
export function optionNameError(label: string, options: readonly FieldOption[], editingId?: string): string | null {
  const name = label.trim();
  if (!name) return 'Inserisci il nome del valore.';
  if (options.some((o) => o.id !== editingId && fold(o.label) === fold(name))) return `Esiste già il valore "${name}".`;
  return null;
}

const prodotti = (n: number) => (n === 1 ? '1 prodotto' : `${n} prodotti`);

/** Errore per eliminare un valore, altrimenti null: ne deve restare uno; un valore usato da un prodotto (anche nel
 *  cestino) non si elimina, si rinomina (il prodotto resterebbe con un valore che non è più tra quelli del campo). */
export function optionDeleteError(options: readonly FieldOption[], id: string, used: { active: number; trashed: number }): string | null {
  if (options.length <= 1) return 'Deve restare almeno un valore.';
  const n = used.active + used.trashed;
  if (!n) return null;
  const label = options.find((o) => o.id === id)?.label ?? id;
  const trash = used.trashed ? (used.active ? ` (${used.trashed} nel cestino)` : ' (nel cestino)') : '';
  return `Il valore "${label}" è usato da ${prodotti(n)}${trash}. Rinominalo, oppure cambia il valore di quei prodotti prima di eliminarlo.`;
}

/** Campi segnati da un salvataggio rifiutato: obbligatori vuoti e numeri sbagliati. */
export interface FlaggedFields { missing: readonly string[]; wrong: readonly string[] }
export const NO_FLAGS: FlaggedFields = { missing: [], wrong: [] };

/** Riga sotto il campo dopo un salvataggio rifiutato; sparisce appena il campo è a posto. */
export function fieldError(field: Pick<CustomField, 'id' | 'type' | 'uiType'>, value: unknown, flagged: FlaggedFields): string | undefined {
  if (flagged.missing.includes(field.id) && isEmptyValue(value)) return 'Campo obbligatorio: compilalo per salvare.';
  if (flagged.wrong.includes(field.id) && !savedValue(field, value).ok) return 'Scrivi un numero, per esempio 12,5.';
  return undefined;
}

// ── Numeri ───────────────────────────────────────────────────

/** Numero di un valore salvato: un numero com'è; il testo (i valori di prima, scritti in Aggiungi) con `parseNumber`
 *  («12,50» = 12,5; «1.250,00» = 1250). `undefined` se non è un numero. */
export function numberOf(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  return typeof value === 'string' ? parseNumber(value) : undefined;
}

// ── Contatore ────────────────────────────────────────────────

export interface StepperRange { min: number; max: number; step: number }

/** Limiti del contatore (`dataset: { min, max, step }`); senza, 0-100 di 1 come prima. */
export function stepperRange(field: Pick<CustomField, 'dataset'>): StepperRange {
  const d = field.dataset && typeof field.dataset === 'object' && !Array.isArray(field.dataset) ? field.dataset : {};
  const n = (v: unknown, fallback: number) => numberOf(v) ?? fallback;
  const min = n(d.min, 0);
  const max = Math.max(min, n(d.max, 100));
  const step = n(d.step, 1) > 0 ? n(d.step, 1) : 1;
  return { min, max, step };
}

/** Valore dopo «+» (1) o «−» (-1). Senza valore (un prodotto salvato prima del campo) parte dal minimo. */
export function stepFrom(value: unknown, range: StepperRange, direction: 1 | -1): number {
  const current = numberOf(value);
  if (current === undefined) return range.min;
  const next = Math.round((current + direction * range.step) * 1000) / 1000;
  return Math.min(range.max, Math.max(range.min, next));
}

/** In Aggiungi il contatore parte dal minimo, che è il valore vero e si salva anche senza toccarlo (CAM-F3). */
export function stepperDefaults(fields: readonly Pick<CustomField, 'id' | 'type' | 'uiType' | 'dataset'>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of fields) if (f.type === 'number' && isStepper(f)) out[f.id] = stepperRange(f).min;
  return out;
}

// ── Modulo ───────────────────────────────────────────────────

/** Valore salvato → valore del modulo: un numero scritto con la virgola (12.5 → «12,5»), il contatore come numero,
 *  il resto com'è (le scelte restano id o etichette: le riconosce `optionOf`). */
export function formValue(field: Pick<CustomField, 'type' | 'uiType'>, value: unknown): unknown {
  if (isNumberField(field) && !isStepper(field) && typeof value === 'number') return formatNumberInput(value);
  return value;
}

/**
 * Valore del modulo → valore da salvare. Numeri e valuta come numero (`parseNumber`: «12,50» = 12,5); un numero
 * vuoto non si salva (`value: undefined`); un testo che non è un numero si rifiuta. Contatore come numero. Il resto com'è.
 */
export function savedValue(field: Pick<CustomField, 'type' | 'uiType'>, value: unknown): { ok: true; value: unknown } | { ok: false } {
  if (!isNumberField(field)) return { ok: true, value };
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) return { ok: true, value: undefined };
  const n = numberOf(value);
  return n === undefined ? { ok: false } : { ok: true, value: n };
}

/** I campi numerici del modulo con un testo che non è un numero (si dice prima di salvare). */
export function invalidNumberFields<F extends Pick<CustomField, 'id' | 'type' | 'uiType'>>(fields: readonly F[], values: Record<string, unknown>): F[] {
  return fields.filter((f) => f.id in values && !savedValue(f, values[f.id]).ok);
}

const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Lo stesso valore scritto in due forme? Scelte per opzione (l'etichetta di prima e l'id valgono uguale), numeri per
 * valore («3» e 3), il resto com'è; vuoto e assente uguali. `options` sono quelle di adesso, `snapshots` le copie del
 * campo salvate con i due valori.
 */
export function sameValue(
  field: Pick<CustomField, 'type' | 'uiType'>,
  a: unknown,
  b: unknown,
  { options = [], snapshots = [] }: { options?: readonly FieldOption[]; snapshots?: readonly (OptionsSource | null | undefined)[] } = {},
): boolean {
  if (empty(a) && empty(b)) return true;
  if (isChoiceField(field)) {
    const key = (v: unknown, snap?: OptionsSource | null) => choiceList(v).map((x) => optionOf(x, options, snap)?.id ?? `=${x}`);
    const ka = key(a, snapshots[0]);
    const kb = key(b, snapshots[1] ?? snapshots[0]);
    return field.type === 'multi_choice'
      ? JSON.stringify([...ka].sort()) === JSON.stringify([...kb].sort())
      : JSON.stringify(ka) === JSON.stringify(kb);
  }
  if (isNumberField(field)) {
    const na = numberOf(a);
    const nb = numberOf(b);
    if (na !== undefined || nb !== undefined) return na === nb;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Testo da mostrare per un valore (Scheda, Cronologia, finestra delle scelte): scelte con l'etichetta di adesso,
 * numeri con la virgola e l'unità, valuta «12,50 €», Sì/No. Un numero che non si legge resta com'è.
 */
export function valueText(
  field: Pick<CustomField, 'type' | 'uiType' | 'unit'>,
  value: unknown,
  { options = [], snapshot }: { options?: readonly FieldOption[]; snapshot?: OptionsSource | null } = {},
): string {
  if (empty(value)) return '';
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (isChoiceField(field) || Array.isArray(value)) return choiceList(value).map((v) => choiceLabel(v, options, snapshot)).join(', ');
  const unit = field.unit ? ` ${field.unit}` : '';
  if (field.type === 'currency') {
    const n = numberOf(value);
    return n === undefined ? String(value) : formatPrice(n);
  }
  if (field.type === 'number') {
    const n = numberOf(value);
    return `${n === undefined ? String(value) : formatNumber(n)}${unit}`;
  }
  return `${String(value)}${unit}`;
}
