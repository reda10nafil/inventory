// M01 (ticket 04): categorie modificabili per spazio. Predefinite senza scrittura, crea → usa in Aggiungi →
// card e Scheda col nome, rinomina senza cambiare l'id del prodotto, eliminazione bloccata se usata (anche
// dal cestino) o se è l'ultima, eliminazione di una libera, ricarica che conserva la lista.
// C1 (ticket 19): la lista di M01 si chiama «Tipi di pelle» (stessa chiave, stesso indirizzo); selettori aggiornati.
const { scenario } = require('./lib.cjs');
const KEY = 'furinventory_categories:local';
const names = (h) => h.page.evaluate(() => [...document.querySelectorAll('[aria-label^="Elimina "]')].map((e) => e.getAttribute('aria-label').slice(8)));
(async () => {
  await scenario('m01-predefinite', async (h) => {
    await h.go('settings/categories');
    const elenco = await names(h);
    const chiave = await h.store(KEY, 500);
    await h.go('add');
    const etichettaAggiungi = await h.has('Tipo di pelle', true);
    const vecchiaEtichetta = await h.has('Tipo Pelle');
    await h.tab('Impostazioni');
    const voce = await h.has('Tipi di pelle', true);
    return { elenco, chiaveScritta: chiave !== null, etichettaAggiungi, vecchiaEtichetta, voceImpostazioni: voce };
  });

  await scenario('m01-crea-usa-rinomina', async (h) => {
    await h.go('settings/categories');
    await h.page.getByPlaceholder('Es. Lapin, Castoro, Montone').fill('Viti');
    await h.click('Crea tipo di pelle');
    const dopoCrea = await h.store(KEY, 800);
    await h.page.getByPlaceholder('Es. Lapin, Castoro, Montone').fill('viti');
    await h.click('Crea tipo di pelle'); // doppione: rifiutato
    const dopoDoppione = (await h.store(KEY, 500)).length;
    await h.go('add');
    await h.click('Viti'); await h.click('Vetrina'); await h.click('M');
    await h.click("Aggiungi all'Inventario");
    const p = (await h.products()).find((x) => x.sku === 'LOG-2026-001');
    await h.go('');
    const card = await h.has('Viti', true);
    await h.click('LOG-2026-001');
    const scheda = await h.has('Tipo di pelle: Viti', true); // C1: nella Scheda il tipo di pelle ha l'etichetta
    await h.go('settings/categories');
    await h.click('Viti');
    await h.page.getByPlaceholder('Es. Lapin, Castoro, Montone').fill('Viti inox');
    await h.click('Salva nome');
    const dopoRinomina = await h.store(KEY, 800);
    const p2 = (await h.products()).find((x) => x.sku === 'LOG-2026-001');
    await h.page.reload(); await h.page.waitForTimeout(2000);
    const dopoRicarica = await names(h);
    await h.go('');
    const cardRinominata = await h.has('Viti inox', true);
    await h.page.locator('[aria-label="Elimina Viti inox"]').count(); // la voce c'è
    await h.go('settings/categories');
    await h.page.locator('[aria-label="Elimina Viti inox"]').click(); await h.page.waitForTimeout(700);
    const dopoEliminaUsata = (await h.store(KEY, 500)).map((c) => c.id);
    return {
      creata: dopoCrea.find((c) => c.id === 'viti'), voci: dopoCrea.length, dopoDoppione,
      prodotto: p && p.furType, card, scheda,
      rinominata: dopoRinomina.find((c) => c.id === 'viti'), idProdottoDopoRinomina: p2 && p2.furType,
      ricaricaHaVitiInox: dopoRicarica.includes('Viti inox'), cardRinominata,
      eliminataUsata: !dopoEliminaUsata.includes('viti'),
    };
  }, { dialogs: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'] });

  await scenario('m01-elimina', async (h) => {
    // AST-0033 (unico Astrakan) nel cestino: la categoria resta bloccata
    await h.page.evaluate(() => {
      const k = 'inventory:v1:local:products';
      const ps = JSON.parse(localStorage.getItem(k));
      ps.find((p) => p.sku === 'AST-0033').deletedAt = new Date().toISOString();
      localStorage.setItem(k, JSON.stringify(ps));
    });
    await h.go('settings/categories');
    await h.page.locator('[aria-label="Elimina Astrakan"]').click(); await h.page.waitForTimeout(700);
    const dopoAstrakan = (await h.store(KEY, 500));
    // Ermellino non è usata: si elimina dopo la conferma
    await h.page.locator('[aria-label="Elimina Ermellino"]').click(); await h.page.waitForTimeout(900);
    const dopoErmellino = (await h.store(KEY, 800)).map((c) => c.id);
    // Ultima categoria: non si elimina
    await h.page.evaluate((k) => localStorage.setItem(k, JSON.stringify([{ id: 'solo', label: 'Solo' }])), KEY);
    await h.go('settings/categories');
    await h.page.locator('[aria-label="Elimina Solo"]').click(); await h.page.waitForTimeout(700);
    const dopoUltima = (await h.store(KEY, 500)).map((c) => c.id);
    return { astrakanBloccata: dopoAstrakan === null, ermellinoEliminata: !dopoErmellino.includes('ermellino'), voci: dopoErmellino.length, dopoUltima };
  }, { dialogs: ['ok', 'ok', 'ok'] });
})();
