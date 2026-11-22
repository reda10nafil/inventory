import { installWebAlert, webAlert, type BrowserDialogs } from '../utils/webAlert';

const dialogs = (answers: { confirm?: boolean; prompt?: string | null } = {}) => {
  const seen: string[] = [];
  const d: BrowserDialogs = {
    alert: (t) => { seen.push(`alert:${t}`); },
    confirm: (t) => { seen.push(`confirm:${t}`); return answers.confirm ?? true; },
    prompt: (t) => { seen.push(`prompt:${t}`); return answers.prompt === undefined ? '1' : answers.prompt; },
  };
  return { d, seen };
};

describe('webAlert', () => {
  it('senza pulsanti mostra solo il messaggio', () => {
    const { d, seen } = dialogs();
    webAlert(d, 'Errore', 'Riprova');
    expect(seen).toEqual(['alert:Errore\n\nRiprova']);
  });

  it('con un solo OK lo esegue dopo il messaggio', () => {
    const { d } = dialogs();
    const ok = jest.fn();
    webAlert(d, 'Fatto', undefined, [{ text: 'OK', onPress: ok }]);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('Annulla + Elimina: conferma sì esegue Elimina', () => {
    const { d } = dialogs({ confirm: true });
    const del = jest.fn();
    const cancel = jest.fn();
    webAlert(d, 'Eliminare?', 'Va nel cestino', [{ text: 'Annulla', style: 'cancel', onPress: cancel }, { text: 'Elimina', style: 'destructive', onPress: del }]);
    expect(del).toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('Annulla + Elimina: conferma no esegue Annulla', () => {
    const { d } = dialogs({ confirm: false });
    const del = jest.fn();
    const cancel = jest.fn();
    webAlert(d, 'Eliminare?', undefined, [{ text: 'Annulla', style: 'cancel', onPress: cancel }, { text: 'Elimina', onPress: del }]);
    expect(del).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  });

  it('più scelte: esegue quella col numero scritto, vuoto annulla', () => {
    const a = jest.fn();
    const b = jest.fn();
    const buttons = [{ text: 'Annulla', style: 'cancel' as const }, { text: 'A', onPress: a }, { text: 'B', onPress: b }];
    webAlert(dialogs({ prompt: '2' }).d, 'Scegli', undefined, buttons);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    webAlert(dialogs({ prompt: '' }).d, 'Scegli', undefined, buttons);
    webAlert(dialogs({ prompt: null }).d, 'Scegli', undefined, buttons);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('installWebAlert sostituisce il metodo del modulo', () => {
    const mod = { alert: () => {} };
    const { d, seen } = dialogs();
    installWebAlert(mod, d);
    mod.alert('Ciao');
    expect(seen).toEqual(['alert:Ciao']);
  });
});
