// a4: Impostazioni › Scanner & NFC - salvataggio delle preferenze e diagnostica NFC sul web.
const { scenario } = require('./lib.cjs');
const KEY = 'furinventory_hardware_config:local';
(async () => {
  await scenario('a4-hw-salva', async (h) => {
    await h.go('settings/hardware');
    const prima = await h.store(KEY, 0);
    await h.click('Solo NFC');
    await h.page.getByRole('switch').locator('visible=true').first().click(); // Scrittura automatica NFC
    const dopo = await h.store(KEY);
    await h.go('settings/hardware');
    const interruttoreDopoRicarica = await h.page.getByRole('switch').locator('visible=true').first().isChecked();
    return { prima, dopo, interruttoreDopoRicarica };
  });

  await scenario('a4-hw-test-nfc', async (h) => {
    await h.go('settings/hardware');
    await h.click('Test Stato Sensore NFC');
    await h.page.waitForTimeout(800);
    return { schermataAncoraVisibile: await h.has('Scanner & Hardware') };
  });
})();
