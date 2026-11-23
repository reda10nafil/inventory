// Verifica campi (23/11): crea un campo per ogni tipo dalla UI, registra la forma salvata e come appare in Aggiungi.
// Solo lettura dell'app: scrive solo nel localStorage del browser di prova e le schermate in SHOTS.
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');

const KEY = 'furinventory_custom_fields:local';
const LAYOUT = 'furinventory_layout_config:local';
const NAME_PH = 'Es: Taglia Pantalone, PDF Manuale';

// Descrizione del campo in Aggiungi: testo del contenitore dell'etichetta, input, larghezza
async function describe(page, name) {
  return page.evaluate((n) => {
    const all = [...document.querySelectorAll('div')].filter((d) => d.offsetParent !== null);
    const label = all.find((d) => {
      const tx = (d.innerText || '').trim();
      return (tx === n || tx === `${n} *` || tx === `${n}\n*`) && ![...d.children].some((c) => (c.innerText || '').trim() === tx);
    });
    if (!label) return null;
    const box = label.parentElement;
    const r = box.getBoundingClientRect();
    const inputs = [...box.querySelectorAll('input,textarea')].map((i) => `${i.tagName.toLowerCase()}[${i.placeholder || ''}]=${i.value || ''}`);
    return { testo: (box.innerText || '').replace(/\s+/g, ' ').slice(0, 140), inputs, larghezza: Math.round(r.width) };
  }, name);
}

async function createField(h, spec) {
  await h.click('Crea Nuovo Campo');
  await h.click(spec.desc);
  await h.page.getByPlaceholder(NAME_PH).fill(spec.name);
  if (spec.unit) await h.page.getByPlaceholder('Es: cm, kg, €, ml').fill(spec.unit);
  if (spec.stepper) {
    await h.click('STEPPER (+ / -)');
    await h.page.locator('xpath=//div[normalize-space()="Minimo"]/following-sibling::input[1]').fill(String(spec.stepper.min));
    await h.page.locator('xpath=//div[normalize-space()="Massimo"]/following-sibling::input[1]').fill(String(spec.stepper.max));
  }
  if (spec.barcode) await h.click('Abilita Scanner Barcode / QR');
  if (spec.ui) await h.click(spec.ui);
  if (spec.options) {
    for (let i = 0; i < spec.options.length; i++) {
      if (i > 0) await h.click('Aggiungi Opzione');
      await h.page.getByPlaceholder(`Valore ${i + 1}`).fill(spec.options[i]);
    }
  }
  if (spec.required) await h.click('Campo obbligatorio in fase di aggiunta');
  await h.click('Salva Campo');
  await h.page.waitForTimeout(600);
}

const SPECS = [
  { name: 'V Numero', desc: 'Con unità di misura personalizzabile', unit: 'cm' },
  { name: 'V Contatore', desc: 'Con unità di misura personalizzabile', stepper: { min: 2, max: 5 } },
  { name: 'V Valuta', desc: 'Per prezzi e costi' },
  { name: 'V Data', desc: 'Con calendario picker' },
  { name: 'V Codice', desc: 'Max 100 caratteri', barcode: true },
  { name: 'V Testo lungo', desc: 'Note espandibili' },
  { name: 'V Foto', desc: 'Fino a 10 foto' },
  { name: 'V Misura', desc: 'Dropdown menu', ui: 'SEGMENTED', options: ['Piccola', 'Media', 'Grande'], required: true },
  { name: 'V Accessori', desc: 'Checkbox multipli', ui: 'MODAL_LIST', options: ['Borsa', 'Gruccia'] },
  { name: 'V Documento', desc: 'Allega PDF, Excel o altri file' },
];

(async () => {
  await scenario('v1-crea-tipi', async (h) => {
    await h.go('settings/fields');
    const before = (await h.store(KEY, 0)).map((f) => f.id);
    for (const s of SPECS) await createField(h, s);
    const after = await h.store(KEY);
    const nuovi = after.filter((f) => !before.includes(f.id));
    const layout = await h.store(LAYOUT, 0);
    const forme = nuovi.map((f) => {
      const { id, order, ...rest } = f;
      const lf = layout.fields.find((x) => x.id === id);
      return { ...rest, nelLayout: lf ? `${lf.type}/${lf.size}/${lf.visible}` : 'NO' };
    });
    await h.go('add');
    await h.page.waitForTimeout(800);
    const inAggiungi = {};
    for (const s of SPECS) inAggiungi[s.name] = await describe(h.page, s.name);
    // campi del campionario: griglia vs segmentato, picker vs modal_list, stepper
    for (const n of ['Taglia', 'Condizione', 'Colore', 'Lavorazione', 'Dettagli', 'Trattamenti eseguiti', 'Pezzi', 'Posizione di consegna']) inAggiungi[n] = await describe(h.page, n);
    await h.page.screenshot({ path: `${process.env.SHOTS}/v1-aggiungi-tutto.png`, fullPage: true });
    return { creati: nuovi.length, forme, inAggiungi };
  }, { dialogs: Array(12).fill('ok') });
})();
