# Note di L2 per L6 (22 novembre 2026)

Raccolte dai resoconti delle corsie L2. In L2 un ruolo si è usato solo dove il suo valore nel tema `oggi` era identico a quello del punto; qui sotto i punti dove **il ruolo giusto è un altro** ma il valore di oggi è diverso: L6 li allinea quando ridisegna la schermata.

## Colori rimasti scritti a mano (non sono dati)

| File | Valore | Cosa è | Ruolo per L6 |
| --- | --- | --- | --- |
| `tabs/AutomationsScreen.tsx` (pulsante «Crea Nuova») | `#FFF` | «+» sul pulsante oro | `onButton` |
| `tabs/AutomationsScreen.tsx` («Lo sapevi?») | `#92400E` | testo del riquadro di avviso chiaro | `onWarningSurface` |
| `settings/TeamScreen.tsx` (scanner) | `#FFF` ×2 | chiudi e scritta sopra il velo nero della fotocamera | bianco fisso (`onData`) |
| `settings/FoldersScreen.tsx` (card del QR) | `#666` | suggerimento sulla carta bianca del QR | grigio fisso sulla carta |
| `product/EditScreen.tsx`, `DetailScreen.tsx` (foto) | `rgba(255,255,255,0.5)` | pallini spenti sopra le foto | bianco fisso al 50% |
| `product/DetailScreen.tsx` (visore foto) | `#000` | fondo del visore a schermo intero | `cameraBackground` |
| `product/DetailScreen.tsx` (VENDUTO) | `#FFF` ×2 | icona e testo sull'etichetta | `soldBadgeText` |
| `product/DetailScreen.tsx` (interruttore attivo) | `#FFF` | testo sull'oro | `onAccent` / `chipActiveText` |
| `product/DetailScreen.tsx` («Stampa Etichetta») | `#FFF` | icona sul pulsante oro (il testo è nero) | `onButton` |
| `App.tsx` (caricamento) | `#D4D4D8` | testo d'attesa | `textSecondary` |

Bianco sopra le foto e sul velo nero: `onData` (resta bianco anche negli stili chiari) in Edit e Detail.

## Ruolo giusto, valore di oggi diverso

- **Cronologia**: pillola della data attiva con accento a 0x30 e testo oro (non `chipActive`); pillola spenta con raggio 12 (non `chip`).
- **Automazioni**: pulsante «Crea» con raggio pieno (`button` = 12); card e card vuota con raggio 16 (`card` = 12); fondo del pulsante scanner accento a 0x15 (`iconWrap` = 0x20).
- **Impostazioni**: campo della squadra su `background` (non `input`); infoCard e teamPanel con raggio 16.
- **Team**: pulsante secondario su `backgroundSecondary` con bordo accento a 0x55; campi su `backgroundSecondary`, segnaposto `textMuted`; pulsanti e goBtn raggio 10, card 16.
- **Campi, Cartelle, GS1, Layout**: quadratini d'icona ed etichette con accento a 0x15 (non `iconWrap`); campi su `backgroundSecondary` (GS1 `inputContainer`, Cartelle `input`); pillole con raggio 16 (non `chip`) in Campi e Layout (MODELLI/SEZIONE/CAMPO); testo delle pillole spente `textPrimary` (non `chipText`) in Campi; pillola GS1 spenta su `backgroundSecondary`; scelta icone e larghezze: selezionata accento pieno (non `tileSelected`), spenta `backgroundSecondary` (non `tile`); spunta spenta `textSecondary` (non `checkRing`); annulla delle Cartelle `backgroundSecondary`/`textPrimary`; cerchi d'icona con raggio 20-25; card GS1 e `formCard` Cartelle raggio 16; etichette raggio 4/6; segnaposto GS1 `textMuted`.
- **Modifica**: campi personalizzati su `backgroundSecondary` con segnaposto `textMuted`; riquadri di scelta raggio 16, bordo spento trasparente, scelto a 0x25; unità con raggio 6.
- **Scheda**: VENDUTO raggio 12 (non `badge`); «Mostra SKU QR» / «Stampa PDF» testo `textPrimary` (non `onButtonSecondary`); tag personalizzato su `backgroundSecondary`, raggio 16, testo `textPrimary`; quadratino d'icona raggio 8; l'interruttore del codice GS1 non ha un ruolo.
- **Posizioni**: campo, annulla e pulsanti d'icona su `backgroundSecondary` (non `input`/`buttonSecondary`); testo di annulla `textPrimary`; suggerimento `#666` sulla carta del QR.
- **Costruttore automazioni**: testo di Annulla come sopra; la descrizione è un'area di testo ma usa `styles.input`; `iconChip`, `stepOption`, `locationOption` generici; finestra dal basso raggio 24.
- **Hardware**: controllo a segmenti `accent`/`onAccent` raggio 8; quadratini d'icona raggio 8 e 22; veli oro a 0x10/0x30.
- **Cestino, Condivisione**: veli oro a 0x15 (non `accentSoft`); quadratini d'icona raggio 10 (anche Modelli di settore, etichetta raggio 4).
- Card e righe di tutte le schermate di Impostazioni: raggi `medium`/`large` generici, non ancora `card`.
- Dati da non toccare: colore `#D4AF37` salvato con i modelli di settore dell'utente; colore predefinito `#3B82F6` delle automazioni; palette di Posizioni e Automazioni.
- **Inventario**: pillole delle cartelle con raggio 12 (colori già sui ruoli `chip`); testo della ricerca `textSecondary` (non `inputText`); `#FFF` sull'eliminazione rossa e anello bianco della spunta sopra la foto (bianchi fissi).
- **Aggiungi**: `quickSettingsTile` raggio 16, bordo trasparente, scelto a 0x25 (non `tileSelected`); radio spento `textSecondary` (non `checkRing`); etichette dei campi `textPrimary` (non `t.label.color`); tratteggio di «Allega Documento» in `accent` (non `dash`); `qrButton` generico, potrebbe essere un pulsante secondario; `#FFF` sulle icone e `rgba(255,255,255,0.5)` sui pallini sopra le foto (bianchi fissi).
- **Automazioni (schermate)**: pulsante di scansione di Spostamento con testo bianco e raggio pieno (non `onButton`/`button`); pulsanti a pillola di scansione, avvio, condivisione e fine (colori di stato o di dati, raggio pieno); campi prezzo su `background` (Esecuzione) e `backgroundSecondary` (Vendita); righe Audit sulle superfici chiare con testo `textPrimary`/`textSecondary` e bordo e «INTRUSO» `warning` (i ruoli `onSuccessSurface`, `warningSurfaceBorder`, `onWarningSurface` hanno valori diversi); card e pannelli raggio 16. `#FFF` sui colori pieni e sui veli: `onData`. Dati: `COMMON_TAGS` di Tag rapidi.
- **Scanner**: campo della finestra su `background` (non `input`); annulla su `background`/`textPrimary` (non `buttonSecondary`); contenitore della fotocamera `#1A1A1A` (non `cameraBackground`); finestra raggio 16; `#fff` sul pulsante oro di ricerca (`onButton`).
- **Azione rapida**: `actionButton` su `tile` con bordo spento trasparente; `closeButton` su `buttonSecondary` senza bordo; opzione attiva a 0x15 (non `tileSelected`); radio spento `textSecondary`; card raggio 16; `#FFF` su riquadri d'accento (`onAccent`) e d'avviso; riquadri azione `#3B82F6`/`#10B981` trattati come dati.
- **Chat**: segnaposto `textMuted`; testo sulla bolla oro `#0A0A0A` e `rgba(10,10,10,0.6)` (`onAccent`); card del prodotto: `btnOutline` trasparente con bordo d'accento, card raggio 16, pulsanti e meta raggio 10, etichette a raggio pieno; venduto `#FFFFFF` (`soldBadgeText`/`soldBadge`), «Vendi» `#0A0A0A` (`onButton`), bianchi sopra la foto.
- **Accesso** (inutilizzato con il login spento): testo del pulsante `#151515` (`onButton`), `#A1A1AA`, `#FCA5A5`, raggio 10. **Pagina non trovata**: oro `#FFD700`, `#CCCCCC`, `#0a0a0a` sul pulsante. **Lettore codici**: bianchi sopra la fotocamera e il velo.
