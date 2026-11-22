import type { TimelineEvent } from '../types';
import {
  CONTACT_KIND_LABELS,
  contactData,
  contactDeleteError,
  contactEvents,
  contactLabel,
  contactName,
  contactNameError,
  contactUsage,
  contactsForMovement,
  filterContacts,
  newContactId,
  parseContacts,
  type Contact,
} from '../utils/contacts';

const rossi: Contact = { id: 'c1', name: 'Rossi srl', kind: 'fornitore', phone: '333 1234567' };
const bianchi: Contact = { id: 'c2', name: 'Bianchi', kind: 'cliente' };
const conceria: Contact = { id: 'c3', name: 'Àncora Conceria', kind: 'fornitore' };
const verdi: Contact = { id: 'c4', name: 'verdi', kind: 'cliente', email: 'v@example.com', note: 'paga a 30 giorni' };
const all = [rossi, bianchi, conceria, verdi];

describe('parseContacts (M10)', () => {
  it('senza lista salvata, o con una lista rovinata, l\'elenco è vuoto e non lancia', () => {
    expect(parseContacts(null)).toEqual([]);
    expect(parseContacts(undefined)).toEqual([]);
    expect(parseContacts('')).toEqual([]);
    expect(parseContacts('{non json')).toEqual([]);
    expect(parseContacts('{"id":"x"}')).toEqual([]);
    expect(parseContacts('null')).toEqual([]);
  });
  it('legge i contatti salvati con i campi facoltativi', () => {
    expect(parseContacts(JSON.stringify(all))).toEqual(all);
  });
  it('scarta le voci malformate: senza id o nome, tipo sconosciuto, id doppio, non oggetti', () => {
    const raw = JSON.stringify([
      rossi,
      null,
      'testo',
      42,
      { id: '', name: 'Senza id', kind: 'cliente' },
      { id: 'x1', name: '   ', kind: 'cliente' },
      { id: 'x2', name: 'Tipo sbagliato', kind: 'amico' },
      { id: 'x3', name: 'Senza tipo' },
      { id: 'c1', name: 'Doppione di id', kind: 'cliente' },
      { id: 7, name: 'Id numero', kind: 'cliente' },
      bianchi,
    ]);
    expect(parseContacts(raw)).toEqual([rossi, bianchi]);
  });
  it('toglie gli spazi attorno e i facoltativi vuoti o non testuali', () => {
    const raw = JSON.stringify([{ id: ' a ', name: ' Neri ', kind: 'cliente', phone: '  ', email: 5, note: ' urgente ', altro: true }]);
    expect(parseContacts(raw)).toEqual([{ id: 'a', name: 'Neri', kind: 'cliente', note: 'urgente' }]);
  });
});

describe('contactData', () => {
  it('pulisce i dati del modulo: spazi tolti, facoltativi vuoti non salvati', () => {
    expect(contactData({ name: '  Rossi srl ', kind: 'fornitore', phone: ' 333 ', email: '', note: '   ' }))
      .toEqual({ name: 'Rossi srl', kind: 'fornitore', phone: '333' });
  });
});

describe('newContactId', () => {
  it('è opaco come l\'id dei prodotti: non dipende dal nome', () => {
    const id = newContactId([], 1700000000000, 0.123456789);
    expect(id).toMatch(/^1700000000000-[a-z0-9]+$/);
    expect(id).not.toMatch(/rossi/i);
  });
  it('non riusa un id che c\'è già, anche nello stesso istante con lo stesso numero', () => {
    const first = newContactId([], 1700000000000, 0.5);
    const second = newContactId([{ id: first }], 1700000000000, 0.5);
    expect(second).not.toBe(first);
    expect(newContactId([{ id: first }, { id: second }], 1700000000000, 0.5)).not.toBe(second);
  });
  it('due contatti creati di seguito hanno id diversi', () => {
    const a = newContactId([]);
    expect(newContactId([{ id: a }])).not.toBe(a);
  });
});

describe('contactNameError', () => {
  it('nome vuoto', () => expect(contactNameError('  ', 'cliente', all)).toMatch(/Inserisci/));
  it('doppione dello stesso tipo, maiuscole e accenti indifferenti', () => {
    expect(contactNameError(' ROSSI SRL ', 'fornitore', all)).toBe('Esiste già il fornitore "ROSSI SRL"');
    expect(contactNameError('ancora conceria', 'fornitore', all)).toMatch(/Esiste già il fornitore/);
    expect(contactNameError('Verdi', 'cliente', all)).toBe('Esiste già il cliente "Verdi"');
  });
  it('la stessa ditta può essere fornitore e cliente: sono due voci', () => {
    expect(contactNameError('Rossi srl', 'cliente', all)).toBeNull();
    expect(contactNameError('Bianchi', 'fornitore', all)).toBeNull();
  });
  it('modificare un contatto lasciando il suo nome va bene; cambiargli tipo verso un doppione no', () => {
    expect(contactNameError('ROSSI srl', 'fornitore', all, 'c1')).toBeNull();
    const both = [...all, { id: 'c5', name: 'Rossi srl', kind: 'cliente' as const }];
    expect(contactNameError('Rossi srl', 'cliente', both, 'c1')).toMatch(/Esiste già il cliente/);
  });
});

describe('filterContacts', () => {
  it('per nome, senza badare a maiuscole e accenti', () => {
    expect(filterContacts(all, 'tutti').map((c) => c.id)).toEqual(['c3', 'c2', 'c1', 'c4']);
  });
  it('solo fornitori o solo clienti', () => {
    expect(filterContacts(all, 'fornitore').map((c) => c.id)).toEqual(['c3', 'c1']);
    expect(filterContacts(all, 'cliente').map((c) => c.id)).toEqual(['c2', 'c4']);
  });
  it('non modifica l\'elenco ricevuto', () => {
    const copy = [...all];
    filterContacts(all, 'tutti');
    expect(all).toEqual(copy);
  });
});

describe('contactsForMovement', () => {
  it('carico: prima i fornitori, poi i clienti (un reso viene da un cliente); nessuno è tolto', () => {
    expect(contactsForMovement(all, 'carico').map((c) => c.id)).toEqual(['c3', 'c1', 'c2', 'c4']);
  });
  it('scarico: prima i clienti, poi i fornitori', () => {
    expect(contactsForMovement(all, 'scarico').map((c) => c.id)).toEqual(['c2', 'c4', 'c3', 'c1']);
  });
  it('trasferimento e rettifica: nessun contatto', () => {
    expect(contactsForMovement(all, 'trasferimento')).toEqual([]);
    expect(contactsForMovement(all, 'rettifica')).toEqual([]);
  });
});

describe('nomi', () => {
  it('contactName: il nome, o undefined se l\'id non c\'è (il CSV ripiega sull\'id)', () => {
    expect(contactName(all, 'c1')).toBe('Rossi srl');
    expect(contactName(all, 'sparito')).toBeUndefined();
    expect(contactName(all, undefined)).toBeUndefined();
  });
  it('contactLabel: tipo e nome, o undefined se l\'id non c\'è', () => {
    expect(contactLabel(all, 'c1')).toBe('Fornitore Rossi srl');
    expect(contactLabel(all, 'c2')).toBe('Cliente Bianchi');
    expect(contactLabel(all, 'sparito')).toBeUndefined();
    expect(CONTACT_KIND_LABELS).toEqual({ fornitore: 'Fornitore', cliente: 'Cliente' });
  });
});

describe('movimenti di un contatto', () => {
  const ev = (id: string, details: TimelineEvent['details'], productId = 'p1', type: TimelineEvent['type'] = 'stock'): TimelineEvent =>
    ({ id, productId, type, timestamp: '2026-11-22T10:00:00.000Z', details });
  const timeline = [
    ev('5', { movement: 'scarico', qty: 1, from: 'vetrina', reason: 'vendita', contactId: 'c2' }),
    ev('4', { movement: 'carico', qty: 3, to: 'magazzino', reason: 'acquisto', contactId: 'c1' }, 'eliminato-per-sempre'),
    ev('3', { movement: 'carico', qty: 2, to: 'magazzino' }),
    ev('2', { from: 'vetrina', to: 'magazzino', contactId: 'c1' }, 'p1', 'moved'),
    ev('1', { movement: 'carico', qty: 5, to: 'magazzino', reason: 'acquisto', contactId: 'c1' }),
  ];

  it('contactEvents: gli eventi `stock` con quel contatto, nell\'ordine della Cronologia', () => {
    expect(contactEvents(timeline, 'c1').map((e) => e.id)).toEqual(['4', '1']);
    expect(contactEvents(timeline, 'c2').map((e) => e.id)).toEqual(['5']);
    expect(contactEvents(timeline, 'c3')).toEqual([]);
  });
  it('conta anche i movimenti di un prodotto eliminato per sempre (restano in Cronologia e nel report)', () => {
    expect(contactEvents(timeline, 'c1').some((e) => e.productId === 'eliminato-per-sempre')).toBe(true);
  });
  it('un evento che non è un movimento non conta, anche se ha un contatto scritto', () => {
    expect(contactEvents(timeline, 'c1').some((e) => e.type !== 'stock')).toBe(false);
  });
  it('contactUsage: «usato» e «i suoi movimenti» sono lo stesso filtro', () => {
    const usage = contactUsage(timeline);
    expect(usage).toEqual({ c1: 2, c2: 1 });
    for (const c of all) expect(usage[c.id] ?? 0).toBe(contactEvents(timeline, c.id).length);
  });
  it('contactDeleteError: non si elimina un contatto usato', () => {
    expect(contactDeleteError(rossi, 0)).toBeNull();
    expect(contactDeleteError(rossi, 1)).toMatch(/"Rossi srl" compare in 1 movimento:/);
    expect(contactDeleteError(rossi, 3)).toMatch(/"Rossi srl" compare in 3 movimenti:/);
  });
});
