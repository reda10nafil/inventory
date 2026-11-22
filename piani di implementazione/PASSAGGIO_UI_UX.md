# Passaggio di consegne — aggiornamento UI/UX di Syncro Flow (React Native)

Scritto il 21 novembre 2026 alla chiusura della sessione che ha allineato il repository, sistemato la versione web e iniziato (male) le proposte di stile. Chi riprende parte da qui.

## Cosa vuole l'utente

Aggiornare l'aspetto dell'app, che trova datato, **senza cambiarla**: stesse schermate, stessa struttura, stesse funzioni. Parole sue: «volevo aggiornare il sistema per com'era, UI UX, ma non che volevo cambiarlo totalmente».

Ordine di lavoro che ha imposto:

1. **Capire l'app**: a cosa serve e come funziona, in particolare Campi personalizzati e Layout builder, perché decidono come sono fatti i campi, che funzioni hanno e come sono distribuiti.
2. **Piani di implementazione**.
3. **Proposte UI/UX**: 5 stili da confrontare, vicini alla versione attuale.
4. **Agenti esecutori** che realizzano il nuovo sistema.

## Vincoli confermati dall'utente

- L'Inventario resta una **griglia a 2 colonne di card separate con la foto grande in alto** («stile post di Instagram»), così l'immagine si vede subito. Niente elenco a righe.
- Nella Scheda capo i campi restano **riquadri separati, che sembrano pulsanti**. Niente tabelle o elenchi chiave-valore.
- Campi personalizzati e Layout builder sono funzioni necessarie: ogni stile deve reggere tutti i tipi di campo e le larghezze 1/3, 1/2 e intera.
- Icone: alcune sono datate e non si capiscono. Vanno sostituite **quelle**, non tutte.
- Stili richiesti: quello che gli è piaciuto di più finora è **Babilonia Vetro** (design system in Claude Design: https://claude.ai/artifact/DpUx4tzHtDuPsKEYWD3aBi); uno nello «stile Redex del progetto Rede»; altri due; **il quinto deve essere minimal**.
- Risposte brevi all'utente; i dettagli vanno nei file del progetto.

## Aggiornamento del 22 novembre 2026

Fasi 1 e 2 fatte (codice letto, schermate viste sul web, nessun codice dell'app modificato):

- mappa funzionale: `docs/design/mappa-funzionale.md` (sostituisce `regole-temi.md`, che ora rimanda lì);
- mappa Wayfinder con 10 ticket di decisione: `piani di implementazione/ui-ux/map.md` e `ui-ux/issues/`;
- grafo dei lavori per gli esecutori: `ui-ux/grafo-lavori.md`; misure di colori e icone: `ui-ux/audit-tema.md`; 24 difetti trovati: `ui-ux/difetti-trovati.md`.

Risposte dell'utente dello stesso giorno: «Redex» è il pannello Ishtar Lab in `C:\Users\reda_\Desktop\redx` (ticket 01); tela Claude Design nuova (ticket 02); uno dei 5 stili è l'attuale nero e oro rifinito con la skill `unslop`; la barra in basso va ridisegnata in tutti gli stili (ticket 06).

Frontiera: 03 (campionario di prova), 04 (famiglia di icone), 05 (effetti e caratteri), tutti senza bisogno dell'utente; poi 06 (prototipi sulla tela nuova). La domanda «Redex» qui sotto è chiusa.

## Aggiornamento del 22 novembre 2026, seconda sessione (ticket 03-06 chiusi)

- **Tela dei 5 stili**: https://claude.ai/artifact/GSuFD111jGM9FSNt5W5fHK. Righe = Inventario, Scheda capo, Aggiungi, Token; colonne = Oggi (schermate vere) e i 5 stili: 1 Babilonia Vetro, 2 Ishtar Lab, 3 Attuale rifinito (`unslop`), 4 Ardesia e rame (proposta), 5 Minimal. Pagina «Struttura comune»: le 4 strutture (`Inventario`, `Scheda`, `Aggiungi`, `Barra`) usate da tutti gli stili tramite variabili CSS; per cambiare uno stile si cambiano solo le sue variabili nelle 3 tavole `<stile>-*.dc.html`. La tela non è stata controllata a vista.
- **Campionario**: `ui-ux/campionario/` (seed solo per sviluppo, istruzioni nel ticket 03); schermate in `ui-ux/schermate-attuali/`.
- **Icone** (04): MaterialCommunityIcons solo per le sostituzioni. **Effetti** (05): vetro al massimo su 2 superfici per schermata; carattere globale con un `Text` dell'app.
- **Prossimo passo**: ticket 08 con l'utente, cioè quale stile e quali ritocchi comuni accetta (elenco nel ticket 06: posizione con colore sulle card, pillole che vanno a capo, allineamento dei campi, etichette, icone). Poi 07, 09 e 10, ed esecuzione da `grafo-lavori.md`.
- **Nota tecnica**: il server Playwright MCP si blocca su questa app; per le schermate usare `node campionario/schermate.cjs <percorso di playwright>`.

## Aggiornamento del 22 novembre 2026, terza parte (tutti e 5 gli stili)

- **Decisione dell'utente**: tutti e 5 gli stili nell'app, scelti in Impostazioni. Il cambio tema dall'app entra nel lavoro; il passaggio automatico chiaro/scuro resta fuori.
- **Valori**: `ui-ux/temi/token-stili.json`, 93 token per stile estratti dalla tela.
- **Piano**: `ui-ux/grafo-lavori.md` riscritto (fornitore del tema, `makeStyles`, selettore «Aspetto», 5 temi uno alla volta, verifica nei 5 stili). Predefinito proposto: Attuale rifinito.
- **Caratteri**: installato solo `@expo-google-fonts/inter` (controllato); scelta predefinita per L5a: installare `@expo-google-fonts/outfit`, `/urbanist` e `/manrope`.

## Aggiornamento del 22 novembre 2026, quarta parte (mappa chiusa, si esegue)

- **Risposte dell'utente**: sì al branch locale e anche a GitHub; sì ai ritocchi comuni; regola per tutto il lavoro: «il modo più giusto e corretto e semplificato».
- **Tutti i ticket risolti** (07, 08, 09, 10): vedi `ui-ux/map.md`, «Decisions so far».
- **Branch**: `ui-ux/stili`, da main a cfcdecb, primo commit con i documenti del piano, pubblicato su GitHub (`reda10nafil/inventory` è pubblico). Il checkout principale resta su main con gli stessi documenti non committati: prima di un merge in main vanno scartati lì.
- **Chi esegue**: parte da `ui-ux/grafo-lavori.md`, lavoro L0, in un worktree del branch `ui-ux/stili`; un commit per lavoro chiuso; `git push origin HEAD:ui-ux/stili`; mai su main, nessuna pull request senza un nuovo sì.

## Domanda aperta (chiusa il 22 novembre: «Redex» = Ishtar Lab, ticket 01)

Cosa intende con «stile Redex, sul progetto Rede»? La sessione precedente ha **supposto** che fosse il sito del progetto `Progetti suddivisi/Analisi software/Rea reverse` (`website/public/assets/styles.css`: bianco, inchiostro, blu `#294f82`). Non è confermato.

## Errore da non ripetere

La sessione precedente ha aperto Claude Design e disegnato schermate nuove **prima** di leggere il codice: elenco a righe al posto delle card, scheda come tabella, nessun rispetto del layout builder. L'utente l'ha fermata. Le correzioni successive (card e riquadri) sono state fatte guardando solo `HomeScreen` e `DetailScreen`, non il modulo Aggiungi.

## Stato delle cose

- Repository `reda10nafil/inventory`, branch `main` a `cfcdecb`, pubblicato. Non committati: questo file, la voce in CRONOLOGIA.md, `docs/design/regole-temi.md` e due file in `syncro_flow_flutter/` che erano già modificati (non toccarli).
- Login Google disattivato (`LOGIN_ENABLED = false` in `contexts/AuthContext.tsx`): l'app usa lo spazio locale. Non riattivarlo.
- Versione web: configurazione `syncro-flow-web` in `D:\FurInventory Pro\.claude\launch.json`, porta 8081. Serve per guardare le schermate vere.
- Verifiche: `npx tsc --noEmit`, `npx eslint .`, `npx jest@29.7.0 --config jest.config.js` (jest manca nei devDependencies), `npx react-native bundle --platform android ...` per il bundle Android.
- `docs/design/regole-temi.md`: prima bozza, conteneva errori; dal 22 novembre vale `docs/design/mappa-funzionale.md`.
- Tela Claude Design «Syncro Flow · 5 stili»: https://claude.ai/artifact/5SfWEA9QTMiTUfz9T655s5. È una **bozza da considerare scartabile**. Pubblicati: Babilonia (Inventario, Scheda), foglio «Icone nuove», Rea (Inventario, Scheda), Atelier (Inventario, Scheda), Vetrina di sera (solo Inventario). L'indice elenca anche `vetrina-scheda` e i due `minimal-*`, che non hanno file. Manca del tutto il modulo Aggiungi. Decidere con l'utente se ripartire da una tela nuova.

## Da leggere per capire l'app

| Cosa | File |
| --- | --- |
| Tipi di dato | `types/index.ts` |
| Campi di base e personalizzati | `contexts/CustomFieldsContext.tsx`, `src/screens/settings/FieldsScreen.tsx` |
| Layout builder e modelli | `contexts/LayoutContext.tsx`, `src/screens/settings/LayoutBuilderScreen.tsx`, `SectorTemplatesScreen.tsx`, `constants/sectorTemplates.ts` |
| Come si disegna ogni campo | `components/DynamicFieldRenderer.tsx`, `src/screens/tabs/AddScreen.tsx`, `src/screens/product/EditScreen.tsx` |
| Inventario e scheda | `src/screens/tabs/HomeScreen.tsx`, `src/screens/product/DetailScreen.tsx` |
| Altre schede | `TimelineScreen.tsx`, `AutomationsScreen.tsx`, `SettingsScreen.tsx`, cartelle `src/screens/settings/` e `src/screens/automations/`, `ScannerScreen.tsx`, `ChatScreen.tsx` |
| Tema attuale | `constants/theme.ts` (importato da 31 file), `constants/Colors.ts` (residuo, non usato) |
| Contesto | `CLAUDE.md`, `AGENTS.md`, `piani di implementazione/` |

## Cosa deve uscire, in ordine

1. Una mappa funzionale dell'app in `docs/design/` (a cosa serve, schermate, tipi di campo, layout builder, automazioni, scanner/NFC, GS1, import/export).
2. Un piano in `piani di implementazione/` con il grafo dei lavori e le dipendenze bloccanti. Punti già emersi: i colori scritti a mano nei componenti vanno portati a token prima di cambiare palette; le icone dei campi sono nomi Material Icons salvati nei dati e richiedono una tabella di corrispondenza.
3. Le 5 proposte di stile, ognuna con Inventario, Scheda capo con tutti i tipi di campo e modulo Aggiungi con campi a 1/3, 1/2 e intera.
4. Dopo la scelta dell'utente, gli agenti esecutori applicano lo stile scelto seguendo il piano.
