# Prototipi dei 5 stili sulle schermate vere

Type: prototype
Status: resolved
Blocked by: 03, 05 (01 e 02 risolti il 22 novembre 2026)

## Question

Come appaiono le stesse schermate dell'app attuale in 5 stili? Su una **tela Claude Design nuova** (ticket 02):

1. **Babilonia Vetro**: il preferito finora, design system https://claude.ai/artifact/DpUx4tzHtDuPsKEYWD3aBi;
2. **Redx / Ishtar Lab**: vetro caldo rosa-pesca, Urbanist, accento `#c2395f` (token nel ticket 01, fonte `C:\Users\reda_\Desktop\redx\frontend\ishtar-lab\assets\index-B-NC1f34.css`);
3. **Attuale rifinito**: la versione di oggi, nera e oro, passata con la skill `unslop`: campi più curati e posizionati meglio, stessa identità (richiesta dell'utente del 22 novembre);
4. uno stile proposto dall'agente, diverso dagli altri quattro;
5. **minimal**.

In **tutti** gli stili la **barra in basso va ridisegnata**: all'utente non piace com'è oggi. Restano le stesse 5 voci (Home, Cronologia, Automazioni, Aggiungi, Impostazioni) e la stessa navigazione; cambiano aspetto, icone ed evidenza della voce attiva.

«Posizionare meglio i campi» vale dentro le regole del layout builder: ordine e larghezza (1/3, 1/2, intera) li decide l'utente. Si può migliorare l'allineamento, le altezze uguali nella stessa riga, la posizione di etichetta e icona, gli spazi, e proporre un layout predefinito migliore per chi non lo ha personalizzato.

Ogni stile mostra, con la **stessa struttura** dell'app (campionario del ticket 03):

- **Inventario**: intestazione, cartelle, statistiche, filtri, griglia a 2 colonne di card con foto in alto, una venduta e una con avviso, barra in basso;
- **Scheda capo**: foto, SKU, posizione con il suo colore, prezzi, misure, e un campione di tutti i riquadri dei campi strutturati (mezzi e interi);
- **Aggiungi**: campi a 1/3, 1/2 e intera, una sezione, una griglia di riquadri di scelta, un contatore, una data, un documento, le pillole di posizione con il pallino colorato, il pulsante principale, barra in basso.

Cambiano solo colori, caratteri, spazi, raggi, profondità, la barra in basso e le icone datate. Ogni effetto deve avere un equivalente React Native (ticket 05). Per ogni stile, accanto alle schermate: i valori dei token (colori, testo sopra il colore principale, caratteri, raggi, ombre).

## Answer

22 novembre 2026. Tela Claude Design nuova: **https://claude.ai/artifact/GSuFD111jGM9FSNt5W5fHK** («Syncro Flow · 5 stili (22 nov)», privata finché l'utente non la condivide).

**Come è fatta.** Ogni riga è una schermata (Inventario, Scheda capo, Aggiungi, Token), ogni colonna uno stile; la prima colonna «Oggi» sono le schermate vere del campionario (ticket 03). Le 3 schermate più la barra in basso sono **una struttura comune** (pagina «Struttura comune»: `Inventario`, `Scheda`, `Aggiungi`, `Barra`), costruita sulle schermate vere; ogni stile è un insieme di token (variabili CSS) applicato a quella struttura. Così nessuno stile può cambiare sezioni, ordine o larghezze: cambiano solo colori, caratteri, spazi, raggi, profondità, barra in basso e icone. Accanto, per ogni stile, una scheda con i token (esadecimali a 6 cifre, alfa a parte, testo sull'accento con contrasto) e le note React Native.

**I 5 stili.**

| # | Stile | In breve | Carattere | Barra in basso | Vetro |
| --- | --- | --- | --- | --- | --- |
| 1 | Babilonia Vetro | scuro, blu elettrico `#0A84FF` (pulsanti `#0057D8`, testo bianco 6,2:1), bagliori blu dietro, raggi 18-24, campi a pillola | Outfit | capsula di vetro sospesa, voce attiva in pillola blu | barra e barra Indietro/Modifica |
| 2 | Ishtar Lab | chiaro rosa-pesca, accento `#C2395F` (testo bianco 5,2:1), card `#FCF8F7`, ombre tinte di bordeaux | Urbanist | vetro chiaro sospeso, voce attiva su velo rosa | barra e barra Indietro/Modifica |
| 3 | Attuale rifinito | nero `#0B0B0C` e oro `#D4AF37` (testo `#141414` 8,8:1); oro solo su azione, selezione, prezzo e voce attiva | Inter | ancorata, voce attiva oro con lineetta | nessuno |
| 4 | Ardesia e rame (proposta) | ardesia `#14181D`, rame `#D08A5B` (testo `#1A120C` 6,6:1), rettangoli morbidi da 10, niente pillole | Manrope | ancorata, voce attiva su riquadro rame | nessuno |
| 5 | Minimal | bianco, nero `#111111`, filetti `#E7E6E3`, nessuna ombra | Inter | bianca ancorata, voce attiva nera | nessuno |

**Attuale rifinito con `unslop`** (modalità rifinitura, perché l'app ha già un'identità): direzione «sobrio, preciso, da bottega»; il colore lo portano le foto e il prezzo. Cambi: oro meno diffuso, numeri delle statistiche in bianco, titoli di sezione con iniziale maiuscola invece del maiuscolo spaziato, pesi 400-600, filetti al posto dei bordi grigi, niente emoji nei suggerimenti, Inter al posto del carattere di sistema.

**Ritocchi proposti in tutti gli stili, da confermare con l'utente** (non sono solo aspetto):

- card dell'Inventario con nome e pallino colorato della posizione al posto dell'id in maiuscolo (difetto D05);
- pillole di Posizione e Cartella a 1/2 che vanno a capo invece di tagliarsi (D09);
- nella stessa riga di Aggiungi i controlli sono allineati in basso, etichette su due righe al massimo; a 1/3 segnaposto corti e unità a destra («0 mm»), data in 13 px;
- etichette «Venduto» e «Attenzione» al posto di VENDUTO e ALERT; titolo «Aggiungi prodotto»; prezzi in formato italiano («4.200 €»);
- titoli di sezione con iniziale maiuscola («Dati prodotto») in 4 stili su 5 (Ardesia li tiene maiuscoli); attenzione: i titoli di sezione del layout sono testo scritto dall'utente, quindi il cambio vale per quelli predefiniti, non per quelli che l'utente scrive;
- le 3 statistiche dell'Inventario tutte visibili in una riga invece che a scorrimento;
- scelta multipla a riquadri disegnata come multipla (quadratini di spunta): oggi si comporta da singola (D01);
- icone nuove solo dove il ticket 04 le propone: barra in basso (`view-grid-outline`, `history`, `lightning-bolt-outline`, `plus-circle-outline`, `cog-outline`, piene quando attive), Peso `weight`, misure `tape-measure` e `arrow-expand-horizontal`, «Tutti» `folder-multiple`. Tutte le altre restano le MaterialIcons di oggi. Nei prototipi le icone sono disegnate con i due font veri dell'app.

**Fedeltà.** Inventario: intestazione, cartelle, 3 statistiche, filtri, griglia a 2 colonne con foto da 160 px, una venduta e una con avviso. Scheda: foto 320 con contatore, SKU, posizione con il suo colore, prezzi, misure, note, tutti i 16 campi strutturati (mezzi e interi, nessun 1/3), cronologia, GS1, stampa, barra fissa Indietro/Modifica (non la barra delle schede). Aggiungi: le stesse sezioni e larghezze del campionario (1/3: Pezzi, Data, Spessore e le misure; 1/2; intera), griglie di scelta, contatore, data, documento, pillole di posizione con pallino, pulsante principale, barra in basso. Segmented resta a riquadri a larghezza intera, come oggi.

**Effetti** (ticket 05): vetro sfocato al massimo su 2 superfici per schermata (barra in basso e barra Indietro/Modifica), mai su card, pillole o riquadri; sfumature solo lineari; i bagliori di Babilonia e Ishtar sono radiali e in React Native diventano SVG; ombre come `boxShadow`.

**Limiti.** Altezze delle tavole: Inventario 1320, Scheda 3100, Aggiungi 3200 px, con margine perché la barra in basso non venga tagliata (lo spazio in più resta vuoto sopra la barra). Nel runtime della tela è stato controllato che le variabili CSS restano negli stili e che `sc-for` non aggiunge elementi. La tela non è stata aperta né controllata a vista da questa sessione (il tipo Design chiede di non farlo senza richiesta dell'utente): se una tavola esce vuota o storta va segnalata. I caratteri Outfit, Urbanist e Manrope non sono installati nell'app. Il prossimo passo è il ticket 08 (scelta dello stile) con l'utente; il 07 (icone da sostituire) è sbloccato.

Sorgenti: la tela contiene i suoi file (`project/*.dc.html`, `project/canvas.json`); risorse caricate: le 6 foto, le 3 schermate di oggi e i font `MaterialIcons.ttf` e `MaterialCommunityIcons.ttf` di `@expo/vector-icons`.
