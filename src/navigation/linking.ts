// Indirizzi dell'app (web e link `syncroflow://`). C2 (ticket 21, IND-P1 e IND-P2): sotto ogni schermata aperta da
// un indirizzo (ricarica del browser, link ad app chiusa) c'è la barra delle schede (`initialRouteName`), aperta sulla
// scheda da cui la schermata si apre nei menu; così la freccia e il tasto Indietro tornano lì invece di non fare nulla
// («GO_BACK was not handled») o di chiudere l'app. Ad app aperta un link resta un NAVIGATE verso la schermata.
import { getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';

/**
 * Scheda madre di ogni schermata: quella da cui si apre nei menu, non il prefisso dell'indirizzo (Crea automazione è
 * sotto `settings/` ma si apre da Automazioni; la Chat si apre da Team, che sta in Impostazioni). Una schermata nuova
 * va scritta qui e in `config.screens`; NotFound non ne ha (sotto resta la Home).
 */
export const PARENT_TAB: Record<string, 'index' | 'automations' | 'settings'> = {
  Scanner: 'automations', // Automazioni › icona dello scanner
  ScannerAction: 'automations', // dopo una lettura dello Scanner
  ProductDetail: 'index', // Home › card
  ProductEdit: 'index', // Scheda › Modifica
  SettingsLocations: 'settings',
  SettingsCategories: 'settings', // indirizzo di M01: apre Campi Personalizzati con i valori di «Tipo di pelle»
  SettingsContacts: 'settings',
  SettingsShelves: 'settings',
  SettingsFields: 'settings',
  SettingsFolders: 'settings',
  SettingsLayoutBuilder: 'settings',
  SettingsGs1: 'settings',
  SettingsHardware: 'settings',
  SettingsTrash: 'settings',
  SettingsShare: 'settings',
  SettingsAppearance: 'settings',
  SettingsSector: 'settings',
  SettingsNetwork: 'settings', // Impostazioni › Persone e telefoni › Rete del negozio (RETE0)
  SettingsTeam: 'settings', // indirizzo vecchio della Rete del negozio (RETE0: stessa schermata)
  SettingsAccess: 'settings', // Impostazioni › Persone e telefoni › Accesso (ACC1)
  Chat: 'settings', // Rete del negozio › Apri la Chat
  SettingsAutomationBuilder: 'automations', // Automazioni › Crea Nuova; Flusso di un'automazione › modifica
  Audit: 'automations',
  BatchMove: 'automations',
  ScanSell: 'automations',
  QuickTag: 'automations',
  Count: 'automations',
  AutomationFlow: 'automations',
  CustomRunner: 'automations',
};

const config = {
  initialRouteName: '(tabs)',
  screens: {
    '(tabs)': {
      screens: {
        index: '',
        timeline: 'timeline',
        automations: 'automations',
        add: 'add',
        settings: 'settings',
      },
    },
    Scanner: 'scanner',
    ScannerAction: 'scanner-action',
    ProductDetail: 'product/:id',
    ProductEdit: 'product/edit/:id',
    SettingsLocations: 'settings/locations',
    SettingsCategories: 'settings/categories',
    SettingsContacts: 'settings/contacts',
    SettingsShelves: 'settings/shelves',
    SettingsFields: 'settings/fields',
    SettingsFolders: 'settings/folders',
    SettingsLayoutBuilder: 'settings/layout-builder',
    SettingsGs1: 'settings/gs1-config',
    SettingsHardware: 'settings/hardware',
    SettingsTrash: 'settings/trash',
    SettingsShare: 'settings/share',
    SettingsAppearance: 'settings/appearance',
    SettingsSector: 'settings/sector-templates',
    SettingsNetwork: 'settings/network',
    SettingsTeam: 'settings/team',
    SettingsAccess: 'settings/access',
    Chat: 'chat',
    SettingsAutomationBuilder: 'settings/automation-builder',
    Audit: 'automations/audit',
    BatchMove: 'automations/batch-move',
    ScanSell: 'automations/scan-sell',
    QuickTag: 'automations/quick-tag',
    Count: 'automations/count',
    AutomationFlow: 'automations/automation-flow/:id',
    CustomRunner: 'automations/custom-runner/:id',
    NotFound: '*',
  },
};

type LinkingState = ReturnType<typeof defaultGetStateFromPath>;

/**
 * Stato da un indirizzo: quello di React Navigation (con `initialRouteName` la barra delle schede sta sotto la
 * schermata) e, alla barra aggiunta, la scheda madre. Si tocca solo la forma `[(tabs) senza stato, schermata]`: le
 * schede (`/settings`), la radice e NotFound restano come le costruisce React Navigation.
 */
export function getStateFromPath(path: string, options?: Parameters<typeof defaultGetStateFromPath>[1]): LinkingState {
  const state = defaultGetStateFromPath(path, options);
  const routes = state?.routes;
  if (!state || !routes || routes.length !== 2 || routes[0].name !== '(tabs)' || routes[0].state) return state;
  const tab = PARENT_TAB[routes[1].name];
  if (!tab) return state;
  return { ...state, routes: [{ ...routes[0], state: { routes: [{ name: tab }] } }, routes[1]] } as LinkingState;
}

/**
 * IND-P8 (ticket 28, per il login di L1): il ritorno dal login Google (`syncroflow://auth/callback?code=…`) lo legge
 * `AuthContext`, non è una schermata; senza il filtro React Navigation lo aprirebbe come «Page Not Found». Vale solo su
 * Android e iOS (React Navigation non usa `filter` sul web, dove il ritorno è la radice del sito).
 */
export const isNavigationLink = (url: string) => !/^[a-z][\w+.-]*:\/\/\/?auth\/callback\b/i.test(url);

export const linking = {
  prefixes: ['syncroflow://', 'exp+syncro-flow://'],
  config,
  getStateFromPath,
  filter: isNavigationLink,
};
