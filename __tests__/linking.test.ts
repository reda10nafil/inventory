// C2 (ticket 21, IND-P1 e IND-P2): indirizzi dell'app. Sotto ogni schermata aperta da un indirizzo c'è la barra
// delle schede sulla scheda madre; le schede e la radice restano come prima; un link ad app aperta resta un NAVIGATE.
// La tabella attesa dai menu (grep dei chiamanti) è in `prova/c2-util.cjs` e si confronta in `prova/stato-da-indirizzo.mjs`.
import { getActionFromState } from '@react-navigation/native';
import { linking, getStateFromPath, PARENT_TAB } from '../src/navigation/linking';

const screens = linking.config.screens as Record<string, unknown>;
const brief = (s: any): string => s && s.routes.map((r: any) => r.name + (r.state ? `{${brief(r.state)}}` : '')).join(' > ');
const pathOf = (p: string) => p.replace(/:id/, 'x');

describe('linking (C2)', () => {
  it('ogni schermata con un indirizzo ha la sua scheda madre e viceversa (NotFound no)', () => {
    const named = Object.keys(screens).filter((n) => n !== '(tabs)' && n !== 'NotFound').sort();
    expect(Object.keys(PARENT_TAB).sort()).toEqual(named);
  });

  it('i tre indirizzi che davano «Page Not Found» (P29, AU-V11)', () => {
    expect(screens.SettingsTeam).toBe('settings/team');
    expect(screens.Chat).toBe('chat');
    expect(screens.SettingsAutomationBuilder).toBe('settings/automation-builder');
  });

  it('ogni indirizzo interno: barra delle schede sulla madre sotto la schermata', () => {
    for (const [name, path] of Object.entries(screens)) {
      if (name === '(tabs)' || name === 'NotFound') continue;
      const state = getStateFromPath(pathOf(path as string), linking.config as any);
      expect(brief(state)).toBe(`(tabs){${PARENT_TAB[name]}} > ${name}`);
    }
  });

  it('scheda madre dai menu, non dal prefisso dell\'indirizzo', () => {
    expect(brief(getStateFromPath('settings/automation-builder?editId=a1', linking.config as any))).toBe('(tabs){automations} > SettingsAutomationBuilder');
    expect(getStateFromPath('settings/automation-builder?editId=a1', linking.config as any)?.routes[1].params).toEqual({ editId: 'a1' });
    expect(brief(getStateFromPath('chat', linking.config as any))).toBe('(tabs){settings} > Chat');
    expect(brief(getStateFromPath('product/cmp-1', linking.config as any))).toBe('(tabs){index} > ProductDetail');
  });

  it('schede, radice e indirizzi sconosciuti come li costruisce React Navigation', () => {
    expect(brief(getStateFromPath('', linking.config as any))).toBe('(tabs){index}');
    expect(brief(getStateFromPath('settings', linking.config as any))).toBe('(tabs){settings}');
    expect(brief(getStateFromPath('inesistente', linking.config as any))).toBe('(tabs) > NotFound');
  });

  it('link ad app aperta: NAVIGATE verso la schermata, lo stack corrente non si azzera', () => {
    const state = getStateFromPath('settings/folders', linking.config as any)!;
    const action: any = getActionFromState(state, linking.config as any);
    expect(action.type).toBe('NAVIGATE');
    expect(action.payload.name).toBe('SettingsFolders');
  });
});
