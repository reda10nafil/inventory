# Mappa Wayfinder — aggiornamento UI/UX di Syncro Flow (React Native)

Tracker locale (convenzione `issue-tracker-local` di Wayfinder): questa mappa e un file per ticket in `issues/`. Il repository ha un remote GitHub, ma aprire issue è un'azione pubblica non autorizzata: si resta in locale finché l'utente non dice altro.

## Destination

I 5 stili proposti, fedeli all'app attuale, **tutti disponibili nell'app e scelti dall'utente in Impostazioni** (decisione del 22 novembre 2026, ticket 08), più un grafo dei lavori pronto (`grafo-lavori.md`) che gli agenti esecutori possono seguire per realizzarli senza cambiare schermate, struttura e funzioni.

## Notes

- Dominio: inventario per pelliccerie; mappa funzionale in `docs/design/mappa-funzionale.md`, misure del tema in `audit-tema.md`, difetti in `difetti-trovati.md`.
- Vincoli confermati dall'utente (21 novembre 2026), validi per ogni ticket:
  - Inventario = griglia a 2 colonne di card separate con foto grande in alto («stile post di Instagram»);
  - Scheda capo = campi in riquadri separati che sembrano pulsanti, niente tabelle;
  - ogni stile regge tutti i tipi di campo personalizzato e le larghezze 1/3, 1/2, intera del layout builder;
  - si sostituiscono solo le icone datate o poco chiare;
  - 5 stili: Babilonia Vetro (preferito finora, design system https://claude.ai/artifact/DpUx4tzHtDuPsKEYWD3aBi), Redx / Ishtar Lab, l'attuale nero e oro rifinito con `unslop`, uno proposto dall'agente, il quinto minimal (aggiornato il 22 novembre);
  - la barra in basso va ridisegnata (stesse 5 voci);
  - login Google resta spento; `syncro_flow_flutter/` non si tocca; niente commit né push senza il sì dell'utente;
  - risposte all'utente brevi, dettagli nei file.
- Scelte tecniche prese in questa mappa (si rivedono solo se l'utente chiede altro):
  - ~~tema statico~~ (superato il 22 novembre): **tema scelto dall'app**. Un fornitore del tema con lo stile attivo; gli stili delle schermate diventano funzioni del tema (`makeStyles` / `useStyles`); i 5 temi sono dati con gli stessi 93 token della tela (`temi/token-stili.json`), più alcune varianti di struttura (barra sospesa o ancorata, voce attiva, vetro sì/no, sfondo con bagliori, maiuscole dei titoli di sezione). La scelta è salvata sul dispositivo, fuori dallo spazio di lavoro. Misure: 40 file con `StyleSheet.create` (31 importano il tema), circa 250 righe che leggono il tema fuori dagli stili (`color={theme.primary}` e simili);
  - **icone tradotte al momento del disegno** da un componente unico con tabella di corrispondenza: i nomi salvati nei dati non cambiano;
  - ogni effetto dei prototipi deve avere un equivalente React Native su Android e web (niente `backdrop-filter` solo CSS).
- Skill da consultare: `grilling` e `domain-modeling` per i ticket HITL, `prototype` per i prototipi, `research` per le ricerche; `impeccable` / `ui-ux-pro-max` per la qualità visiva dei prototipi.
- L'esecuzione **non** fa parte di questa mappa: parte da `grafo-lavori.md` quando la mappa è chiusa.
- Scostamento dalla procedura Wayfinder: le ricerche 04 e 05 non stanno su un branch `research/…` (push e branch non autorizzati): il risultato è nel file del ticket. Il 22 novembre una sola sessione ha chiuso 03, 04, 05 e 06 su richiesta esplicita della sessione che l'ha avviata.

## Decisions so far

<!-- una riga per ticket chiuso: [titolo](issues/NN-slug.md): sintesi -->

- [Cosa significa «stile Redex del progetto Rede»](issues/01-significato-redex.md): è il pannello Ishtar Lab in `C:\Users\reda_\Desktop\redx` (vetro caldo rosa-pesca, Urbanist, accento `#c2395f`).
- [Tela per le proposte](issues/02-tela-proposte.md): tela Claude Design nuova; in più, uno stile sarà l'attuale nero e oro rifinito con `unslop`, e la barra in basso va ridisegnata in tutti gli stili.
- [Campionario di prova](issues/03-campionario-di-prova.md): seed solo per sviluppo in `campionario/` (16 campi di ogni tipo, layout 1/3-1/2-intera, 6 capi con foto di pubblico dominio); 18 schermate a 375 px in `schermate-attuali/`.
- [Famiglia di icone](issues/04-famiglia-icone.md): MaterialCommunityIcons per le sole sostituzioni, MaterialIcons per il resto; tabella `{famiglia, nome}` con voci esplicite; Material Symbols da rivalutare con SDK 55.
- [Effetti e caratteri](issues/05-effetti-e-caratteri.md): vetro solo su barra, intestazione e finestre (max 2 per schermata, `dimezisBlurView` su Android); card piene o rgba con `boxShadow`; carattere globale con un `Text`/`TextInput` dell'app (non `defaultProps`), lavoro da mettere in L5.
- [Prototipi dei 5 stili](issues/06-prototipi-cinque-stili.md): tela https://claude.ai/artifact/GSuFD111jGM9FSNt5W5fHK con struttura comune e 5 temi di token (Babilonia Vetro, Ishtar Lab, Attuale rifinito, Ardesia e rame, Minimal) accanto alle schermate di oggi; ritocchi comuni da confermare nel ticket 08.
- [Scelta dello stile](issues/08-scelta-dello-stile.md): tutti e 5, scelti in Impostazioni; predefinito Attuale rifinito; scelta salvata sul dispositivo; ritocchi comuni del ticket 06 accettati («il modo più giusto e corretto e semplificato»).
- [Icone da sostituire](issues/07-icone-da-sostituire.md): solo barra in basso, Peso, misure e «Tutti», in MaterialCommunityIcons; le altre restano.
- [Difetti da correggere](issues/09-difetti-da-correggere.md): divisione dell'agente su delega dell'utente; entrano D01, D04-D11, D17, D22-D24; gli altri restano per dopo.
- [Stampa](issues/10-stampa-e-tema.md): PDF ed etichetta restano come oggi, indipendenti dallo stile; L8 non si fa.

Mappa chiusa il 22 novembre 2026: tutti i ticket sono risolti, l'esecuzione parte da `grafo-lavori.md`.

## Not yet specified

- Come rendere a 106 px (un terzo) i controlli più larghi di ogni stile (i campi a pillola di Babilonia sono i più stretti).
- Caratteri: 4 famiglie (Inter per Attuale e Minimal, Outfit per Babilonia, Urbanist per Ishtar, Manrope per Ardesia), pesi 400-700; peso totale nel bundle Android da misurare (Inter da sola circa 1,7 MB); sul web si carica solo la famiglia dello stile attivo.
- Microinterazioni (pressione dei riquadri, passaggio tra schede): da valutare solo dopo la scelta, e solo se lo stile le prevede.
- Testi e microcopia (titoli in inglese, nomi tecnici GRID/SEGMENTED, emoji): se il restyling li tocca, serve una decisione a parte.

## Out of scope

- ~~Cambio tema dall'app~~: la **scelta dello stile in Impostazioni entra nel lavoro** (richiesta dell'utente del 22 novembre). Restano fuori il passaggio automatico chiaro/scuro secondo il telefono, stili diversi per spazio di lavoro e colori scelti dall'utente.
- Nuove funzioni, nuove schermate, cambi di struttura (elenco a righe, tabelle, navigazione diversa), salvo il selettore dello stile in Impostazioni.
- Login, cloud Supabase, Google Drive, mesh LAN, chat, NFC in lettura, GS1: restano come sono.
- App Flutter `syncro_flow_flutter/`.
- I difetti di comportamento di `difetti-trovati.md`, salvo quelli che l'utente sceglie nel ticket sui difetti.
