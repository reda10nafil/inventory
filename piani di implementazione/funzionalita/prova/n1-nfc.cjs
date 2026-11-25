// N1 (ticket 16, 18, 22): l'NFC reso ovvio, la parte che si prova sul web. Sul web l'NFC non c'è: la logica (lettura
// dal lettore unico, scrittura del codice, tag pieno, UID conosciuto o no, preferenze rispettate) sta nei test jest
// `nfcTag.test.ts` e `nfcCore.test.ts`; qui si prova tutto il resto.
// - `n1-impostazioni-web`: Scanner e NFC con una configurazione salvata prima: una riga «L'NFC si usa dal telefono»,
//   nessuna scelta NFC, nessun «Errore» (NG12), nessuna promessa (NG13), chiave salvata identica;
// - `n1-scanner-web`: con «NFC», «Fotocamera» e «Tutti e due» salvati lo Scanner resta usabile (fotocamera, galleria,
//   a mano), nessun «Leggi un tag»; nei lettori delle automazioni «Scrivi il codice» sì, «Leggi un tag» no;
// - `n1-finestra-web`: «Codice ed etichetta» di prodotto, posizione, categoria e scaffale con le righe «Scrivi tag
//   NFC» e «Collega un tag» (non per il prodotto) spente, con sotto «Funziona dal telefono» (dall'Unione 2, richiesta
//   dell'utente del 25/11: prima una riga sola «L'NFC si usa dal telefono»): nessun pulsante vero, il tocco non apre
//   «Avvicina il tag», nessun «Programma tag» (NG19), nessuna finestra del browser;
// - `n1-scaffali`: niente campo del tag scritto a mano (NG18); A1 col tag salvato prima, rinominato, tiene il tag;
//   l'UID letto a mano apre ancora A1;
// - `n1-posizioni-categorie`: niente NFC nei moduli (NG17); posizione e categoria col tag salvato prima, rinominate,
//   lo tengono; l'UID apre la cosa giusta;
// - `n1-dati`: aprire Scanner e NFC, Scanner, Scaffali, Posizioni, Categorie, Scheda e finestre del codice non scrive.
const { scenario } = require('./lib.cjs');
const c = require('./cod-util.cjs');
const eti = require('./eti-util.cjs');
const u = require('./c2-util.cjs');

const HW = 'furinventory_hardware_config:local';
const RIGA = 'L\'NFC si usa dal telefono';
const label = (h, text) => h.page.getByLabel(text, { exact: true }).locator('visible=true');
const conta = async (h, text) => h.page.getByText(text, { exact: true }).locator('visible=true').count();
const testo = (h) => h.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
// `scrivi` e `collega` contano i pulsanti veri (sul web 0); `spente` le righe spente con il motivo sotto
const nfcIn = async (h) => ({
  riga: await conta(h, RIGA),
  spente: { scrivi: await label(h, 'Scrivi tag NFC: funziona dal telefono').count(), collega: await label(h, 'Collega un tag: funziona dal telefono').count(), motivo: await conta(h, 'Funziona dal telefono') },
  scrivi: await label(h, 'Scrivi tag NFC').count(),
  collega: await label(h, 'Collega un tag').count(),
  programma: await conta(h, 'Programma tag'),
});
const salvaModo = (h, config) => h.page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [HW, config]);

(async () => {
  await scenario('n1-impostazioni-web', async (h) => {
    const salvata = { scanMode: 'nfc_only', autoWriteNfcOnSave: true };
    await salvaModo(h, salvata);
    await h.go('settings/hardware');
    const t = await testo(h);
    const out = {
      riga: await h.has(RIGA, true),
      titolo: await h.has('Scanner e NFC', true),
      scelte: (await h.page.getByLabel(/^Leggi con /).locator('visible=true').count())
        + (await conta(h, 'Solo NFC')) + (await conta(h, 'Entrambi')) + (await conta(h, 'Tutti e due')) + (await conta(h, 'Fotocamera')),
      interruttori: await h.page.getByRole('switch').locator('visible=true').count(),
      prova: await h.has('Prova un tag', true),
      avanzate: await label(h, 'Avanzate').count(),
      errore: /errore/i.test(t),
      promesse: ['Pulizia', 'Scrittura Automatica', 'programmare', 'Test Stato Sensore'].filter((x) => t.includes(x)),
    };
    await h.go('settings/hardware');
    out.chiave = await h.store(HW);
    out.chiaveUguale = JSON.stringify(out.chiave) === JSON.stringify(salvata);
    return out;
  });

  await scenario('n1-scanner-web', async (h) => {
    const out = {};
    for (const scanMode of ['nfc_only', 'qr_only', 'both']) {
      await salvaModo(h, { scanMode, autoWriteNfcOnSave: false });
      await h.go('scanner');
      out[scanMode] = {
        fotocamera: await h.page.locator('video').count(),
        galleria: await h.has('Importa da Galleria', true),
        aMano: await h.has('Inserisci Manualmente', true),
        leggiTag: await label(h, 'Leggi un tag').count() + await conta(h, 'Leggi un tag'),
      };
    }
    // con «NFC» salvato lo Scanner a mano apre ancora il prodotto
    await salvaModo(h, { scanMode: 'nfc_only', autoWriteNfcOnSave: false });
    await c.aMano(h, 'VIS-0142');
    out.aManoApre = await c.aperto(h);
    // un lettore delle automazioni (Tagging di massa)
    await h.go('automations/quick-tag'); await h.click('Da Pulire'); await h.click('Scansiona Prodotto');
    out.automazione = { scriviCodice: await label(h, 'Scrivi il codice').count(), leggiTag: await label(h, 'Leggi un tag').count() };
    await c.leggi(h, 'VIS-0098');
    out.automazione.letto = await h.has('VIS-0098', true);
    return out;
  });

  await scenario('n1-finestra-web', async (h) => {
    await c.prepara(h);
    const out = {};
    // prodotto col link GS1 (VIS-0142): riga del telefono, «Copia link» sotto Avanzate, niente «Programma tag»
    await h.click('VIS-0142'); await h.page.waitForTimeout(900);
    await eti.apri(h, 'Codice ed etichetta', 900);
    out.prodotto = await nfcIn(h);
    // il tocco sulla riga spenta non apre la finestra del tag
    await label(h, 'Scrivi tag NFC: funziona dal telefono').first().click(); await h.page.waitForTimeout(400);
    out.prodotto.toccoApre = await conta(h, 'Avvicina il tag al telefono');
    await eti.apri(h, 'Avanzate', 400);
    out.prodotto.copiaLink = await conta(h, 'Copia link');
    out.prodotto.programmaInAvanzate = await conta(h, 'Programma tag');
    await eti.chiudiCodice(h);
    // posizione, con la serie: con «tutte le etichette» la riga sparisce (più cose, nessun tag)
    await h.go('settings/locations');
    await eti.apri(h, 'Codice ed etichetta di Magazzino');
    out.posizione = await nfcIn(h);
    await eti.apri(h, 'Stampa tutte le etichette di questa posizione', 400);
    out.posizione.rigaInSerie = (await conta(h, RIGA)) + (await conta(h, 'Funziona dal telefono'));
    await eti.chiudiCodice(h);
    await h.go('settings/folders');
    await eti.apri(h, 'Codice di Pellicce');
    out.categoria = await nfcIn(h);
    await eti.chiudiCodice(h);
    await h.go('settings/shelves');
    await eti.apri(h, 'Codice QR di A1');
    out.scaffale = await nfcIn(h);
    await eti.chiudiCodice(h);
    const ok = ['prodotto', 'posizione', 'categoria', 'scaffale'].every((k) => out[k].riga === 0 && !out[k].scrivi && !out[k].collega && !out[k].programma
      && out[k].spente.scrivi === 1 && out[k].spente.collega === (k === 'prodotto' ? 0 : 1) && out[k].spente.motivo === (k === 'prodotto' ? 1 : 2))
      && out.prodotto.toccoApre === 0 && out.prodotto.copiaLink === 1 && out.prodotto.programmaInAvanzate === 0 && out.posizione.rigaInSerie === 0;
    return { ok, ...out };
  });

  await scenario('n1-scaffali', async (h) => {
    await c.prepara(h);
    await h.go('settings/shelves');
    await label(h, 'Modifica scaffale A1').first().click(); await h.page.waitForTimeout(500);
    const t = await testo(h);
    const out = {
      campo: await label(h, 'Tag NFC (facoltativo)').count(),
      segnaposto: await h.page.getByPlaceholder('Es. 04:A2:3B:1C').count(),
      promessa: t.includes('arriverà più avanti'),
      rigaElenco: await h.has('NFC 04:A2:3B:1C', true),
    };
    const prima = ((await h.store(c.SK, 0)) || [])[0];
    await label(h, 'Nome').first().fill('A1 bis');
    await label(h, 'Salva scaffale').first().click(); await h.page.waitForTimeout(700);
    const dopo = ((await h.store(c.SK)) || [])[0];
    out.salvato = { nome: dopo.name, nfcTag: dopo.nfcTag, barcode: dopo.barcode, stessoTag: dopo.nfcTag === prima.nfcTag, stessoCodice: dopo.barcode === prima.barcode };
    await c.aMano(h, '04A23B1C');
    out.uidApre = await c.aperto(h);
    return out;
  }, { dialogs: ['ok'] });

  await scenario('n1-posizioni-categorie', async (h) => {
    await c.prepara(h, {
      locations: [
        { id: 'magazzino', label: 'Magazzino', color: '#3B82F6', barcode: 'LOC-MAGAZZINO', nfcTag: '04:11:22:33' },
        { id: 'vetrina', label: 'Vetrina', color: '#D4AF37', barcode: 'LOC-VETRINA' },
      ],
      extra: () => {
        const k = 'inventory:v1:local:libraries';
        const libs = JSON.parse(localStorage.getItem(k));
        libs.find((l) => l.id === 'pellicce').nfcTag = '04:55:66:77';
        localStorage.setItem(k, JSON.stringify(libs));
      },
    });
    await h.go('settings/locations');
    await h.click('Magazzino');
    const modPosizione = await testo(h);
    await h.page.getByPlaceholder('Es. Magazzino A, Scaffale 1').fill('Magazzino centrale');
    await h.click('Salva Modifiche');
    const pos = ((await h.store(c.LOC)) || []).find((l) => l.id === 'magazzino');
    await h.go('settings/folders');
    await h.page.locator('[tabindex="0"]').filter({ hasText: /ID: pellicce(?![\w-])/ }).first().click(); await h.page.waitForTimeout(500);
    const modCategoria = await testo(h);
    await label(h, 'Nome della categoria').first().fill('Pellicce lunghe');
    await h.click('Salva Modifiche');
    const cat = ((await h.store(c.LK)) || []).find((l) => l.id === 'pellicce');
    const out = {
      nfcNeiModuli: { posizione: /NFC/.test(modPosizione), categoria: /NFC/.test(modCategoria) },
      posizione: { label: pos.label, nfcTag: pos.nfcTag, barcode: pos.barcode },
      categoria: { name: cat.name, nfcTag: cat.nfcTag, barcode: cat.barcode },
    };
    await c.aMano(h, '04112233');
    out.uidPosizione = await c.aperto(h);
    await c.aMano(h, '04:55:66:77');
    out.uidCategoria = await c.aperto(h);
    return out;
  }, { dialogs: ['ok', 'ok', 'ok'] });

  await scenario('n1-dati', async (h) => {
    await c.prepara(h);
    await salvaModo(h, { scanMode: 'qr_only', autoWriteNfcOnSave: true });
    const prima = await u.snapshot(h.page);
    await h.go('settings/hardware');
    await h.go('scanner');
    await h.go('settings/shelves');
    await eti.apri(h, 'Codice QR di A1'); await eti.chiudiCodice(h);
    await h.go('settings/locations');
    await eti.apri(h, 'Codice ed etichetta di Magazzino'); await eti.chiudiCodice(h);
    await h.go('settings/folders');
    await eti.apri(h, 'Codice di Pellicce'); await eti.chiudiCodice(h);
    await h.go('');
    await h.click('VIS-0142'); await h.page.waitForTimeout(900);
    await eti.apri(h, 'Codice ed etichetta', 900); await eti.chiudiCodice(h);
    await h.page.waitForTimeout(1500);
    const dopo = await u.snapshot(h.page);
    const cambiate = u.changedKeys(prima, dopo);
    return { ok: cambiate.length === 0, cambiate };
  });
})();
