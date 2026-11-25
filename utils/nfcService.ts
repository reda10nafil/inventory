// N1 (ticket 16, 17, 22): **driver vero** dell'NFC (`react-native-nfc-manager` 3.17.2) per il servizio di
// `utils/nfcCore.ts`, solo sul telefono. Sul web Metro prende `nfcService.web.ts`, che non importa la libreria.
// Prima: avvio all'import, «pulisci + scrivi» in due passi con la gara 500/1000 ms (NG14) e una lettura senza chiamanti
// (NG16). Ora niente all'import, lettura a richiesta e scrittura in un tocco. Non provato sul telefono (NG20: la
// libreria 3.x è dichiarata per la vecchia architettura, il progetto ha `newArchEnabled=true`).
import { Platform } from 'react-native';
import NfcManager, { Ndef, NdefStatus, NfcError, NfcEvents, NfcTech, type TagEvent } from 'react-native-nfc-manager';
import { createNfcService, type NfcDriver, type NfcTagEvent } from './nfcCore';

const asTag = (tag: TagEvent | null): NfcTagEvent | null => (tag ? (tag as unknown as NfcTagEvent) : null);
// iOS: il pannello chiuso dall'utente arriva come `NfcError.UserCancel`, un errore senza messaggio: lo si dice «cancel»
// (il servizio lo legge come Annulla). Con `instanceof`, perché i nomi delle classi non restano nel bundle di release.
const cancelAware = <T,>(p: Promise<T>): Promise<T> => p.catch((error: unknown) => {
  throw error instanceof NfcError.UserCancel ? new Error('cancel') : error;
});

const driver: NfcDriver = {
  os: Platform.OS === 'ios' ? 'ios' : 'android',
  start: () => NfcManager.start(),
  isSupported: () => NfcManager.isSupported(),
  isEnabled: () => NfcManager.isEnabled(),
  registerTagEvent: (options) => NfcManager.registerTagEvent(options),
  unregisterTagEvent: () => NfcManager.unregisterTagEvent(),
  onTag: (listener) => NfcManager.setEventListener(NfcEvents.DiscoverTag, listener ? (tag: TagEvent) => listener(asTag(tag) ?? {}) : null),
  onStateChange: (listener) => NfcManager.setEventListener(
    NfcEvents.StateChanged,
    listener ? (event: { state?: string } | string) => listener(typeof event === 'string' ? event : event?.state ?? '') : null,
  ),
  requestNdef: async (options) => (await cancelAware(NfcManager.requestTechnology(NfcTech.Ndef, options))) != null,
  getTag: async () => asTag(await NfcManager.getTag()),
  ndefStatus: async () => {
    const s = await NfcManager.ndefHandler.getNdefStatus();
    return { writable: s.status === NdefStatus.ReadWrite, capacity: s.capacity };
  },
  writeNdef: (bytes) => cancelAware(NfcManager.ndefHandler.writeNdefMessage(bytes)),
  cancelRequest: () => NfcManager.cancelTechnologyRequest(),
};

const service = createNfcService(driver);
const writeOnce = async (bytes: number[]): Promise<boolean> => {
  const opened = await service.openForWrite();
  if (opened.esito !== 'pronto') { await service.cancel(); return false; }
  return (await service.write(bytes)).esito === 'scritto';
};

// Solo per i file residui di `app/` (expo-router di prima, fuori dal bundle), che `tsc` controlla ancora: stessi nomi
// di prima, fatti col servizio nuovo (una scrittura in un tocco). Da togliere insieme ad `app/`.
const legacy = {
  isSupported: () => driver.isSupported(),
  isEnabled: () => driver.isEnabled(),
  cleanTag: () => writeOnce(Ndef.encodeMessage([Ndef.record(Ndef.TNF_EMPTY, '', [], [])])),
  writeGS1Uri: (uri: string) => writeOnce(Ndef.encodeMessage([Ndef.uriRecord(uri)])),
};

export const nfcService = Object.assign(service, legacy);
