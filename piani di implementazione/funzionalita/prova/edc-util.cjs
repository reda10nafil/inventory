// Aiuti per le prove di EDC (ticket 23: editor del campo in tre domande e lettura veloce): `edc-editor.cjs`,
// `collaudo.cjs` (CF-B3) e la fetta `edc` di `stili-fette.cjs`. Solo per sviluppo, NON fanno parte dell'app.
// - `crea(h, campo)`: Campi › «Crea Nuovo Campo» › tipo (dalla descrizione, unica: il nome del tipo compare anche
//   nell'elenco sotto la finestra) › nome › unità › come si compila › limiti › valori › aspetto › predefinito › card ›
//   «Salva Campo». Restituisce il campo salvato;
// - `prepara(h)`: Aggiungi con Visone, Vetrina e Taglia M (gli obbligatori del campionario);
// - `salvaNuovo(h)`: «Aggiungi all'Inventario» (senza foto) e il prodotto nuovo salvato;
// - `apriScelte(h, nome)`: il controllo sotto l'etichetta (casella dell'elenco dal basso);
// - `campo(h, nome)`: il campo del registro con quel nome;
// - `puntoColore(page, etichetta, rgb)`: c'è un pallino di quel colore accanto all'etichetta?
const { press } = require('./a1-util.cjs');
const v = require('./val-util.cjs');

const NOME_PH = 'Es: Taglia Pantalone, PDF Manuale';
// Descrizioni dei tipi nella prima domanda (uniche nella pagina)
const TIPI = {
  testo: 'Max 100 caratteri',
  testoLungo: 'Note su più righe',
  numero: 'Con l\'unità che vuoi: cm, kg, pezzi',
  prezzo: 'Prezzi e costi in euro',
  data: 'Si sceglie dal calendario',
  sino: 'Una risposta: sì oppure no',
  scelta: 'Un valore tra quelli pronti',
  scelte: 'Uno o più valori tra quelli pronti',
  foto: 'Fino a 10 foto',
  documento: 'PDF, Excel o altri file',
};

const visibile = (h, sel) => h.page.locator(sel).locator('visible=true').first();

async function crea(h, { tipo, nome, compila, limiti, valori = [], aspetto, unita, predefinito, card, obbligatorio }) {
  await h.go('settings/fields');
  await h.click('Crea Nuovo Campo');
  await h.click(TIPI[tipo]);
  await h.page.getByPlaceholder(NOME_PH).locator('visible=true').first().fill(nome);
  if (unita) await h.page.getByPlaceholder('Es: cm, kg, €, ml').locator('visible=true').first().fill(unita);
  if (compila) await h.click(compila);
  for (const [etichetta, valore] of Object.entries(limiti || {})) await visibile(h, `[aria-label="${etichetta}"]`).fill(valore);
  for (const valore of valori) {
    await h.page.getByPlaceholder(v.PH_VALORE).locator('visible=true').first().fill(valore);
    await h.click('Aggiungi valore');
  }
  if (aspetto) await h.click(aspetto);
  if (predefinito !== undefined) {
    if (typeof predefinito === 'string' && predefinito.startsWith('=')) await visibile(h, `[aria-label="Predefinito ${predefinito.slice(1)}"]`).click();
    else await visibile(h, '[aria-label="Valore predefinito"]').fill(String(predefinito));
    await h.page.waitForTimeout(300);
  }
  if (card) await h.click('Mostra nella card dell\'Inventario');
  if (obbligatorio) await h.click('Campo obbligatorio in fase di aggiunta');
  await h.click('Salva Campo');
  return campo(h, nome);
}

async function campo(h, nome, wait = 1200) {
  return ((await h.store(v.CF, wait)) || []).find((f) => f.name === nome && !f.deletedAt);
}

async function prepara(h, taglia = 'M') {
  await h.go('add');
  await h.click('Visone'); await h.click('Vetrina'); await h.click(taglia);
}

async function salvaNuovo(h) {
  await h.click('Aggiungi all\'Inventario');
  await h.page.waitForTimeout(1200);
  return (await h.products())[0];
}

async function apriScelte(h, nome) {
  await h.page.locator(`xpath=//div[normalize-space()="${nome}"]/following-sibling::div[1]`).locator('visible=true').first().click();
  await h.page.waitForTimeout(500);
}

/** C'è un pallino col colore `rgb` («rgb(59, 130, 246)») fratello dell'etichetta visibile `etichetta`? */
const puntoColore = (page, etichetta, rgb) => page.evaluate(([l, c]) => [...document.querySelectorAll('div')]
  .filter((d) => d.offsetParent && (d.innerText || '').trim() === l && d.children.length === 0)
  .some((d) => [...(d.parentElement ? d.parentElement.children : [])].some((s) => getComputedStyle(s).backgroundColor === c)), [etichetta, rgb]);

/** Card dell'Inventario (testo) del prodotto con lo SKU. */
const card = (page, sku) => page.evaluate((s) => {
  const el = [...document.querySelectorAll('[tabindex="0"]')]
    .filter((x) => x.offsetParent && (x.innerText || '').split('\n').some((l) => l.trim() === s))
    .sort((a, b) => a.innerText.length - b.innerText.length)[0];
  return el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
}, sku);

const salvaModifica = (h) => press(h.page, /Salva Modifiche$/);

/** Ruota di un numero (R3 di UX0): a larghezza intera la riga si tocca nel modulo; in una colonna il campo
 *  «nome: valore» apre la ruota in una finestra dal basso, si tocca la riga e «Fatto». */
async function ruota(h, nome, valore) {
  const riga = `[aria-label="${nome} ${valore}"]`;
  if (!(await h.page.locator(riga).locator('visible=true').count())) {
    await visibile(h, `[aria-label^="${nome}: "]`).click(); await h.page.waitForTimeout(500);
  }
  await visibile(h, riga).click(); await h.page.waitForTimeout(500);
  if (await h.has('Fatto', true)) await h.click('Fatto');
}

/** Apre la ruota di un numero in colonna (finestra dal basso); niente se è già a vista. */
async function apriRuota(h, nome) {
  if (await h.page.locator(`[aria-label="Ruota ${nome}"]`).locator('visible=true').count()) return;
  await visibile(h, `[aria-label^="${nome}: "]`).click(); await h.page.waitForTimeout(500);
}

module.exports = { NOME_PH, TIPI, crea, campo, prepara, salvaNuovo, apriScelte, puntoColore, card, salvaModifica, visibile, ruota, apriRuota };
