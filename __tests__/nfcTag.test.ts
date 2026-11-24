// N1 (ticket 16, 18, 22): logica pura dell'NFC (`utils/nfcTag.ts`): preferenze di Scanner e NFC rispettate, lettura di
// un tag dal lettore unico (UID collegato, poi testo), «Collega un tag», scrittura del codice e tag pieno, testi.
import Ndef from 'react-native-nfc-manager/ndef-lib';
import {
  DEFAULT_HARDWARE_CONFIG, formatUid, linkStep, nfcStateText, nfcUsable, offerTagWrite, outcomeText, parseHardwareConfig,
  readStep, readerSources, tagCode, tagContent, testText, textMessage, writeStep, type TagData,
} from '../utils/nfcTag';
import { resolveCode, tagOwners, type CodeSources } from '../utils/codes';

const LINK = 'https://syncroflow.app/id/01/VIS-0142/21/000142';
const sources: CodeSources = {
  products: [
    { id: 'cmp-1', sku: 'VIS-0142', gs1DigitalLink: LINK },
    { id: 'cmp-5', sku: 'VIS-0098' },
  ],
  locations: [
    { id: 'magazzino', label: 'Magazzino', barcode: 'LOC-MAGAZZINO' },
    { id: 'vetrina', label: 'Vetrina', barcode: 'LOC-VETRINA', nfcTag: '04:11:22:33' },
  ],
  categories: [{ id: 'pellicce', name: 'Pellicce', barcode: 'LIB-PELLICCE' }],
  shelves: [{ id: 's-a1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-MAG-A1', nfcTag: '04:A2:3B:1C' }],
};
const A1 = { kind: 'shelf' as const, id: 's-a1' };
const VETRINA = { kind: 'location' as const, id: 'vetrina' };
const MAGAZZINO = { kind: 'location' as const, id: 'magazzino' };
const VIS = { kind: 'product' as const, id: 'cmp-1' };

// Tag come lo dà la libreria: `id` esadecimale, `ndefMessage` con `type` in byte (dal telefono) o in testo
const bytes = (s: string) => Array.from(s).map((c) => c.charCodeAt(0));
const textTag = (text: string, id = '04B0C0D0E0F001'): TagData => ({ id, ndefMessage: Ndef.decodeMessage(textMessage(text)).map((r: any) => ({ ...r, type: bytes(r.type) })) });
const uriTag = (uri: string, id = '04B0C0D0E0F002'): TagData => ({ id, ndefMessage: Ndef.decodeMessage(Ndef.encodeMessage([Ndef.uriRecord(uri)])) });
const emptyTag = (id = '04B0C0D0E0F003'): TagData => ({ id, ndefMessage: [] });

describe('Scanner e NFC: le preferenze si rispettano (NG11 = D19)', () => {
  it('readerSources: Fotocamera, NFC, Tutti e due; senza NFC sempre la fotocamera (mai un lettore vuoto)', () => {
    expect(readerSources('qr_only', true)).toEqual({ camera: true, nfc: false });
    expect(readerSources('nfc_only', true)).toEqual({ camera: false, nfc: true });
    expect(readerSources('both', true)).toEqual({ camera: true, nfc: true });
    for (const mode of ['qr_only', 'nfc_only', 'both'] as const) expect(readerSources(mode, false)).toEqual({ camera: true, nfc: false });
    expect(readerSources(undefined, true)).toEqual({ camera: true, nfc: true });
  });

  it('nfcUsable: sul web no; sul telefono sì, salvo un telefono senza NFC (o con la libreria che non parte)', () => {
    expect(nfcUsable(false, null)).toBe(false);
    expect(nfcUsable(true, null)).toBe(true);
    expect(nfcUsable(true, 'attivo')).toBe(true);
    expect(nfcUsable(true, 'spento')).toBe(true); // c'è: la finestra dice di accenderlo
    expect(nfcUsable(true, 'assente')).toBe(false);
    // «NFC» salvato dalla schermata di prima su un telefono senza NFC: la fotocamera torna
    expect(readerSources('nfc_only', nfcUsable(true, 'assente'))).toEqual({ camera: true, nfc: false });
  });

  it('parseHardwareConfig: i valori salvati restano; ciò che non si capisce vale il predefinito', () => {
    expect(parseHardwareConfig(null)).toEqual(DEFAULT_HARDWARE_CONFIG);
    expect(parseHardwareConfig('non json')).toEqual(DEFAULT_HARDWARE_CONFIG);
    expect(parseHardwareConfig(JSON.stringify({ scanMode: 'nfc_only', autoWriteNfcOnSave: true })))
      .toEqual({ scanMode: 'nfc_only', autoWriteNfcOnSave: true, silenceAndroid: false });
    expect(parseHardwareConfig({ scanMode: 'boh', autoWriteNfcOnSave: 'sì' })).toEqual(DEFAULT_HARDWARE_CONFIG);
    expect(parseHardwareConfig({ scanMode: 'qr_only', silenceAndroid: true }).silenceAndroid).toBe(true);
    expect(DEFAULT_HARDWARE_CONFIG).toEqual({ scanMode: 'both', autoWriteNfcOnSave: false, silenceAndroid: false });
  });

  it('offerTagWrite: «Proponi di scrivere il tag» solo se acceso, con l\'NFC e non in «Fotocamera»', () => {
    const on = { ...DEFAULT_HARDWARE_CONFIG, autoWriteNfcOnSave: true };
    expect(offerTagWrite(on, true)).toBe(true);
    expect(offerTagWrite(on, false)).toBe(false); // web
    expect(offerTagWrite({ ...on, scanMode: 'qr_only' }, true)).toBe(false);
    expect(offerTagWrite({ ...on, scanMode: 'nfc_only' }, true)).toBe(true);
    expect(offerTagWrite(DEFAULT_HARDWARE_CONFIG, true)).toBe(false);
  });
});

describe('contenuto di un tag', () => {
  it('testo, link, vuoto, altro', () => {
    expect(tagContent(textTag('VIS-0142'))).toEqual({ kind: 'testo', text: 'VIS-0142' });
    expect(tagContent(uriTag(LINK))).toEqual({ kind: 'link', text: LINK });
    expect(tagContent(emptyTag())).toEqual({ kind: 'vuoto', text: null });
    expect(tagContent({ id: '01', ndefMessage: [{ tnf: 0, type: [], payload: [] }] })).toEqual({ kind: 'vuoto', text: null });
    expect(tagContent({ id: '01' })).toEqual({ kind: 'vuoto', text: null });
    expect(tagContent({ id: '01', ndefMessage: [{ tnf: 2, type: bytes('image/png'), payload: [1, 2, 3] }] })).toEqual({ kind: 'altro', text: null });
    expect(tagContent({ id: '01', ndefMessage: [{ tnf: 1, type: 'T', payload: [2, 101, 110, 32, 32] }] })).toEqual({ kind: 'vuoto', text: null });
  });

  it('textMessage: il codice come record di testo, letto uguale (NG14: un messaggio solo, sostituisce tutto)', () => {
    const msg = Ndef.decodeMessage(textMessage('SCAF-MAG-A1'));
    expect(msg).toHaveLength(1);
    expect(Ndef.isType(msg[0], Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)).toBe(true);
    expect(tagContent({ id: 'x', ndefMessage: msg }).text).toBe('SCAF-MAG-A1');
  });

  it('formatUid: due cifre per gruppo con i due punti, maiuscole; vuoto = null', () => {
    expect(formatUid('04a23b1c')).toBe('04:A2:3B:1C');
    expect(formatUid('04:A2:3B:1C')).toBe('04:A2:3B:1C');
    expect(formatUid('')).toBeNull();
    expect(formatUid(undefined)).toBeNull();
    expect(formatUid('zz')).toBeNull();
  });
});

describe('lettura (NG16): UID collegato, poi il testo dal lettore unico', () => {
  it('tagOwners: chi ha questo UID (posizioni, scaffali, categorie), scritto in qualunque modo', () => {
    expect(tagOwners('04A23B1C', sources)).toEqual([A1]);
    expect(tagOwners('04-a2-3b-1c', sources)).toEqual([A1]);
    expect(tagOwners('04A23B1C', sources, A1)).toEqual([]);
    expect(tagOwners('LOC-MAGAZZINO', sources)).toEqual([]); // un codice non è un UID
    expect(tagOwners('', sources)).toEqual([]);
  });

  it('tagCode e readStep: un UID collegato vince; poi il testo; un tag vuoto e sconosciuto lo dice in parole', () => {
    // il tag di A1 (UID salvato prima, NG18) con sopra il codice di un prodotto: vale il collegamento
    const a1 = textTag('VIS-0098', '04A23B1C');
    expect(tagCode(a1, sources)).toBe('04:A2:3B:1C');
    expect(resolveCode(tagCode(a1, sources)!, sources)).toEqual({ status: 'found', kind: 'shelf', id: 's-a1' });
    expect(readStep(a1, sources)).toEqual({ kind: 'code', code: '04:A2:3B:1C', via: 'uid' });
    // testo di ogni tipo di cosa
    for (const [text, kind, id] of [['VIS-0142', 'product', 'cmp-1'], ['LOC-MAGAZZINO', 'location', 'magazzino'], ['SCAF-MAG-A1', 'shelf', 's-a1'], ['LIB-PELLICCE', 'category', 'pellicce']]) {
      const code = tagCode(textTag(text), sources)!;
      expect(code).toBe(text);
      expect(resolveCode(code, sources)).toEqual({ status: 'found', kind, id });
    }
    // un tag scritto prima col link GS1 si legge ancora (vincolo 5)
    expect(resolveCode(tagCode(uriTag(LINK), sources)!, sources)).toEqual({ status: 'found', kind: 'product', id: 'cmp-1' });
    // testo sconosciuto: passa al lettore, che lo dice («Codice Non Riconosciuto» col testo)
    expect(readStep(textTag('XYZ-1'), sources)).toEqual({ kind: 'code', code: 'XYZ-1', via: 'testo' });
    // vuoto e non collegato: niente al lettore, una frase
    const vuoto = readStep(emptyTag(), sources);
    expect(vuoto.kind).toBe('nothing');
    expect(vuoto.kind === 'nothing' && vuoto.text).toMatch(/vuoto/i);
    expect(tagCode(emptyTag(), sources)).toBeNull();
    // vuoto ma collegato (tag bloccato collegato con «Collega un tag»): apre la sua cosa
    expect(tagCode(emptyTag('04112233'), sources)).toBe('04:11:22:33');
    expect(resolveCode('04:11:22:33', sources)).toEqual({ status: 'found', kind: 'location', id: 'vetrina' });
  });

  it('testText («Prova un tag»): che cosa è, in parole', () => {
    expect(testText(textTag('VIS-0142'), sources)).toBe('Tag letto: prodotto VIS-0142.');
    expect(testText(emptyTag('04A23B1C'), sources)).toBe('Tag letto: scaffale Magazzino › A1 (tag collegato).');
    expect(testText(emptyTag(), sources)).toBe('Tag letto: è vuoto e non è collegato a niente.');
    expect(testText(textTag('XYZ-1'), sources)).toBe('Tag letto: «XYZ-1», non corrisponde a niente.');
  });
});

describe('«Collega un tag»: mai un codice da scrivere (NG17, NG18)', () => {
  it('tag nuovo: si collega col suo UID', () => {
    expect(linkStep(textTag('', '04CAFE01'), MAGAZZINO, sources)).toEqual({ kind: 'link', uid: '04:CA:FE:01', clear: [] });
  });

  it('tag già suo: niente da fare', () => {
    const step = linkStep(emptyTag('04A23B1C'), A1, sources);
    expect(step.kind).toBe('already');
    expect(step.kind === 'already' && step.text).toBe('Questo tag è già di Magazzino › A1.');
  });

  it('tag di un\'altra cosa (UID o codice scritto sopra): «Questo tag è di …: sostituirlo?» e chi lo aveva lo perde', () => {
    const byUid = linkStep(emptyTag('04A23B1C'), MAGAZZINO, sources);
    expect(byUid).toEqual({ kind: 'confirm', uid: '04:A2:3B:1C', clear: [A1], text: 'Questo tag è di Magazzino › A1: sostituirlo?' });
    const byText = linkStep(textTag('VIS-0098', '04CAFE02'), MAGAZZINO, sources);
    expect(byText).toEqual({ kind: 'confirm', uid: '04:CA:FE:02', clear: [], text: 'Questo tag è di VIS-0098: sostituirlo?' });
  });

  it('tag senza numero: lo dice', () => {
    expect(linkStep({ ndefMessage: [] }, MAGAZZINO, sources).kind).toBe('no-id');
  });
});

describe('«Scrivi tag NFC»: il codice in un tocco, tag pieno con conferma', () => {
  it('vuoto, o con lo stesso codice, o col vecchio link dello stesso prodotto: si scrive subito', () => {
    expect(writeStep(emptyTag('04CAFE03'), 'LOC-MAGAZZINO', MAGAZZINO, sources, { writable: true })).toEqual({ kind: 'write', uid: '04:CA:FE:03', clear: [] });
    expect(writeStep(textTag('loc-magazzino', '04CAFE03'), 'LOC-MAGAZZINO', MAGAZZINO, sources, { writable: true }).kind).toBe('write');
    expect(writeStep(uriTag(LINK, '04CAFE04'), 'VIS-0142', VIS, sources, { writable: true }).kind).toBe('write');
  });

  it('con il codice di un\'altra cosa, o con un altro testo: mostra il contenuto e chiede', () => {
    expect(writeStep(textTag('VIS-0098', '04CAFE05'), 'VIS-0142', VIS, sources, { writable: true }))
      .toEqual({ kind: 'confirm', uid: '04:CA:FE:05', clear: [], text: 'Questo tag è di VIS-0098: sostituirlo?' });
    expect(writeStep(textTag('Promo inverno', '04CAFE06'), 'VIS-0142', VIS, sources, { writable: true }))
      .toEqual({ kind: 'confirm', uid: '04:CA:FE:06', clear: [], text: 'Sul tag c\'è «Promo inverno»: sostituirlo?' });
    expect(writeStep({ id: '04CAFE07', ndefMessage: [{ tnf: 2, type: bytes('image/png'), payload: [1] }] }, 'VIS-0142', VIS, sources, { writable: true }).kind).toBe('confirm');
  });

  it('UID collegato a un\'altra cosa: «è di …» e il collegamento passa a chi scrive', () => {
    expect(writeStep(emptyTag('04112233'), 'SCAF-MAG-A1', A1, sources, { writable: true }))
      .toEqual({ kind: 'confirm', uid: '04:11:22:33', clear: [VETRINA], text: 'Questo tag è di Vetrina: sostituirlo?' });
    // un prodotto non ha il tag salvato: il collegamento della posizione si toglie lo stesso
    expect(writeStep(emptyTag('04112233'), 'VIS-0142', VIS, sources, { writable: true }).clear).toEqual([VETRINA]);
  });

  it('tag bloccato: non si scrive; per le cose con il tag la via è «Collega un tag»', () => {
    const step = writeStep(textTag('XYZ', '04CAFE08'), 'SCAF-MAG-A1', A1, sources, { writable: false });
    expect(step.kind).toBe('readonly');
    expect(step.kind === 'readonly' && step.text).toMatch(/Collega un tag/);
    const prodotto = writeStep(textTag('XYZ', '04CAFE08'), 'VIS-0142', VIS, sources, { writable: false });
    expect(prodotto.kind === 'readonly' && prodotto.text).not.toMatch(/Collega/);
  });
});

describe('testi: mai «Errore» né «Operazione annullata» (NG12, NG19)', () => {
  it('stato dell\'NFC in una riga', () => {
    expect(nfcStateText('web')).toEqual({ text: 'L\'NFC si usa dal telefono', tone: 'off' });
    expect(nfcStateText('attivo')).toEqual({ text: 'NFC pronto', tone: 'ok' });
    expect(nfcStateText('spento').tone).toBe('warn');
    expect(nfcStateText('assente').text).toBe('Questo telefono non ha l\'NFC');
  });

  it('esiti: annullato in silenzio, gli altri in parole con la via d\'uscita', () => {
    expect(outcomeText({ esito: 'annullato' }, 'leggi')).toBeNull();
    expect(outcomeText({ esito: 'non-disponibile' }, 'scrivi')).toBe('L\'NFC si usa dal telefono.');
    expect(outcomeText({ esito: 'tempo-scaduto' }, 'leggi')).toBe('Nessun tag letto. Riprova.');
    expect(outcomeText({ esito: 'errore', messaggio: 'x' }, 'scrivi')).toBe('Scrittura non riuscita: tieni fermo il tag e riprova.');
    for (const esito of ['occupato', 'nfc-spento', 'assente', 'non-ndef', 'non-disponibile', 'tempo-scaduto'] as const) {
      for (const mode of ['leggi', 'scrivi', 'collega', 'prova'] as const) {
        const text = outcomeText({ esito } as any, mode) ?? '';
        expect(text).not.toMatch(/errore|annullat/i);
      }
    }
  });
});
