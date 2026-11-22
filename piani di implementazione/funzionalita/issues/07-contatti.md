# Fornitori e clienti

Tipo: grilling (deciso dall'agente). Stato: **chiuso** il 22 novembre 2026 (notte, regola 4 di `NOTTE_22_23.md`; da rivedere con l'utente).

## Question

Serve un'anagrafica? Quanto ricca?

## Opzioni

- A. Testo libero nella causale: nessun elenco, nessun filtro.
- B. **Anagrafica minima per spazio**: nome, tipo (fornitore o cliente), telefono, email, nota.

## Risposta

**B.** Contesto piccolo e separato (`contexts/ContactsContext.tsx`, chiave `furinventory_contacts:{org}`), come per le categorie; Impostazioni › Fornitori e clienti; `contactId` facoltativo nei movimenti (carico: fornitore; scarico e vendita: cliente). Nella scheda di un contatto: i suoi movimenti.

## Come si torna indietro

Togliere la schermata e il campo facoltativo.
