// Modelli del modulo di Aggiungi (27/11/2026): il pulsante in alto a destra fa scegliere tra il modulo attuale
// (pellicce, quello del layout salvato) e un modello di settore con i suoi campi raggruppati. Il modello non cambia il
// layout salvato: costruisce in memoria l'elenco dei campi da mostrare. I campi personalizzati che mancano si creano
// nel registro quando si sceglie il modello (stesso nome e stesso tipo = stesso campo).
import type { CustomField } from '../types';
import type { FieldSize, LayoutField } from '../contexts/LayoutContext';

export type FormModelId = 'attuale' | 'borse';

type FieldDef = Omit<CustomField, 'id' | 'order'>;
type Entry =
  | { section: string }
  | { base: string; size: FieldSize }
  | { field: FieldDef; size: FieldSize };

const opts = (labels: string[]) => labels.map((label) => ({
  id: label.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
  label,
}));

const choice = (name: string, labels: string[], icon: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  name, type: 'single_choice', uiType: 'grid', look: 'chips', icon, required: false, options: opts(labels), dataset: labels, ...extra,
});
const multi = (name: string, labels: string[], icon: string): FieldDef => ({
  name, type: 'multi_choice', uiType: 'grid', look: 'wrap', icon, required: false, options: opts(labels), dataset: labels,
});
const yesNo = (name: string, icon = 'check-circle'): FieldDef => ({ name, type: 'boolean', uiType: 'text', icon, required: false });
const num = (name: string, unit: string, icon: string): FieldDef => ({ name, type: 'number', uiType: 'text', unit, icon, required: false });
const text = (name: string, icon: string): FieldDef => ({ name, type: 'text_short', uiType: 'text', icon, required: false });

const BORSE: Entry[] = [
  { base: 'images', size: 'full' },
  { section: 'Informazioni generali' },
  { base: 'sku', size: 'full' },
  { field: text('Prodotto', 'shopping-bag'), size: 'full' },
  { field: choice('Categoria', ['Pelletteria'], 'category', { defaultValue: 'pelletteria' }), size: 'medium' },
  { field: choice('Origine', ['Made in Italy'], 'flag', { defaultValue: 'made_in_italy' }), size: 'medium' },
  { field: multi("Destinazione d'uso", ['Uso quotidiano', 'Business', 'Tempo libero'], 'event-available'), size: 'full' },
  { base: 'location', size: 'medium' },
  { base: 'folder', size: 'medium' },
  { section: 'Prezzi' },
  { base: 'purchasePrice', size: 'medium' },
  { base: 'sellPrice', size: 'medium' },
  { section: 'Materiali' },
  { field: choice('Esterno', ['Pelle pieno fiore'], 'texture', { defaultValue: 'pelle_pieno_fiore' }), size: 'full' },
  { field: choice('Fodera', ['Cotone', 'Microfibra'], 'layers'), size: 'full' },
  { field: choice('Finiture metalliche', ['Ottone', 'Zama galvanizzata'], 'hardware'), size: 'full' },
  { field: choice('Chiusura', ['Zip metallica', 'Magnetica'], 'lock'), size: 'full' },
  { section: 'Caratteristiche tecniche' },
  { field: yesNo('Lavorazione artigianale italiana', 'handyman'), size: 'full' },
  { field: yesNo('Cuciture rinforzate', 'gesture'), size: 'full' },
  { field: yesNo('Bordi rifiniti e dipinti a mano', 'brush'), size: 'full' },
  { field: yesNo('Tracolla regolabile e rimovibile', 'swap-vert'), size: 'full' },
  { field: yesNo('Manici ergonomici in pelle', 'back-hand'), size: 'full' },
  { field: yesNo('Piedini metallici sul fondo', 'vertical-align-bottom'), size: 'full' },
  { section: 'Dimensioni' },
  { base: 'width', size: 'small' },
  { base: 'height', size: 'small' },
  { field: num('Profondità', 'cm', 'straighten'), size: 'small' },
  { field: num('Peso borsa', 'g', 'fitness-center'), size: 'small' },
  { section: 'Organizzazione interna' },
  { field: num('Scomparti principali', '', 'view-module'), size: 'medium' },
  { field: num('Tasche interne con zip', '', 'inventory-2'), size: 'medium' },
  { field: num('Tasche portaoggetti', '', 'inbox'), size: 'medium' },
  { field: yesNo('Vano porta smartphone', 'smartphone'), size: 'full' },
  { field: yesNo('Gancio porta chiavi', 'key'), size: 'full' },
  { section: 'Colori disponibili' },
  { field: multi('Colori disponibili', ['Nero', 'Cuoio', 'Testa di moro', 'Blu', 'Tortora'], 'palette'), size: 'full' },
  { section: 'Qualità e produzione' },
  { field: yesNo('Prodotta in Italia', 'flag'), size: 'full' },
  { field: yesNo('Pelle da concerie italiane', 'verified'), size: 'full' },
  { field: yesNo('Controllo qualità', 'fact-check'), size: 'full' },
  { section: 'Note' },
  { base: 'technicalNotes', size: 'full' },
];

export const FORM_MODELS: { id: FormModelId; name: string; entries?: Entry[] }[] = [
  { id: 'attuale', name: 'Pellicce (attuale)' },
  { id: 'borse', name: 'Borse', entries: BORSE },
];

export const modelName = (id: FormModelId) => FORM_MODELS.find((m) => m.id === id)?.name ?? 'Pellicce (attuale)';

const same = (f: Pick<CustomField, 'name' | 'type' | 'deletedAt'>, def: FieldDef) =>
  !f.deletedAt && f.name.trim().toLocaleLowerCase() === def.name.trim().toLocaleLowerCase() && f.type === def.type;

/** Campi personalizzati del modello che non ci sono ancora nel registro (da creare). */
export function missingModelFields(id: FormModelId, existing: readonly CustomField[]): FieldDef[] {
  const entries = FORM_MODELS.find((m) => m.id === id)?.entries ?? [];
  return entries.flatMap((e) => ('field' in e && !existing.some((f) => same(f, e.field)) ? [e.field] : []));
}

/** Elenco dei campi del modulo per il modello (null = il layout salvato). I campi non ancora creati si saltano. */
export function modelLayout(id: FormModelId, existing: readonly CustomField[]): LayoutField[] | null {
  const entries = FORM_MODELS.find((m) => m.id === id)?.entries;
  if (!entries) return null;
  const out: LayoutField[] = [];
  entries.forEach((e, i) => {
    if ('section' in e) out.push({ id: `model_section_${i}`, type: 'section', size: 'full', visible: true, label: e.section });
    else if ('base' in e) out.push({ id: e.base, type: 'base', size: e.size, visible: true });
    else {
      const found = existing.find((f) => same(f, e.field));
      if (found) out.push({ id: found.id, type: 'custom', size: e.size, visible: true });
    }
  });
  return out;
}
