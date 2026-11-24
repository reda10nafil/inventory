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
// - EDC (editor in tre domande e lettura veloce, in fondo): come si compila (`inputMode`, ruota `wheelValues`, «Scelgo o
//   scrivo» `typedChoice` / `appendOption`), come si vede (`choiceLook`, `lookFields`), valore predefinito (`defaultOf`,
//   `initialValues`), cambi di tipo (`typeChangeError`), lettura dal registro con ripiego sulla copia (`liveField`),
//   card (`cardFields`, `showInCardError`) e ricerca (`searchTexts`). Proprietà nuove tutte facoltative.
import type { CustomField, FieldUIType } from '../types';
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
  furTypes?: readonly { id: string; label: string; color?: string }[];
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
 * `dataset` resta allineato alle etichette. Un'etichetta che c'è solo in `dataset` (prima di VAL Aggiungi disegnava da
 * lì) non si perde: si aggiunge in fondo con l'id della sua posizione (`opt_<i>`, reso unico). Stesso oggetto se non
 * c'è nulla da cambiare (il registro si salva solo allora, una volta sola). I campi collegati e gli altri tipi restano.
 */
export function normalizeField<F extends CustomField>(field: F): F {
  if (!isChoiceField(field) || field.linkTo) return field;
  const options = fieldOptions(field);
  if (Array.isArray(field.options) && field.options.length > 0 && Array.isArray(field.dataset)) {
    const ids = new Set(options.map((o) => o.id));
    field.dataset.forEach((raw: unknown, i: number) => {
      const label = String(raw ?? '').trim();
      if (!label || options.some((o) => o.label === label)) return;
      let id = `opt_${i}`;
      for (let n = 2; ids.has(id); n += 1) id = `opt_${i}_${n}`;
      ids.add(id);
      options.push({ id, label });
    });
  }
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
  if (field.linkTo === 'furType') return (lists.furTypes ?? []).map(({ id, label, color }) => ({ id, label, ...(color && { color }) }));
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

/**
 * Errore per un nome che dei prodotti hanno ancora salvato come etichetta di **un'altra** opzione (rinominata): dopo
 * «M» → «Media», un valore nuovo «M» porterebbe via quei prodotti, perché l'etichetta di adesso viene prima della copia
 * (`optionOf`). `field` è il campo salvato (prima delle modifiche della bozza), `draft` le opzioni della bozza (per
 * dire il nome di adesso), `editingId` l'opzione che si rinomina (riprendere il proprio nome di prima va bene).
 */
export function retiredNameError(
  label: string,
  products: readonly { customData?: readonly { value: unknown; fieldSnapshot?: Pick<CustomField, 'id' | 'options' | 'dataset'> }[] }[],
  field: Pick<CustomField, 'id' | 'options' | 'dataset'> | null | undefined,
  draft: readonly FieldOption[],
  editingId?: string,
): string | null {
  const name = label.trim();
  if (!field || !name) return null;
  const options = fieldOptions(field);
  let count = 0;
  let owner: FieldOption | undefined;
  for (const p of products) {
    const entry = (p.customData || []).find((d) => d.fieldSnapshot?.id === field.id);
    if (!entry) continue;
    const hit = choiceList(entry.value)
      .filter((v) => v === name && !options.some((o) => o.id === v))
      .map((v) => optionOf(v, options, entry.fieldSnapshot))
      .find((o) => o && o.id !== editingId);
    if (!hit) continue;
    count += 1;
    owner = owner ?? hit;
  }
  if (!count || !owner) return null;
  const now = draft.find((o) => o.id === owner?.id)?.label ?? owner.label;
  return `Il nome "${name}" è ancora salvato in ${prodotti(count)} per il valore "${now}": scegline un altro, altrimenti quei prodotti passerebbero al valore nuovo.`;
}

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
export function formValue(field: Pick<CustomField, 'type' | 'uiType'> & { input?: CustomField['input'] }, value: unknown): unknown {
  // Anche la ruota: legge «2,5» come 2,5; se il campo torna «Lo scrivo io» in Modifica si vede con la virgola
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

// ── EDC: come si compila ─────────────────────────────────────

/** Massimo di caratteri di un testo breve (CAM-F9: «Max 100 caratteri» prima era scritto ma non applicato). */
export const SHORT_TEXT_MAX = 100;

export type InputMode = 'write' | 'choose' | 'choose_or_write' | 'stepper' | 'wheel';

/** Come si compila un campo: dai dati di sempre (`type`, `uiType`) più `input` (EDC). Le scelte collegate a una lista
 *  dell'app si scelgono soltanto; la ruota e il contatore valgono per i numeri. */
export function inputMode(field: Pick<CustomField, 'type' | 'uiType' | 'input' | 'linkTo'>): InputMode {
  if (isChoiceField(field)) return field.type === 'single_choice' && field.input === 'choose_or_write' && !field.linkTo ? 'choose_or_write' : 'choose';
  if (field.type !== 'number') return 'write';
  if (isStepper(field)) return 'stepper';
  return field.input === 'wheel' ? 'wheel' : 'write';
}

/** Valori della ruota (da, a, passo), al massimo `WHEEL_MAX_VALUES`. */
export const WHEEL_MAX_VALUES = 400;
export function wheelValues(range: StepperRange): number[] {
  const out: number[] = [];
  for (let i = 0; out.length < WHEEL_MAX_VALUES; i += 1) {
    const v = Math.round((range.min + i * range.step) * 1000) / 1000;
    if (v > range.max + 1e-9) break;
    out.push(v);
  }
  return out;
}

/**
 * Limiti scritti nell'editor (contatore e ruota: «da», «a», «passo», con la virgola) → limiti, oppure l'errore da dire.
 * La ruota ha al massimo `WHEEL_MAX_VALUES` valori.
 */
export function rangeFromText(text: { min: string; max: string; step: string }, wheel = false): { ok: true; range: StepperRange } | { ok: false; error: string } {
  const min = parseNumber(text.min);
  const max = parseNumber(text.max);
  const step = parseNumber(text.step);
  if (min === undefined || max === undefined || step === undefined) return { ok: false, error: 'Scrivi «da», «a» e «passo» con dei numeri, per esempio 80, 120 e 0,5.' };
  if (step <= 0) return { ok: false, error: 'Il passo deve essere più di zero.' };
  if (max < min) return { ok: false, error: '«a» deve essere uguale o più grande di «da».' };
  if (wheel && (max - min) / step + 1 > WHEEL_MAX_VALUES + 1e-9) {
    return { ok: false, error: `La ruota ha troppi valori: al massimo ${WHEEL_MAX_VALUES}. Aumenta il passo o stringi «da» e «a».` };
  }
  return { ok: true, range: { min, max, step } };
}

/** Misure Base disegnate con `FieldInput` (EDC, punto 4 del ticket 23): unità e segnaposto di sempre. L'altezza è
 *  di S2 (ticket 14), unita qui con l'Unione 1. */
export const MEASURE_UNITS: Record<string, string> = { length: 'cm', width: 'cm', weight: 'kg', height: 'cm' };
export const MEASURE_PLACEHOLDERS: Record<string, string> = { length: '85', width: '120', weight: '1,2', height: '40' };

/** Campo Base di una misura dal registro (con l'unità di sempre se manca), o quello di sempre se il registro non c'è. */
export function baseMeasureField(fields: readonly CustomField[], id: string): CustomField {
  const unit = MEASURE_UNITS[id];
  const found = fields.find((f) => f.id === id);
  if (found) return { ...found, unit: found.unit || unit, required: false };
  return { id, name: id, type: 'number', uiType: 'text', unit, required: false, order: 0, isSystem: true };
}

/** Valore di una misura nel modulo (testo con la virgola, come prima): la ruota dà un numero. */
export const measureText = (value: unknown): string =>
  typeof value === 'number' ? formatNumberInput(value) : value == null ? '' : String(value);

// ── EDC: come si vede (scelte) ───────────────────────────────

/** Aspetti di una scelta: binario orizzontale (`chips`), a capo, riquadri, elenco verticale, menu a tendina, elenco
 *  dal basso, ruota. */
export type ChoiceLook = 'tiles' | 'chips' | 'wrap' | 'list' | 'dropdown' | 'sheet' | 'wheel';
const NEW_LOOKS: readonly ChoiceLook[] = ['chips', 'wrap', 'list', 'dropdown', 'wheel'];

/** Aspetto di una scelta: quello salvato in `look`; altrimenti riquadri (`grid`, `segmented`: CAM-F8, erano uguali) o
 *  elenco dal basso (`picker`, `modal_list`). La ruota vale solo per la scelta di un valore. */
export function choiceLook(field: Pick<CustomField, 'uiType' | 'look'> & { type?: CustomField['type'] }): ChoiceLook {
  const look = field.look as ChoiceLook | undefined;
  if (look && NEW_LOOKS.includes(look) && !(look === 'wheel' && field.type === 'multi_choice')) return look;
  return field.uiType === 'picker' || field.uiType === 'modal_list' ? 'sheet' : 'tiles';
}

/**
 * `uiType` e `look` da salvare per l'aspetto scelto nell'editor. Lo stesso aspetto di prima non cambia nulla
 * (`segmented` e `modal_list` restano); gli aspetti nuovi tengono in `uiType` quello vecchio più vicino (le pillole
 * e l'elenco verticale i riquadri, tendina e ruota l'elenco dal basso), così tornando indietro (codice di prima di
 * EDC) il campo si disegna ancora.
 */
export function lookFields(look: ChoiceLook, current?: Pick<CustomField, 'uiType' | 'look'> | null): { uiType: FieldUIType; look: CustomField['look'] } {
  if (current && choiceLook(current) === look) return { uiType: current.uiType, look: current.look };
  if (look === 'tiles' || look === 'sheet') return { uiType: look === 'sheet' ? 'picker' : 'grid', look: undefined };
  return { uiType: look === 'dropdown' || look === 'wheel' ? 'picker' : 'grid', look };
}

/** Campi Base con l'aspetto scelto nell'editor (richiesta dell'utente del 24): Posizione e Tipo di pelle. */
export const BASE_LOOK_FIELDS: readonly string[] = ['location', 'furType'];
/** Aspetti dei campi Base: binario (predefinito), a capo, elenco verticale, menu a tendina, ruota. */
export const BASE_LOOKS: readonly ChoiceLook[] = ['chips', 'wrap', 'list', 'dropdown', 'wheel'];

/** Aspetto di un campo Base a pillole (Posizione, Tipo di pelle): quello salvato, altrimenti il **binario orizzontale**. */
export function baseLook(field: Pick<CustomField, 'look'> | undefined | null): ChoiceLook {
  const look = field?.look as ChoiceLook | undefined;
  return look && BASE_LOOKS.includes(look) ? look : 'chips';
}

/** Colori che l'utente può dare alle opzioni (pillola nella Scheda e nella card): si disegnano come un pallino con il
 *  bordo del tema, così il testo resta leggibile in tutti e 5 gli stili. */
export const OPTION_COLORS: readonly { color: string; name: string }[] = [
  { color: '#D64545', name: 'Rosso' },
  { color: '#E8833A', name: 'Arancio' },
  { color: '#E2B93B', name: 'Giallo' },
  { color: '#4CAF50', name: 'Verde' },
  { color: '#2E9E8F', name: 'Verde acqua' },
  { color: '#3B82F6', name: 'Blu' },
  { color: '#7C5CC4', name: 'Viola' },
  { color: '#D45A9A', name: 'Rosa' },
  { color: '#8D6E63', name: 'Marrone' },
  { color: '#9E9E9E', name: 'Grigio' },
  { color: '#212121', name: 'Nero' },
  { color: '#F5F5F5', name: 'Bianco' },
];

/** Icone che l'utente può dare alle opzioni. */
export const OPTION_ICONS: readonly string[] = [
  'star', 'favorite', 'check-circle', 'warning', 'verified', 'eco', 'ac-unit', 'wb-sunny', 'diamond', 'bolt',
  'local-shipping', 'build', 'straighten', 'palette', 'style', 'label',
];

// ── EDC: «Scelgo o scrivo» ───────────────────────────────────

/** Testo scritto in «Scelgo o scrivo»: l'id dell'opzione con lo stesso nome (maiuscole e accenti indifferenti),
 *  altrimenti il testo com'è (si salva così, senza diventare un'opzione); vuoto = nessun valore. */
export function typedChoice(text: string, options: readonly FieldOption[]): string | null {
  const name = text.trim();
  if (!name) return null;
  return options.find((o) => fold(o.label) === fold(name))?.id ?? name;
}

/** Testo libero di «Scelgo o scrivo» da mostrare nella casella: il valore salvato se non è un'opzione. */
export function freeText(value: unknown, options: readonly FieldOption[], snapshot?: OptionsSource | null): string {
  if (typeof value !== 'string' || !value) return '';
  return optionOf(value, options, snapshot) ? '' : value;
}

/** Campo con un'opzione nuova in fondo (dopo la conferma di «Aggiungi ai valori»): id nuovo, `dataset` allineato. */
export function appendOption<F extends CustomField>(field: F, label: string, id: string): F {
  const options = [...fieldOptions(field), { id, label: label.trim() }];
  return { ...field, options, dataset: options.map((o) => o.label) };
}

// ── EDC: valore predefinito ──────────────────────────────────

/**
 * Valore predefinito del campo nella forma salvata, se è ancora valido (testo, numero nei limiti del contatore o tra
 * i valori della ruota, Sì/No, id di un'opzione che c'è); altrimenti `undefined`. Date, foto, documenti, scelte
 * multiple e scelte collegate non ne hanno.
 */
export function defaultOf(field: Pick<CustomField, 'type' | 'uiType' | 'input' | 'linkTo' | 'dataset' | 'options' | 'defaultValue'>): string | number | boolean | undefined {
  const d = field.defaultValue;
  if (d === undefined || d === null || d === '') return undefined;
  switch (field.type) {
    case 'text_short':
      return typeof d === 'string' && d.trim() ? d.slice(0, SHORT_TEXT_MAX) : undefined;
    case 'text_long':
      return typeof d === 'string' && d.trim() ? d : undefined;
    case 'number':
    case 'currency': {
      const n = numberOf(d);
      if (n === undefined) return undefined;
      const mode = inputMode(field);
      if (mode === 'stepper') {
        const r = stepperRange(field);
        return n >= r.min && n <= r.max ? n : undefined;
      }
      if (mode === 'wheel') return wheelValues(stepperRange(field)).some((v) => Math.abs(v - n) < 1e-9) ? n : undefined;
      return n;
    }
    case 'boolean':
      return typeof d === 'boolean' ? d : undefined;
    case 'single_choice':
      return !field.linkTo && fieldOptions(field).some((o) => o.id === d) ? String(d) : undefined;
    default:
      return undefined;
  }
}

/** Tipi che possono avere un valore predefinito. */
export const takesDefault = (field: Pick<CustomField, 'type' | 'linkTo'>): boolean =>
  ['text_short', 'text_long', 'number', 'currency', 'boolean'].includes(field.type) || (field.type === 'single_choice' && !field.linkTo);

/**
 * Valori di partenza in Aggiungi per i campi del modulo: il contatore dal minimo (VAL, CAM-F3), poi il valore
 * predefinito al suo posto dove c'è, nella forma del modulo. Si salvano anche senza toccarli. Mai in Modifica.
 */
export function initialValues(fields: readonly CustomField[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...stepperDefaults(fields) };
  for (const f of fields) {
    const d = defaultOf(f);
    if (d !== undefined) out[f.id] = formValue(f, d);
  }
  return out;
}

// ── EDC: cambio di tipo (CAM-F10) ────────────────────────────

const TYPE_NAMES: Record<CustomField['type'], string> = {
  text_short: 'Testo breve', text_long: 'Testo lungo', number: 'Numero o misura', currency: 'Prezzo', date: 'Data',
  boolean: 'Sì/No', single_choice: 'Scelta da un elenco', multi_choice: 'Più scelte da un elenco', images: 'Foto', document: 'Documento',
};

/** Coppie di tipi in cui i valori salvati si leggono uguali (testo, numero, scelta una → più). */
const SAME_READING: [CustomField['type'], CustomField['type']][] = [
  ['text_short', 'text_long'], ['text_long', 'text_short'], ['number', 'currency'], ['currency', 'number'], ['single_choice', 'multi_choice'],
];

type WithData = { deletedAt?: string; customData?: readonly { value: unknown; fieldSnapshot?: Pick<CustomField, 'id'> }[] };
const entriesOf = (products: readonly WithData[], fieldId: string) =>
  products.flatMap((p) => (p.customData || []).filter((d) => d.fieldSnapshot?.id === fieldId && !isEmptyValue(d.value)));

/**
 * Errore del cambio di tipo, altrimenti null. Nessun valore salvato si converte: si cambia solo dove si leggono uguali
 * (testo breve ↔ lungo, numero ↔ prezzo, scelta una → più; più → una se nessun prodotto ne ha più di uno), oppure se
 * nessun prodotto (cestino compreso) ha un valore in quel campo.
 */
export function typeChangeError(field: Pick<CustomField, 'id' | 'name' | 'type'>, to: CustomField['type'], products: readonly WithData[]): string | null {
  if (field.type === to) return null;
  const entries = entriesOf(products, field.id);
  if (!entries.length) return null;
  if (SAME_READING.some(([a, b]) => a === field.type && b === to)) return null;
  const n = entries.length === 1 ? '1 prodotto ha' : `${entries.length} prodotti hanno`;
  if (field.type === 'multi_choice' && to === 'single_choice') {
    const many = entries.filter((d) => choiceList(d.value).length > 1).length;
    if (!many) return null;
    return `${many === 1 ? '1 prodotto ha' : `${many} prodotti hanno`} più di un valore in «${field.name}»: con un valore solo non si leggerebbero come adesso. Togli prima i valori in più.`;
  }
  return `${n} un valore in «${field.name}»: da ${TYPE_NAMES[field.type]} a ${TYPE_NAMES[to]} si leggerebbe in un altro modo. Crea un campo nuovo, oppure cambia solo tra testo breve e lungo, numero e prezzo, scelta di uno o più valori.`;
}

// ── EDC: lettura veloce (Scheda, card, ricerca) ──────────────

/** Campo con cui leggere un valore salvato: quello del registro, anche nel cestino (nome, icona, tipo, opzioni di
 *  adesso: CAM-F6); la copia salvata col prodotto solo se il campo non c'è più (eliminato per sempre o importato). */
export function liveField<F extends Pick<CustomField, 'id'>>(snapshot: F, registry: readonly F[]): F {
  return registry.find((f) => f.id === snapshot.id) ?? snapshot;
}

/** Un campo che si può mostrare nella card (testi lunghi, foto e documenti no). */
export const canShowInCard = (field: Pick<CustomField, 'type'>): boolean =>
  field.type !== 'text_long' && field.type !== 'images' && field.type !== 'document';

export const CARD_FIELDS_MAX = 2;

/** Campi con «Mostra nella card», al massimo `CARD_FIELDS_MAX`, nell'ordine del registro. Spento per tutti i campi di
 *  partenza: la card di sempre non cambia finché l'utente non ne accende uno. */
export function cardFields<F extends Pick<CustomField, 'type' | 'showInCard' | 'deletedAt'>>(fields: readonly F[]): F[] {
  return fields.filter((f) => f.showInCard && !f.deletedAt && canShowInCard(f)).slice(0, CARD_FIELDS_MAX);
}

/** Testo di un valore nella card: una data come data («24/11/2026», non il testo salvato), il resto come `valueText`. */
export function cardText(
  field: Pick<CustomField, 'type' | 'uiType' | 'unit'>,
  value: unknown,
  opts: { options?: readonly FieldOption[]; snapshot?: OptionsSource | null } = {},
): string {
  if (field.type === 'date' && typeof value === 'string' && value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return valueText(field, value, opts);
}

/** Campo ripristinato dal cestino: senza `deletedAt`; se la card ha già 2 campi accesi, senza «Mostra nella card». */
export function restoredField<F extends Pick<CustomField, 'id' | 'type' | 'showInCard' | 'deletedAt'>>(fields: readonly F[], field: F): F {
  const restored = { ...field, deletedAt: undefined };
  if (restored.showInCard && cardFields(fields.filter((f) => f.id !== field.id)).length >= CARD_FIELDS_MAX) restored.showInCard = undefined;
  return restored;
}

/** Errore per accendere «Mostra nella card» su un campo, altrimenti null. */
export function showInCardError(fields: readonly Pick<CustomField, 'id' | 'name' | 'type' | 'showInCard' | 'deletedAt'>[], field: Pick<CustomField, 'id' | 'type'>): string | null {
  if (!canShowInCard(field)) return 'Testi lunghi, foto e documenti non stanno nella card.';
  const others = cardFields(fields).filter((f) => f.id !== field.id);
  if (others.length < CARD_FIELDS_MAX) return null;
  return `Nella card ci stanno al massimo ${CARD_FIELDS_MAX} campi: spegni prima «Mostra nella card» in ${others.map((f) => `«${f.name}»`).join(' o ')}.`;
}

/**
 * Testi dei campi in cui la ricerca dell'Inventario cerca: il testo mostrato (scelte con l'etichetta di adesso, numeri
 * con la virgola e l'unità) dei testi brevi, dei numeri, dei prezzi e delle scelte scritte a mano. Non i campi collegati
 * a Posizioni, Categorie e Tipi di pelle (la ricerca guarda già i loro nomi sul prodotto), i testi lunghi, le date, il
 * Sì/No, le foto e i documenti.
 */
export function searchTexts(
  customData: readonly { value: unknown; fieldSnapshot?: CustomField }[] | undefined,
  registry: readonly CustomField[],
): string[] {
  const out: string[] = [];
  for (const entry of customData || []) {
    if (!entry.fieldSnapshot || isEmptyValue(entry.value)) continue;
    const field = liveField(entry.fieldSnapshot, registry);
    if (field.linkTo || !['text_short', 'number', 'currency', 'single_choice', 'multi_choice'].includes(field.type)) continue;
    const text = valueText(field, entry.value, { options: fieldOptions(field), snapshot: entry.fieldSnapshot });
    if (text) out.push(text);
  }
  return out;
}
