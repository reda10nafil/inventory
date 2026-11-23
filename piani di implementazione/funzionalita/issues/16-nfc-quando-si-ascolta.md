# NFC: quando si ascolta

Tipo: grilling. Stato: **chiuso** il 22 novembre 2026 sera (risposta dell'utente). Fetta: N1.

## Question

L'app legge i tag sempre, oppure solo quando lo si chiede?

## Risposta (utente)

- **Solo su richiesta, mai un ascolto continuo** («altrimenti causerebbe solo problemi»).
- **Impostazioni › Scanner & NFC deve davvero scegliere** tra QR, NFC o entrambi. Oggi la preferenza si salva ma nessuno la legge (difetto D19 della prova): si corregge qui.
- «Da configurare nei minimi dettagli; trova il modo migliore»: pause, ritardi e che cosa succede alla lettura li propone l'orchestratore (ticket 17 e 18) e li conferma l'utente.

## Note

- Nel codice React Native non c'è mai stato un ascolto continuo: quei difetti erano dell'app Flutter. Qui l'NFC è lavoro nuovo.
- Sul web l'NFC non esiste: i comandi NFC non compaiono.
- La prova vera si fa solo sul telefono.
- **23 novembre** (mappa 3, ticket 22): la schermata Scanner & NFC si rifà semplice nella fetta N1 («Scanner e NFC»: stato in una riga, «Prova un tag», fotocamera / NFC / tutti e due, il resto sotto «Avanzate»); oggi 4 controlli su 5 non hanno effetto (NG11 = D19, provato). La lettura NFC passa dal lettore unico della fetta COD. Il tag porta il codice, non il link (ticket 18).

## Come si torna indietro

Togliere i comandi «Leggi tag NFC»: restano la scrittura dalla Scheda e la prova in Impostazioni › Hardware, come oggi.
