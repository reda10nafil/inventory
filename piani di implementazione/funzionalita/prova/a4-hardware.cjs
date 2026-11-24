// a4: Impostazioni › Scanner e NFC - preferenze salvate e diagnostica NFC sul web.
// N1 (NG11-NG13, NG19): sul web nessuna scelta NFC né interruttore, una riga sola «L'NFC si usa dal telefono»; la
// configurazione salvata prima resta com'è (vale sul telefono); nessuna finestra «Errore».
const { scenario } = require('./lib.cjs');
const KEY = 'furinventory_hardware_config:local';
(async () => {
  await scenario('a4-hw-salva', async (h) => {
    await h.page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ scanMode: 'nfc_only', autoWriteNfcOnSave: true })), KEY);
    await h.go('settings/hardware');
    const prima = await h.store(KEY, 0);
    const scelte = { soloNfc: await h.has('Solo NFC'), tuttiEdue: await h.has('Tutti e due', true), interruttori: await h.page.getByRole('switch').locator('visible=true').count() };
    await h.go('settings/hardware');
    const dopo = await h.store(KEY);
    return { prima, dopo, uguale: JSON.stringify(prima) === JSON.stringify(dopo), scelte, riga: await h.has('L\'NFC si usa dal telefono', true) };
  });

  await scenario('a4-hw-test-nfc', async (h) => {
    await h.go('settings/hardware');
    const test = (await h.has('Test Stato Sensore NFC')) || (await h.has('Prova un tag', true));
    await h.page.waitForTimeout(800);
    return { test, titolo: await h.has('Scanner e NFC', true), errore: await h.has('Errore') };
  });
})();
