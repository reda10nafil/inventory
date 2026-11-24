// ACC1 (ticket 32): ruoli e permessi di questo telefono. Quattro ruoli italiani, una tabella di permessi per azione,
// `can(ruolo, azione)`. Il Titolare è l'amministratore: può tutto e solo lui gestisce i ruoli (riga fissa).
import {
  ACTIONS, DEFAULT_PERMISSIONS, ROLES, can, deniedReason, isRole, normalizePermissions, roleName, setPermission,
} from '../utils/roles';

describe('ruoli (ACC1)', () => {
  it('quattro ruoli con i nomi italiani, nell\'ordine', () => {
    expect(ROLES.map((r) => r.name)).toEqual(['Titolare', 'Responsabile', 'Operatore', 'Solo lettura']);
    expect(ROLES.every((r) => r.description.length > 0)).toBe(true);
    expect(roleName('lettura')).toBe('Solo lettura');
    expect(isRole('operatore')).toBe(true);
    expect(isRole('owner')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it('le azioni della tabella', () => {
    expect(ACTIONS.map((a) => a.id)).toEqual(['aggiungere', 'modificare', 'vendere', 'eliminare', 'impostazioni', 'ruoli']);
  });

  it('tabella di partenza: Titolare tutto, Responsabile tutto tranne i ruoli, Operatore senza eliminare né impostazioni, Solo lettura niente', () => {
    for (const a of ACTIONS) expect(can('titolare', a.id)).toBe(true);
    expect(ACTIONS.filter((a) => can('responsabile', a.id)).map((a) => a.id)).toEqual(['aggiungere', 'modificare', 'vendere', 'eliminare', 'impostazioni']);
    expect(ACTIONS.filter((a) => can('operatore', a.id)).map((a) => a.id)).toEqual(['aggiungere', 'modificare', 'vendere']);
    expect(ACTIONS.filter((a) => can('lettura', a.id)).map((a) => a.id)).toEqual([]);
  });

  it('can con una tabella cambiata dal Titolare', () => {
    const t = setPermission(DEFAULT_PERMISSIONS, 'operatore', 'eliminare', true);
    expect(can('operatore', 'eliminare', t)).toBe(true);
    expect(can('operatore', 'eliminare')).toBe(false); // la tabella di partenza non cambia
    expect(DEFAULT_PERMISSIONS.operatore.eliminare).toBe(false);
  });

  it('il Titolare non si toglie nulla e «gestire i ruoli» resta solo suo', () => {
    const t1 = setPermission(DEFAULT_PERMISSIONS, 'titolare', 'eliminare', false);
    expect(can('titolare', 'eliminare', t1)).toBe(true);
    const t2 = setPermission(DEFAULT_PERMISSIONS, 'responsabile', 'ruoli', true);
    expect(can('responsabile', 'ruoli', t2)).toBe(false);
    expect(t1).toEqual(DEFAULT_PERMISSIONS);
    expect(t2).toEqual(DEFAULT_PERMISSIONS);
  });

  it('ruolo sconosciuto o mancante: nessun permesso', () => {
    expect(can('owner' as any, 'aggiungere')).toBe(false);
    expect(can(undefined as any, 'aggiungere')).toBe(false);
  });

  it('tabella salvata: si tiene ciò che è valido, il resto torna di partenza', () => {
    expect(normalizePermissions(null)).toEqual(DEFAULT_PERMISSIONS);
    expect(normalizePermissions('rotta')).toEqual(DEFAULT_PERMISSIONS);
    expect(normalizePermissions([])).toEqual(DEFAULT_PERMISSIONS);
    const t = normalizePermissions({
      operatore: { eliminare: true, vendere: 'sì', ruoli: true },
      lettura: { aggiungere: true },
      titolare: { aggiungere: false },
      ospite: { aggiungere: true },
    });
    expect(t.operatore).toEqual({ ...DEFAULT_PERMISSIONS.operatore, eliminare: true });
    expect(t.lettura).toEqual({ ...DEFAULT_PERMISSIONS.lettura, aggiungere: true });
    expect(t.titolare).toEqual(DEFAULT_PERMISSIONS.titolare);
    expect(Object.keys(t).sort()).toEqual(['lettura', 'operatore', 'responsabile', 'titolare']);
  });

  it('motivo in parole, con il ruolo e dove si cambia', () => {
    expect(deniedReason('operatore', 'eliminare')).toBe('Il ruolo Operatore non può eliminare. Lo decide il Titolare in Accesso.');
    expect(deniedReason('lettura', 'impostazioni')).toBe('Il ruolo Solo lettura non può cambiare le impostazioni. Lo decide il Titolare in Accesso.');
    expect(deniedReason('responsabile', 'ruoli')).toBe('Solo il Titolare cambia i permessi.');
  });
});
