// a4: Impostazioni › Posizioni - crea, modifica nome/colore, elimina (e cosa succede ai prodotti), nome doppio.
// C2: gli elementi premibili si contano solo a video e senza la freccia nativa in alto (un <a>): da C2 sotto ogni
// indirizzo c'è Impostazioni nascosta e la freccia c'è anche aprendo l'indirizzo direttamente.
const { scenario } = require('./lib.cjs');
const KEY = 'furinventory_locations:local';
// riga della posizione e suo cestino (Pressable annidato nella riga)
const row = (h, label) => h.page.locator('[tabindex="0"]').filter({ hasText: `${label}ID:` }).first();
const swatch = (h, i) => h.page.locator('[tabindex="0"]:visible:not(a)').nth(i); // 0..9 colori, dopo il campo Nome
(async () => {
  if (process.argv[2]) return; // senza argomento: scenari principali
  await scenario('a4-pos-crea', async (h) => {
    await h.go('settings/locations');
    const prima = await h.store(KEY, 0);
    await h.page.getByPlaceholder('Es. Magazzino A, Scaffale 1').fill('Deposito Nord');
    await h.page.locator('[tabindex="0"]:visible:not(a)').nth(2).click(); // terzo colore = verde #10B981
    await h.page.locator('[tabindex="0"]:visible:not(a)').nth(11).click(); // genera codice
    await h.page.waitForTimeout(300);
    await h.click('Crea Posizione');
    const dopo = await h.store(KEY);
    const nuova = (dopo || []).find((l) => l.id === 'deposito_nord');
    await h.go('settings/locations');
    const dopoRicarica = await h.has('Deposito Nord');
    await h.go('add');
    const inAggiungi = await h.has('Deposito Nord');
    return { primaSalvato: prima, nuova, totale: (dopo || []).length, dopoRicarica, inAggiungi };
  });

  await scenario('a4-pos-modifica', async (h) => {
    await h.go('settings/locations');
    await h.click('Vetrina');
    const titolo = await h.has('Modifica posizione');
    await h.page.getByPlaceholder('Es. Magazzino A, Scaffale 1').fill('Vetrina Centrale');
    await h.page.locator('[tabindex="0"]:visible:not(a)').nth(3).click(); // viola #8B5CF6
    await h.click('Salva Modifiche');
    const vetrina = ((await h.store(KEY)) || []).find((l) => l.id === 'vetrina');
    const vis = (await h.products(0)).find((p) => p.sku === 'VIS-0142');
    await h.go('');
    const home = await h.has('Vetrina Centrale');
    return { titoloModifica: titolo, vetrina, prodottoLocation: vis.location, homeMostraNuovoNome: home };
  });

  await scenario('a4-pos-elimina', async (h) => {
    await h.go('settings/locations');
    await row(h, 'Vetrina').locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(700);
    const formDiventaModifica = await h.has('Modifica posizione');
    const salvate = (await h.store(KEY)) || [];
    const vis = (await h.products(0)).find((p) => p.sku === 'VIS-0142');
    await h.go('');
    const homeVetrina = await h.has('vetrina', true);
    await h.go(`product/${vis.id}`);
    const schedaVetrina = await h.has('vetrina', true);
    await h.go(`product/edit/${vis.id}`);
    await h.shot('modifica-dopo-elimina');
    return { ids: salvate.map((l) => l.id), vetrinaPresente: salvate.some((l) => l.id === 'vetrina'), formDiventaModifica, prodottoLocation: vis.location, homeMostraIdGrezzo: homeVetrina, schedaMostraIdGrezzo: schedaVetrina };
  }, { dialogs: ['ok'] });

  await scenario('a4-pos-elimina-annulla', async (h) => {
    await h.go('settings/locations');
    await row(h, 'Stand A').locator('[tabindex="0"]').last().click();
    const salvate = await h.store(KEY);
    return { salvato: salvate === null ? 'nessuna scrittura' : salvate.map((l) => l.id), standAVisibile: await h.has('Stand A', true) };
  }, { dialogs: ['cancel'] });

  await scenario('a4-pos-doppia', async (h) => {
    await h.go('settings/locations');
    await h.page.getByPlaceholder('Es. Magazzino A, Scaffale 1').fill('Magazzino');
    await h.click('Crea Posizione');
    const salvate = await h.store(KEY);
    return { salvato: salvate === null ? 'nessuna scrittura' : salvate.length };
  });
})();

// Dopo l'eliminazione di «Vetrina»: Modifica di VIS-0142 aperta dalla Scheda (app già caricata), salvataggio senza cambiare nulla.
(async () => {
  if (process.argv[2] !== 'modifica-orfano') return;
  await scenario('a4-pos-orfano-modifica', async (h) => {
    await h.go('settings/locations');
    await row(h, 'Vetrina').locator('[tabindex="0"]').last().click();
    await h.page.waitForTimeout(700);
    await h.go('');
    await h.click('VIS-0142');
    await h.click('Modifica');
    await h.vis('Posizione').evaluate((e) => e.scrollIntoView({ block: 'start' }));
    await h.page.waitForTimeout(400);
    await h.shot('modifica');
    await h.click('Salva Modifiche');
    const vis = (await h.products()).find((p) => p.sku === 'VIS-0142');
    return { location: vis.location };
  }, { dialogs: ['ok', 'ok'] });
})();
