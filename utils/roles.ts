// Ruoli e permessi di questo telefono (ACC1, ticket 32). Un solo elenco di ruoli, in italiano: Titolare, Responsabile,
// Operatore, Solo lettura (al posto di `admin/editor/viewer` di `useTeamPermissions` e di `owner/admin/operator/viewer`
// del database, AR19). Una tabella di permessi per azione e `can(ruolo, azione)`. Il Titolare è l'amministratore:
// può tutto (riga fissa) e solo lui gestisce i ruoli, cioè cambia la tabella. Senza account i ruoli valgono su questo
// telefono (chiave `device:v1:permissions`): proteggono dagli errori, non da chi vuole aggirarli; diventano sicuri con
// gli account (ACC3). Funzioni pure, senza React.

export type Role = 'titolare' | 'responsabile' | 'operatore' | 'lettura';
export type Action = 'aggiungere' | 'modificare' | 'vendere' | 'eliminare' | 'impostazioni' | 'ruoli';

export const ROLES: readonly { id: Role; name: string; description: string }[] = [
  { id: 'titolare', name: 'Titolare', description: 'Può tutto e decide che cosa possono fare gli altri.' },
  { id: 'responsabile', name: 'Responsabile', description: 'Gestisce prodotti e impostazioni, non i permessi.' },
  { id: 'operatore', name: 'Operatore', description: 'Aggiunge, modifica e vende. Non elimina e non cambia le impostazioni.' },
  { id: 'lettura', name: 'Solo lettura', description: 'Guarda l\'inventario senza cambiare nulla.' },
];

/** Azioni della tabella: `verb` completa «Il ruolo X non può …»; `where` dice dove vale oggi (il resto dell'app
 *  arriva con gli account). `ruoli` è solo del Titolare e non si cambia. */
export const ACTIONS: readonly { id: Action; name: string; verb: string; where: string }[] = [
  { id: 'aggiungere', name: 'Aggiungere prodotti', verb: 'aggiungere prodotti', where: 'Aggiungi e Importa prodotti CSV' },
  { id: 'modificare', name: 'Modificare e movimentare', verb: 'modificare i prodotti', where: 'Modifica e Movimenta nella Scheda' },
  { id: 'vendere', name: 'Vendere', verb: 'vendere', where: "Venduto nell'Azione rapida e causale Vendita di Movimenta" },
  { id: 'eliminare', name: 'Eliminare', verb: 'eliminare', where: 'Elimina nella Home e nel Cestino' },
  { id: 'impostazioni', name: 'Cambiare le impostazioni', verb: 'cambiare le impostazioni', where: 'Voci di Impostazioni che cambiano campi, categorie, posti, codici e il Cestino' },
  { id: 'ruoli', name: 'Gestire i ruoli', verb: 'gestire i ruoli', where: 'Ruoli e permessi in Accesso' },
];

export type Permissions = Record<Role, Record<Action, boolean>>;

const row = (allowed: Action[]): Record<Action, boolean> =>
  Object.fromEntries(ACTIONS.map((a) => [a.id, allowed.includes(a.id)])) as Record<Action, boolean>;

export const DEFAULT_PERMISSIONS: Permissions = Object.freeze({
  titolare: row(ACTIONS.map((a) => a.id)),
  responsabile: row(['aggiungere', 'modificare', 'vendere', 'eliminare', 'impostazioni']),
  operatore: row(['aggiungere', 'modificare', 'vendere']),
  lettura: row([]),
}) as Permissions;

export const isRole = (value: unknown): value is Role => ROLES.some((r) => r.id === value);
export const roleName = (role: Role): string => ROLES.find((r) => r.id === role)?.name ?? 'Ruolo sconosciuto';

/** Il Titolare ha tutto e «gestire i ruoli» è solo suo: queste caselle non si cambiano. */
export const isFixed = (role: Role, action: Action): boolean => role === 'titolare' || action === 'ruoli';

/** Il ruolo può fare l'azione? Ruolo sconosciuto: no. */
export function can(role: Role, action: Action, table: Permissions = DEFAULT_PERMISSIONS): boolean {
  if (!isRole(role)) return false;
  if (isFixed(role, action)) return DEFAULT_PERMISSIONS[role][action];
  return table[role]?.[action] === true;
}

/** Tabella con una casella cambiata; le caselle fisse restano come sono. */
export function setPermission(table: Permissions, role: Role, action: Action, value: boolean): Permissions {
  if (!isRole(role) || isFixed(role, action)) return table;
  return { ...table, [role]: { ...table[role], [action]: value } };
}

/** Tabella letta dallo storage: per ogni casella cambiabile si tiene un vero/falso valido, il resto è di partenza. */
export function normalizePermissions(raw: unknown): Permissions {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as Permissions;
  for (const r of ROLES) {
    const saved = src[r.id] && typeof src[r.id] === 'object' ? (src[r.id] as Record<string, unknown>) : {};
    out[r.id] = { ...DEFAULT_PERMISSIONS[r.id] };
    for (const a of ACTIONS) {
      if (!isFixed(r.id, a.id) && typeof saved[a.id] === 'boolean') out[r.id][a.id] = saved[a.id] as boolean;
    }
  }
  return out;
}

/** Perché l'azione è spenta, in parole: chi non può e chi lo decide. */
export function deniedReason(role: Role, action: Action): string {
  if (action === 'ruoli') return 'Solo il Titolare cambia i permessi.';
  const verb = ACTIONS.find((a) => a.id === action)?.verb ?? action;
  return `Il ruolo ${roleName(role)} non può ${verb}. Lo decide il Titolare in Accesso.`;
}
