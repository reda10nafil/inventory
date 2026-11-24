// RETE0 (ticket 32): «Rete del negozio» in funzioni pure. Codice del centro, messaggi della rete (hello, presenza),
// battito, stato in una riga, righe dei telefoni con «online dalle…» e «visto alle…», chiave per spazio.
import {
  HEARTBEAT_MS, SILENCE_MS, atText, buildCenterCode, centerUrl, cleanName, codeError, durationText, helloMessage,
  isLocalAddress, isSilent, linkErrorText, networkKey, normalizeNetworkSettings, onlineCount, phoneFromHello,
  phoneRow, presenceMessage, readCenterCode, readPresence, retryDelay, settingsSubtitle, sinceText, statusLine,
  type PresencePhone,
} from '../utils/storeNetwork';

// 24 novembre 2026, ora locale
const at = (h: number, m: number, d = 24) => new Date(2026, 10, d, h, m).getTime();
const NOW = at(10, 50);

describe('codice del centro (RETE0)', () => {
  it('legge il codice del centro, col nome', () => {
    const r = readCenterCode(' ws://192.168.1.50:8080?token=0123456789ABCDEF&name=Magazzino ');
    expect(r).toEqual({ ok: true, code: { ip: '192.168.1.50', port: 8080, token: '0123456789ABCDEF', name: 'Magazzino' } });
    const senzaNome = readCenterCode('ws://10.0.0.7:9000?token=ABCDEF12');
    expect(senzaNome.ok && senzaNome.code.name).toBe('');
    const senzaPorta = readCenterCode('ws://10.0.0.7?token=ABCDEF12');
    expect(senzaPorta.ok && senzaPorta.code.port).toBe(8080);
  });

  it('rifiuta prima della domanda ciò che non è un codice della rete, con il motivo', () => {
    expect(readCenterCode('')).toEqual({ ok: false, reason: 'vuoto' });
    expect(readCenterCode('   ')).toEqual({ ok: false, reason: 'vuoto' });
    expect(readCenterCode('abc')).toEqual({ ok: false, reason: 'non-codice' });
    expect(readCenterCode('http://192.168.1.50:8080?token=0123456789ABCDEF')).toEqual({ ok: false, reason: 'non-codice' });
    expect(readCenterCode('ws://192.168.1.50:8080')).toEqual({ ok: false, reason: 'senza-chiave' });
    expect(readCenterCode('ws://192.168.1.50:8080?token=ab')).toEqual({ ok: false, reason: 'senza-chiave' });
    expect(readCenterCode('ws://192.168.1.50:8080?token=AB CD EF 12')).toEqual({ ok: false, reason: 'senza-chiave' });
    // un indirizzo di internet o un nome: la rete del negozio è solo locale
    expect(readCenterCode('ws://203.0.113.7:8080?token=0123456789ABCDEF')).toEqual({ ok: false, reason: 'fuori-rete' });
    expect(readCenterCode('wss://esempio.it:443?token=0123456789ABCDEF')).toEqual({ ok: false, reason: 'fuori-rete' });
    expect(readCenterCode('ws://192.168.1.50:0?token=0123456789ABCDEF')).toEqual({ ok: false, reason: 'non-codice' });
    expect(readCenterCode('ws://192.168.1.50:8080/altro?token=0123456789ABCDEF')).toEqual({ ok: false, reason: 'non-codice' });
    expect(readCenterCode('x'.repeat(600))).toEqual({ ok: false, reason: 'non-codice' });
    for (const reason of ['vuoto', 'non-codice', 'senza-chiave', 'fuori-rete'] as const) {
      expect(codeError(reason)).not.toMatch(/ws:|\bIP\b|porta|[Hh]ost|token|\d/);
    }
  });

  it('indirizzi della rete locale', () => {
    for (const ip of ['10.0.0.1', '172.16.4.2', '172.31.255.1', '192.168.0.10', '127.0.0.1', '169.254.3.3']) expect(isLocalAddress(ip)).toBe(true);
    for (const ip of ['172.32.0.1', '8.8.8.8', '203.0.113.7', 'esempio.it', 'localhost', '256.1.1.1', '192.168.1']) expect(isLocalAddress(ip)).toBe(false);
  });

  it('scrive il codice da mostrare e l\'indirizzo per collegarsi (senza il nome)', () => {
    const code = { ip: '192.168.1.50', port: 8080, token: '0123456789ABCDEF', name: 'Magazzino "Nord"' };
    const testo = buildCenterCode(code);
    expect(readCenterCode(testo)).toEqual({ ok: true, code });
    expect(centerUrl(code)).toBe('ws://192.168.1.50:8080?token=0123456789ABCDEF');
  });
});

describe('messaggi della rete (RETE0)', () => {
  it('hello col nome di questo telefono', () => {
    expect(helloMessage('TOK12345', { id: 'tel-1', name: 'Mario · Banco 1' }, 'web'))
      .toEqual({ type: 'hello', token: 'TOK12345', platform: 'web', phone: { id: 'tel-1', name: 'Mario · Banco 1' } });
  });

  it('il centro prende dal telefono sconosciuto solo un id e un nome puliti', () => {
    expect(phoneFromHello({ phone: { id: 'tel-1', name: '  Banco 1 ' } }, 'riserva')).toEqual({ id: 'tel-1', name: 'Banco 1' });
    expect(phoneFromHello({}, 'riserva')).toEqual({ id: 'riserva', name: 'Telefono senza nome' });
    expect(phoneFromHello({ phone: { id: 42, name: { a: 1 } } }, 'riserva')).toEqual({ id: 'riserva', name: 'Telefono senza nome' });
    const lungo = phoneFromHello({ phone: { id: 'x'.repeat(500), name: `A\u0000B\u202e${'c'.repeat(200)}` } }, 'riserva');
    expect(lungo.id.length).toBeLessThanOrEqual(80);
    expect(lungo.name.startsWith('AB')).toBe(true);
    expect(lungo.name.length).toBeLessThanOrEqual(40);
    expect(cleanName('\n\t ', 'Senza nome')).toBe('Senza nome');
  });

  it('presenza: il centro la scrive, il telefono la rilegge con l\'ora sua', () => {
    const phones: PresencePhone[] = [
      { id: 'tel-1', name: 'Banco 1', since: at(10, 42), lastSeen: at(10, 49), online: true },
      { id: 'tel-2', name: 'Cassa', since: at(9, 0), lastSeen: at(10, 40), online: false },
    ];
    const msg = presenceMessage({ name: 'Magazzino', since: at(9, 30) }, phones, NOW);
    expect(msg).toEqual({ type: 'presence', ts: NOW, center: { name: 'Magazzino', since: at(9, 30) }, phones });
    // l'orologio del centro va avanti di 2 minuti: le ore si riportano a quello di questo telefono
    const due = 2 * 60_000;
    const letto = readPresence(presenceMessage({ name: 'Magazzino', since: at(9, 30) + due }, phones.map((p) => ({ ...p, since: p.since + due, lastSeen: p.lastSeen + due })), NOW + due), NOW);
    expect(letto).toEqual({ centerName: 'Magazzino', centerSince: at(9, 30), phones });
  });

  it('presenza: si scarta ciò che non torna e si taglia l\'elenco', () => {
    expect(readPresence(null, NOW)).toBeNull();
    expect(readPresence({ type: 'presence', ts: 'ieri' }, NOW)).toBeNull();
    const molti = Array.from({ length: 80 }, (_, i) => ({ id: `t${i}`, name: `T${i}`, since: NOW, lastSeen: NOW, online: true }));
    const r = readPresence({ type: 'presence', ts: NOW, center: { name: 'C', since: NOW }, phones: [...molti, 'rotto', { id: 5 }] }, NOW);
    expect(r?.phones.length).toBe(50);
    const strano = readPresence({ type: 'presence', ts: NOW, center: { name: 7 }, phones: [{ id: 'a', name: '', since: 'x', lastSeen: null, online: 'si' }] }, NOW);
    expect(strano).toEqual({ centerName: '', centerSince: NOW, phones: [{ id: 'a', name: 'Telefono senza nome', since: NOW, lastSeen: NOW, online: false }] });
  });
});

describe('battito e ritentativi (RETE0)', () => {
  it('un segnale ogni 10 s, «non risponde» dopo 30 s', () => {
    expect(HEARTBEAT_MS).toBe(10_000);
    expect(SILENCE_MS).toBe(30_000);
    expect(isSilent(NOW - 29_000, NOW)).toBe(false);
    expect(isSilent(NOW - 30_001, NOW)).toBe(true);
    expect(isSilent(undefined, NOW)).toBe(false);
  });

  it('ritenta dopo 2, 5, 10 s e poi ogni 15 s', () => {
    expect([0, 1, 2, 3, 4, 9].map(retryDelay)).toEqual([2000, 5000, 10000, 15000, 15000, 15000]);
  });
});

describe('ore e durate scritte a mano (RETE0, AR08)', () => {
  it('oggi solo l\'ora, gli altri giorni anche la data', () => {
    expect(sinceText(at(10, 42), NOW)).toBe('dalle 10:42');
    expect(sinceText(at(9, 5), NOW)).toBe('dalle 09:05');
    expect(atText(at(10, 40), NOW)).toBe('alle 10:40');
    expect(atText(at(18, 3, 23), NOW)).toBe('il 23 nov alle 18:03');
    expect(sinceText(at(8, 0, 22), NOW)).toBe('dal 22 nov alle 08:00');
  });

  it('da quanto', () => {
    expect(durationText(20_000)).toBe('da meno di un minuto');
    expect(durationText(2 * 60_000 + 5_000)).toBe('da 2 min');
    expect(durationText(3 * 3600_000 + 60_000)).toBe('da 3 ore');
    expect(durationText(3600_000)).toBe('da 1 ora');
  });
});

describe('telefoni e stato in una riga (RETE0)', () => {
  const phones: PresencePhone[] = [
    { id: 'tel-me', name: 'Mario · Banco 1', since: at(10, 43), lastSeen: at(10, 49), online: true },
    { id: 'tel-2', name: 'Banco 2', since: at(10, 30), lastSeen: at(10, 49), online: true },
    { id: 'tel-3', name: 'Cassa', since: at(9, 0), lastSeen: at(10, 40), online: false },
  ];

  it('righe: online dalle…, visto alle…', () => {
    expect(phoneRow(phones[1], NOW)).toEqual({ online: true, state: 'Online', detail: 'online dalle 10:30' });
    expect(phoneRow(phones[2], NOW)).toEqual({ online: false, state: 'Non in linea', detail: 'visto alle 10:40' });
    // centro perso: chi era online è «visto» all'ultima notizia
    expect(phoneRow(phones[1], NOW, at(10, 45))).toEqual({ online: false, state: 'Non in linea', detail: 'visto alle 10:45' });
    expect(onlineCount(phones)).toBe(2);
  });

  it('stato in una riga, mai «pronto» se non lo è', () => {
    expect(statusLine({ role: 'none', link: 'idle', phones: [] }, NOW)).toEqual({ tone: 'off', text: 'Non collegato' });
    expect(statusLine({ role: 'client', link: 'connecting', centerName: 'Magazzino', phones: [] }, NOW))
      .toEqual({ tone: 'busy', text: 'Collegamento al centro "Magazzino"…' });
    // centro + 2 telefoni online
    expect(statusLine({ role: 'client', link: 'connected', centerName: 'Magazzino', phones }, NOW))
      .toEqual({ tone: 'on', text: 'Collegato al centro "Magazzino" · 3 telefoni online' });
    expect(statusLine({ role: 'client', link: 'silent', centerName: 'Magazzino', silentSince: NOW - 2 * 60_000, phones }, NOW))
      .toEqual({ tone: 'warn', text: 'Il centro "Magazzino" non risponde da 2 min' });
    expect(statusLine({ role: 'client', link: 'silent', centerName: '', silentSince: NOW - 5_000, phones: [] }, NOW))
      .toEqual({ tone: 'warn', text: 'Il centro non risponde da meno di un minuto' });
    expect(statusLine({ role: 'host', link: 'connected', phones: phones.slice(1) }, NOW))
      .toEqual({ tone: 'on', text: 'Questo telefono è il centro · 1 telefono collegato' });
    expect(statusLine({ role: 'host', link: 'connected', phones: [] }, NOW))
      .toEqual({ tone: 'on', text: 'Questo telefono è il centro · nessun telefono collegato' });
    expect(statusLine({ role: 'host', link: 'idle', phones: [] }, NOW)).toEqual({ tone: 'off', text: 'Centro spento' });
    expect(statusLine({ role: 'host', link: 'connecting', phones: [] }, NOW)).toEqual({ tone: 'busy', text: 'Accensione del centro…' });
  });

  it('sottotitolo in Impostazioni: lo stato vero, corto', () => {
    expect(settingsSubtitle({ role: 'none', link: 'idle', phones: [] })).toBe('Non collegato');
    expect(settingsSubtitle({ role: 'client', link: 'connected', centerName: 'Magazzino', phones })).toBe('Collegato al centro "Magazzino"');
    expect(settingsSubtitle({ role: 'client', link: 'silent', centerName: 'Magazzino', phones })).toBe('Il centro non risponde');
    expect(settingsSubtitle({ role: 'client', link: 'connecting', centerName: 'Magazzino', phones })).toBe('Collegamento in corso');
    expect(settingsSubtitle({ role: 'host', link: 'connected', phones: phones.slice(1) })).toBe('Fa da centro · 1 telefono');
    expect(settingsSubtitle({ role: 'host', link: 'idle', phones: [] })).toBe('Centro spento');
  });

  it('errori del collegamento in parole, senza indirizzi, porte o «Host»', () => {
    for (const k of ['non-risponde', 'rifiutato', 'chiuso', 'tempo'] as const) {
      expect(linkErrorText(k)).not.toMatch(/ws:|\bIP\b|porta|[Hh]ost|adb|Mercusys|LAN|\d/);
    }
    expect(linkErrorText('non-risponde')).toBe('Il centro non risponde: controlla che sia acceso e sulla stessa rete Wi-Fi.');
  });
});

describe('chiave della rete per spazio (RETE0)', () => {
  it('nome della chiave', () => {
    expect(networkKey('local')).toBe('network:v1:local:settings');
  });

  it('rilegge ciò che si può usare; sul web non si fa da centro', () => {
    expect(normalizeNetworkSettings(null, 'web')).toEqual({ role: 'none' });
    expect(normalizeNetworkSettings('rotto', 'android')).toEqual({ role: 'none' });
    const center = { ip: '192.168.1.50', port: 8080, token: '0123456789ABCDEF', name: 'Magazzino', lastSeen: at(10, 40) };
    expect(normalizeNetworkSettings({ role: 'client', center }, 'web')).toEqual({ role: 'client', center });
    // un centro salvato che non è più un codice valido: si dimentica
    expect(normalizeNetworkSettings({ role: 'client', center: { ...center, ip: '8.8.8.8' } }, 'web')).toEqual({ role: 'none' });
    expect(normalizeNetworkSettings({ role: 'host', hostToken: 'ABCDEF1234567890' }, 'android')).toEqual({ role: 'host', hostToken: 'ABCDEF1234567890' });
    expect(normalizeNetworkSettings({ role: 'host', hostToken: 'ABCDEF1234567890' }, 'web')).toEqual({ role: 'none', hostToken: 'ABCDEF1234567890' });
    expect(normalizeNetworkSettings({ role: 'host', hostToken: 'no' }, 'android')).toEqual({ role: 'host' });
    expect(normalizeNetworkSettings({ role: 'boh' }, 'android')).toEqual({ role: 'none' });
  });
});
