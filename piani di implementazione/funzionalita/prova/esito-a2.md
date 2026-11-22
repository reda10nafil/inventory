# Esito A2 — Aggiungi, Campi, Layout, Modelli, Import/Export (22 novembre 2026)

App web su http://localhost:8082, branch `funzioni/magazzino`, campionario da `seed.json`. Ogni scenario parte da un browser pulito 375×812.
Script in questa cartella (`a2-*.cjs`); log e schermate in `%TEMP%\prova-funzioni` (`a2-*.log`). «Prova» = cosa è stato letto in localStorage o visto nelle finestre del browser.

Nota: `difetti-trovati.md` è in parte superato. Nel codice D01, D11 (Aggiungi), D22, D23 e D24 risultano già corretti, e la prova lo conferma.

| Funzione | Esito | Prova | Note (file:riga) |
| --- | --- | --- | --- |
| Aggiungi › salvataggio completo (base + personalizzati) | funziona | `a2-aggiungi.cjs` › `a2-add-completo`: prodotti da 6 a 7. Il nuovo ha visone, vetrina, 1800/3900 €, 90 cm. In `customData`: Fornitore «Pellami Rossi», Taglia «M», Dettagli [Cappuccio, Tasche]. Cronologia: `created`. | D01 corretto: la multipla a riquadri salva due valori (`AddScreen.tsx:500`). D11 corretto in Aggiungi: «è stato aggiunto» leggibile. |
| Aggiungi › SKU vuoto generato | funziona | stesso scenario: `sku` = `LOG-2026-001`. | D23 corretto (`AddScreen.tsx:179-206`). |
| Aggiungi › SKU scritto a mano | funziona | `a2-add-sku-scanner`: salvato `A2-MANUALE`. | |
| Aggiungi › pulsante accanto allo SKU | funziona | stesso scenario: il campo diventa `LOG-2026-001`. | Genera, non scansiona (`AddScreen.tsx:777`). |
| Aggiungi › obbligatori di base | funziona | `a2-add-obbligatori`: avviso «Compila almeno Tipo di Pelle e Posizione», prodotti restano 6. | `AddScreen.tsx:180-183`. |
| Aggiungi › obbligatori personalizzati | funziona | stesso scenario: «Compila anche: Taglia». `a2-campi-modifica`: «Compila anche: Fornitore A2». Nessun prodotto creato. | D24 corretto (`AddScreen.tsx:186`, `utils/formValidation.ts`). |
| Aggiungi › modulo svuotato dopo il salvataggio | funziona | `a2-add-completo`: rientro in Aggiungi dalla barra (senza ricaricare), Fornitore e Prezzo acquisto vuoti. | D22 corretto (`AddScreen.tsx:268`). |
| Aggiungi › senza foto (D18) | non funziona | `a2-add-completo`: `images[0]` = `https://images.unsplash.com/photo-1539533018447-…`. | Difetto ancora presente: `AddScreen.tsx:227`. |
| Aggiungi › QR del campo testo con scanner (D02) | non funziona | `a2-add-sku-scanner`: il tocco scrive `SCAN-794` in «Codice CITES», che finisce in `customData`. | Difetto ancora presente: codice casuale `SCAN-0…9999`, nessuna fotocamera (`AddScreen.tsx:674`). |
| Aggiungi › foto da «Galleria Foto» (web) | non funziona | `a2-add-foto-galleria`: si apre la scelta file, contatore «1/10», prodotto salvato. Ma `images[0]` = `blob:http://localhost:8082/…`; dopo la ricarica `fetch` fallisce e la console dà `ERR_FILE_NOT_FOUND`. | Salva un indirizzo `blob:` che vale solo finché la pagina è aperta (`AddScreen.tsx:130-131`). |
| Aggiungi › foto da «Sfoglia File» (web) | non funziona | `a2-add-foto-file`: stesso esito (`blob:`, illeggibile dopo la ricarica). | `AddScreen.tsx:144-145`. |
| Aggiungi › «Scatta Foto» | non verificabile da qui | Serve una fotocamera vera. | `AddScreen.tsx:153-167`. |
| Campi › crea | funziona | `a2-campi.cjs` › `a2-campi-crea`: `furinventory_custom_fields:local` da 27 a 28; nuovo `field_…`, `text_short`, `isSystem:false`. | |
| Campi › il campo nuovo compare in Aggiungi | non funziona | stesso scenario: subito dopo la creazione non è nel layout né in Aggiungi. Compare solo dopo Layout builder › CAMPO › Salva Layout (`size:'medium'`, `visible:true`). | `addField` non tocca il layout (`CustomFieldsContext.tsx:112-123`, `FieldsScreen.tsx:139-140`). Nessun avviso. |
| Campi › modifica | funziona | `a2-campi-modifica`: Fornitore diventa «Fornitore A2», `required:true`. Aggiungi mostra «Fornitore A2 *» e lo pretende. | |
| Campi › elimina | funziona | `a2-campi-elimina`: «Spessore» ha `deletedAt`, sparisce dall'elenco e da Aggiungi, compare nel Cestino. | Conferma del browser «Cestina?». |
| Layout › sposta un campo | funziona | `a2-layout.cjs` › `a2-layout-sposta-nascondi`: in `furinventory_layout_config:local` purchasePrice/sellPrice passano da 7,8 a 8,7. In Aggiungi Prezzo Vendita viene prima. | |
| Layout › nascondi un campo | funziona | stesso scenario: `weight.visible:false`; il campo Peso non c'è più in Aggiungi. | |
| Layout › aggiungi campo (CAMPO) | funziona | `a2-campi-crea`: il campo entra nel layout salvato e compare in Aggiungi. | |
| Layout › uscire senza «Salva Layout» | non funziona | `a2-layout-non-salvato`: Peso nascosto e indietro senza salvare. Il dato salvato resta `visible:true`, ma Aggiungi nasconde Peso. Dopo la ricarica Peso ricompare. | Il contesto cambia subito (`LayoutBuilderScreen.tsx:113,122,131`), il salvataggio solo col pulsante (`:135-143`). Nessun avviso. |
| Layout › MODELLI: campi nel registro (D12) | non funziona | `a2-layout-modello`: «Elettronica & Tech» ha 4 campi mancanti; nel registro arriva solo «Scadenza Garanzia». `a2-layout-modello-due-volte`: la seconda volta arriva solo «Numero di Serie (S/N)». | Ogni `addField` del ciclo riparte dallo stesso elenco vecchio e sovrascrive il precedente (`LayoutBuilderScreen.tsx:158-162`, `CustomFieldsContext.tsx:112-123`). |
| Layout › MODELLI: campi nel layout (D12) | non funziona | stesso scenario: layout identico prima e dopo, anche premendo Salva Layout. Nessun campo del modello in Aggiungi. L'avviso però dice «Layout sostituito con successo!». | Confermato. I modelli hanno `layoutFields` vuoti (`lib/templates.ts:72-74,124`); il ripiego cerca i campi in `customFields` letto prima di crearli (`LayoutBuilderScreen.tsx:172-184`); messaggio a `:191`. |
| Modelli di settore › voce in Impostazioni (D13) | non funziona | `a2-modelli-settore.cjs`: in Impostazioni nessuna riga con «modell/settore». L'indirizzo `/settings/sector-templates` dà «Page Not Found». | Schermata registrata (`RootNavigator.tsx:99`, `compat.ts:36`), ma nessun `router.push` in `SettingsScreen.tsx` e nessuna rotta in `linking.ts`. |
| Modelli di settore › Importa | non verificabile da qui | Schermata irraggiungibile. | Dal codice: stesso ciclo di `addField` (`SectorTemplatesScreen.tsx:60-69`), quindi salverebbe un solo campo. Il messaggio però conta tutti i campi tentati (`:71`). |
| Modelli di settore › «Salva campi attuali come modello» | non funziona | Dal codice: la schermata è irraggiungibile, quindi niente prova a runtime. | `Alert.prompt` esiste solo su iOS: su Android e web compare «disponibile a breve». Su iOS `prompt` non restituisce nulla, quindi parte anche quell'avviso (`SectorTemplatesScreen.tsx:89-114`). |
| Esporta CSV (web) | funziona | `a2-csv.cjs` › `a2-csv-esporta-reimporta`: scarica `inventario_<ora>.csv`, 6 righe, 15 colonne. | `SettingsScreen.tsx:104-112`. |
| Esporta CSV › andata e ritorno | non funziona | stesso scenario: lo stesso file reimportato con SKU `RT-…` dà 6 prodotti, tutti senza cartella e senza foto (3→0, 1→0). Prezzi, misure e campi personalizzati restano. | Manca la colonna Cartella (`SettingsScreen.tsx:84`). Escono solo le foto `http(s)` (`:97`): le foto del capo (`data:`/`blob:`/file) si perdono. |
| Importa CSV › pulsante (web) | non funziona | `a2-csv-importa-pulsante`: la scelta file si apre. Poi l'avviso dice «Importazione non riuscita … expo-file-system.readAsStringAsync is not available on web». Prodotto non creato. | `SettingsScreen.tsx:258` → `src/lib/fileSystem.ts:17-23`. |
| Importa CSV › trascinando il file (web) | funziona | `a2-csv-trascina`: «1 prodotti importati. 2 saltati» (doppione VIS-0142, SKU vuoto). Il nuovo ha volpe, stand_a, `sold`, 1234.5 da «1234,50», nota con virgola; cronologia `created`. CSV senza SKU e file `.png` respinti con messaggio. | `SettingsScreen.tsx:266-279`. |
| Esporta / importa CSV su telefono | non verificabile da qui | Usano file e condivisione del sistema (`react-native-fs`, share). | `SettingsScreen.tsx:115-125`, `:250-264`. |
| Backup Google Drive | non verificabile da qui | `a2-backup-drive`: avviso «Google Drive non collegato», prodotti invariati. Il login è spento. | `SettingsScreen.tsx:131-136`, `LOGIN_ENABLED = false` (`AuthContext.tsx:17`). |

Totale: 15 funziona, 12 non funziona, 4 non verificabili da qui.

## Difetti nuovi

1. **Foto perse sul web.** Le foto scelte in Aggiungi si salvano come indirizzo `blob:`, che vale solo finché la pagina resta aperta. Dopo la ricarica il capo non ha più foto (`AddScreen.tsx:130-131`, `:144-145`, `:165`). Lo stesso schema c'è nei campi «Immagini» e «Documento» (`:580-582`, `:650`), non provati a parte.
2. **I modelli salvano un solo campo.** `addField` chiamato in un ciclo usa sempre lo stesso elenco vecchio, quindi resta solo l'ultimo campo (`LayoutBuilderScreen.tsx:158-162`, `SectorTemplatesScreen.tsx:60-69`, `CustomFieldsContext.tsx:112-123`). Peggiora D12 oltre quanto previsto.
3. **Messaggio falso dopo il modello.** Compare «Layout sostituito con successo!» e la finestra annuncia che il modello «SOSTITUIRÀ l'intero layout», ma il layout non cambia (`LayoutBuilderScreen.tsx:191`, `:462`).
4. **Importa CSV col pulsante non va sul web.** `readAsStringAsync` di expo-file-system non esiste sul web. Funziona solo il trascinamento (`SettingsScreen.tsx:258`, `src/lib/fileSystem.ts:17-23`).
5. **L'export CSV non è un backup completo.** Mancano la cartella e le foto locali. Un CSV reimportato dà capi senza cartella né foto (`SettingsScreen.tsx:84`, `:97`). Il backup Drive usa le stesse colonne (`:140-145`).
6. **Layout non salvato ma già applicato.** Le modifiche del Layout builder valgono subito in Aggiungi anche senza «Salva Layout», e spariscono alla ricarica, senza avviso (`LayoutBuilderScreen.tsx:113,122,131`).
7. **Un campo nuovo non entra in Aggiungi.** Bisogna aggiungerlo a mano da Layout builder › CAMPO, e nulla lo dice (`FieldsScreen.tsx:139-140`, `CustomFieldsContext.tsx:112-123`).
8. **iOS, «Salva campi attuali come modello».** Mostra insieme il prompt e l'avviso «disponibile a breve», perché `Alert.prompt` non restituisce nulla (`SectorTemplatesScreen.tsx:89-114`). Letto nel codice, non provato.
9. **Import CSV di un capo «venduto».** Lo stato diventa `sold` ma in cronologia c'è solo «creato», nessuna vendita (`SettingsScreen.tsx:215-243`). Minore.
