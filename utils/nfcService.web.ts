// N1 (NG19, N0 §5): sul web l'NFC non c'è. Stessa forma del servizio del telefono, senza la libreria: ogni operazione
// risponde «non disponibile» e le schermate non mostrano le righe NFC (al loro posto «L'NFC si usa dal telefono»).
// Prima la libreria si avviava anche qui e dava «Operazione Annullata» ed «Errore».
import type { NfcService } from './nfcCore';

export const nfcService: NfcService = {
  available: false,
  holdsTagWhileAsking: false,
  status: async () => 'assente',
  setSilencer: async () => {},
  read: async () => ({ esito: 'non-disponibile' }),
  openForWrite: async () => ({ esito: 'non-disponibile' }),
  write: async () => ({ esito: 'non-disponibile' }),
  cancel: async () => {},
};
