// Aiuti per le prove di VAL (ticket 23, valori dei campi personalizzati): `val-campi.cjs` e `collaudo.cjs` (CF-B3,
// CF-C4). Solo per sviluppo, NON fanno parte dell'app.
// - `matita(h, campo)`: Campi Personalizzati › matita del campo (pulsanti della card, come a2-campi);
// - `rinomina(h, vecchio, nuovo)`: nell'editor dei valori aperto, tocco sul valore, nome nuovo, «Salva nome»;
// - `scelti(page, etichette)`: le etichette dei riquadri scelti (fondo diverso dagli altri, come v2-opzioni-modifica);
// - `scrivi(h, etichetta, testo)`: il campo sotto l'etichetta (etichetta e controllo fratelli in FieldInput);
// - `contatore(page, nome)`: il numero mostrato dal contatore («–» se vuoto);
// - `scheda(h, id, nomi)`: «Nome valore» dei campi nella Scheda del prodotto;
// - `valore(p, fieldId)`: il valore salvato di un campo personalizzato.
const { press } = require('./a1-util.cjs');

const CF = 'furinventory_custom_fields:local';
const LAYOUT = 'furinventory_layout_config:local';
const PH_VALORE = 'Es. S, M, L';

const cardButtons = (h, text) => h.vis(text).locator('xpath=ancestor::div[.//div[@tabindex="0"]][1]').locator('div[tabindex="0"]');

async function matita(h, campo) {
  await h.go('settings/fields');
  await cardButtons(h, campo).nth(0).click();
  await h.page.waitForTimeout(700);
}

async function rinomina(h, vecchio, nuovo) {
  await h.page.locator(`[aria-label="Rinomina ${vecchio}"]`).locator('visible=true').first().click();
  await h.page.waitForTimeout(300);
  await h.page.getByPlaceholder(PH_VALORE).locator('visible=true').first().fill(nuovo);
  await h.click('Salva nome');
}

async function scelti(page, etichette) {
  const stili = await page.evaluate((ls) => ls.map((l) => {
    const el = [...document.querySelectorAll('div')].find((d) => d.offsetParent && (d.innerText || '').trim() === l && d.children.length === 0);
    return el ? [l, `${getComputedStyle(el.parentElement).backgroundColor} ${getComputedStyle(el.parentElement).borderTopColor}`] : [l, null];
  }), etichette);
  const conta = {};
  for (const [, s] of stili) if (s) conta[s] = (conta[s] || 0) + 1;
  const comune = Object.entries(conta).sort((a, b) => b[1] - a[1])[0]?.[0];
  return stili.filter(([, s]) => s && s !== comune).map(([l]) => l);
}

async function scrivi(h, etichetta, testo) {
  await h.page.locator(`xpath=//div[normalize-space()="${etichetta}"]/following-sibling::div[1]//input`).locator('visible=true').first().fill(testo);
}

const contatore = (page, nome) => page.locator(`[aria-label="Aumenta ${nome}"]`).locator('visible=true').first()
  .evaluate((e) => (e.previousElementSibling ? e.previousElementSibling.innerText.trim() : null)).catch(() => null);

async function scheda(h, id, nomi) {
  await h.go(`product/${id}`);
  await h.page.getByText('Campi strutturati', { exact: true }).locator('visible=true').first().waitFor().catch(() => {});
  const t = (await h.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const da = t.indexOf('Campi strutturati');
  const parte = da >= 0 ? t.slice(da) : t;
  const out = {};
  for (const [nome, lungo] of nomi) {
    const i = parte.indexOf(`${nome} `);
    out[nome] = i >= 0 ? parte.slice(i + nome.length + 1, i + nome.length + 1 + lungo).trim() : null;
  }
  return out;
}

const valore = (p, fieldId) => (p && (p.customData || []).find((d) => d.fieldSnapshot && d.fieldSnapshot.id === fieldId) || {}).value;

/** Modifica aperta dalla Scheda, come l'utente (Home › prodotto › Modifica). */
async function openEdit(h, sku) {
  await h.go('');
  await h.page.getByText(sku, { exact: true }).first().waitFor();
  await h.click(sku); await h.page.waitForTimeout(800);
  await press(h.page, /^.?\s*Modifica$/); await h.page.waitForTimeout(1200);
}

module.exports = { CF, LAYOUT, PH_VALORE, cardButtons, matita, rinomina, scelti, scrivi, contatore, scheda, valore, openEdit };
