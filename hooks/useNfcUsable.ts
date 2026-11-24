// N1: l'NFC si può usare qui? Falso sul web e su un telefono senza NFC (o con la libreria che non parte, NG20), così
// con «NFC» salvato lo Scanner e i lettori tengono la fotocamera (`readerSources`). Lo stato si legge alla prima
// schermata che ha un lettore (non all'avvio dell'app) e si ricorda per le altre.
import { useEffect, useState } from 'react';
import { nfcService } from '../utils/nfcService';
import type { NfcState } from '../utils/nfcCore';
import { nfcUsable } from '../utils/nfcTag';

let known: NfcState | null = null;

export function useNfcUsable(): boolean {
  const [state, setState] = useState<NfcState | null>(known);
  useEffect(() => {
    if (!nfcService.available) return;
    let alive = true;
    void nfcService.status().then((s) => { known = s; if (alive) setState(s); });
    return () => { alive = false; };
  }, []);
  return nfcUsable(nfcService.available, state);
}
