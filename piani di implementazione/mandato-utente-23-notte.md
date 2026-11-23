# Mandato dell'utente per la notte del 23 novembre 2026 (dalle 4 circa)

Scritto dalla seconda orchestratrice con le parole dell'utente, per l'orchestratore 3 e per chi verrà dopo. Da copiare in `inventory-stili/piani di implementazione/` (accanto a `NOTTE_22_23.md`) quando il worktree è libero.

## Parole dell'utente

> «Io ho intenzione di andare a dormire, per cui dovrà cercare di gestire il tutto.»

> «Dovresti dare all'orchestratore in una nuova sessione di gestire tutto e controllare il tutto, e che dovrà lui pensare magari al rispondere alle domande degli agenti o i sottoagenti e delle sessioni, e dovrà capire da solo quando una sessione bisognerà essere aggiornata perché sta diventando troppo grande.»

> «Hai praticamente l'applicazione che è quasi al 60% del funzionamento. Ci sono altre funzioni che bisognerà essere controllati e che bisogneranno funzionare bene, e ci sono altre ancora che magari mancano. […] dovresti gestire i ticket da solo e i task e gestire il tutto. Quando tutto si fa, si va a controllare che tutto funziona e poi andare avanti.»

> «Una volta fatto tutto, ci si chiede: manca qualcosa? Se sì, come dovrebbe essere aggiunto? Che cos'è che dovrebbe essere aggiunto? Come dovrebbe essere aggiunto? Come migliorerebbe il tutto? E una volta fatto, si può anche chiedere: si può migliorare UI UX system per facilitare il tutto anche per persone che non hanno competenze, senza dover studiare un software complesso?»

> «È nato proprio per il fatto che cerco di facilitarlo in modo da avere tutte le funzionalità necessarie, ma con la stessa facilità che chiunque può impararlo in pochissimi minuti.»

> «Hai permesso su tutto ciò che devi fare. Hai carta bianca. Mi fido di te perché so che andrai a controllare il tutto e a vedere che tutto funziona nel modo corretto.»

## Come si applica

1. **L'orchestratore decide da solo** ciò che stanotte avrebbe chiesto all'utente. Regola: «il modo più giusto e corretto e semplificato», l'opzione più semplice e reversibile. Ogni decisione presa al posto dell'utente va in una riga di `DECISIONI_DA_RIVEDERE.md` (cosa, perché, come si torna indietro). Le domande che restano davvero aperte si raccolgono in un elenco breve per la mattina, senza fermare il lavoro.
2. **Domande già aperte, decise così salvo motivi contrari scoperti nella verifica:**
   - scaffali: avviso dall'80%; **blocco** quando il prodotto non entra (un lato più grande dello scaffale, peso oltre il massimo, pezzi oltre il massimo), con la proposta di uno scaffale adatto della stessa categoria. Questo concilia «avviso, non blocco» del 22 sera con «mi ferma e mi dice è pieno» del 23 mattina;
   - soglie dei colori: verde sotto il 50%, blu dal 50 all'80%, rosso dall'80%;
   - «selettori»: decidere dopo aver verificato Modelli di settore e i campi delle cartelle; l'obiettivo dell'utente è che **ogni categoria abbia i suoi campi**, scelti in fretta e già pronti.
3. **Ciclo di lavoro**: verifica dello stato → piano e piano di verifica → fetta → controllo che funziona e che è collegato al resto → fetta successiva. Finite le richieste del 23: «manca qualcosa?» (nuovo giro di mappa), poi il giro di UI/UX per chi non ha competenze.
4. **Gestione delle sessioni**: l'orchestratore risponde ai subagenti e alle sessioni che ha avviato, controlla ogni loro resoconto su `origin/funzioni/magazzino`, e quando la propria conversazione diventa lunga scrive un passaggio nella cartella delle note e avvia da solo la sessione successiva (mai a metà di un esecutore).

## Limiti che restano anche con la carta bianca

Sono le regole di sicurezza del progetto; l'utente non le ha tolte esplicitamente, e nessuna serve a fare il lavoro:

- niente merge su `main` e niente pull request: tutto resta su `funzioni/magazzino`;
- nessun comando git distruttivo; un solo scrittore alla volta in `inventory-stili`;
- `LOGIN_ENABLED = false` sul branch condiviso; nessuna credenziale, chiave API o segreto inserito dall'agente (il provider Google in Supabase lo accende l'utente);
- nessuna migrazione sul database Supabase e nessuna scrittura nel cloud: le fette L1, L2, I2, I3 aspettano l'utente;
- niente generazioni a pagamento;
- non toccare `syncro_flow_flutter/` né `app/`; il checkout `inventory` su `main` ha modifiche non nostre;
- telefono non collegato: le prove Android (NFC, login, tasto Indietro) restano nell'elenco per quando l'utente lo collega.
