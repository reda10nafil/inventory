// 26/11 (prova sul telefono): con «Tutti e due» l'utente avvicina il tag mentre la fotocamera è aperta e si aspetta che
// lo Scanner lo legga da solo, senza premere «Leggi un tag». Ora lo Scanner ascolta l'NFC finché è la schermata davanti:
// una lettura dopo l'altra (fotocamera e NFC insieme), ferma quando si esce dallo Scanner. Fuori dallo Scanner resta la
// regola di prima: una pressione = una lettura.
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import type { NfcTagEvent } from '../utils/nfcCore';
import { nfcService } from '../utils/nfcService';

export type NfcListenState = 'ascolto' | 'spento' | 'assente' | 'fermo';

const LISTEN_MS = 60000;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useNfcListen(enabled: boolean, onTag: (tag: NfcTagEvent) => void): NfcListenState {
  const [state, setState] = useState<NfcListenState>('fermo');
  const onTagRef = useRef(onTag);
  onTagRef.current = onTag;

  useFocusEffect(useCallback(() => {
    if (!enabled || !nfcService.available) { setState('fermo'); return undefined; }
    let alive = true;
    void (async () => {
      await pause(400); // la fotocamera appena spenta: il telefono riaccende l'NFC un attimo dopo
      while (alive) {
        const outcome = await nfcService.read({ timeoutMs: LISTEN_MS });
        if (!alive) return;
        if (outcome.esito === 'letto') {
          setState('ascolto');
          onTagRef.current(outcome.tag);
          await pause(1500); // lo stesso tag ancora appoggiato non riapre subito la stessa cosa
        } else if (outcome.esito === 'nfc-spento' || outcome.esito === 'assente') {
          setState(outcome.esito === 'nfc-spento' ? 'spento' : 'assente');
          await pause(3000); // si ricontrolla: acceso dalla tendina, lo Scanner riprende da solo
        } else {
          setState('ascolto');
          if (outcome.esito !== 'tempo-scaduto') await pause(1000); // occupato, annullato da altri, errore: si riprova
        }
      }
    })();
    setState('ascolto');
    return () => { alive = false; void nfcService.cancel(); };
  }, [enabled]));

  return state;
}
