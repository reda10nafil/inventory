# Foto: formato WebP

Tipo: research (AFK). Stato: **aperto**, si chiude nella fetta I1. Non dipende dal login.

## Question

Come si converte una foto in WebP su Android e sul web, e con quali misure?

## Da stabilire nella fetta I1

- `expo-image-manipulator` è già tra le dipendenze e salva in WebP: verificare che funzioni su Android e su react-native-web, senza dipendenze native nuove (niente riavvio di Metro).
- Larghezza massima, qualità e peso atteso di una foto di catalogo. Proposta dell'orchestratore: lato lungo 1600 px, qualità 0,8; da confermare con le misure reali.
- Nome del file: stabile per prodotto e per foto, così un nuovo caricamento sostituisce il vecchio e il link non cambia.
- Logica in `utils/webp.ts` con test jest per ciò che è puro (misure, nome del file); la conversione vera si prova sul web con `lib.cjs` e poi sul telefono.

Lo ZIP con il CSV e le immagini non serve più: le foto vanno sul cloud (ticket 11).

## Come si torna indietro

La conversione è una funzione a sé: basta non chiamarla.
