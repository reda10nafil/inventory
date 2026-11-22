// Sul web react-native-web lascia `Alert.alert` vuoto: conferme e avvisi non comparivano e i pulsanti
// (vendi, elimina, ripristina…) non facevano nulla. Qui la stessa chiamata diventa una finestra del browser.
// Solo web: su Android e iOS resta l'Alert nativo.

export type WebAlertButton = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type BrowserDialogs = {
  alert: (text: string) => void;
  confirm: (text: string) => boolean;
  prompt: (text: string, initial?: string) => string | null;
};

export function webAlert(
  dialogs: BrowserDialogs,
  title: string,
  message?: string,
  buttons?: WebAlertButton[],
): void {
  const text = [title, message].filter(Boolean).join('\n\n');
  const list = buttons ?? [];
  const cancel = list.find((b) => b.style === 'cancel');
  const actions = list.filter((b) => b !== cancel);

  // Solo un messaggio (nessun pulsante, oppure solo «OK» o solo «Annulla»)
  if (actions.length === 0) {
    dialogs.alert(text);
    cancel?.onPress?.();
    return;
  }
  if (actions.length === 1 && !cancel) {
    dialogs.alert(text);
    actions[0].onPress?.();
    return;
  }
  // Una scelta e Annulla: conferma del browser
  if (actions.length === 1) {
    if (dialogs.confirm(`${text}\n\n${actions[0].text ?? 'OK'}?`)) actions[0].onPress?.();
    else cancel?.onPress?.();
    return;
  }
  // Più scelte: si scrive il numero
  const menu = actions.map((b, i) => `${i + 1}. ${b.text ?? ''}`).join('\n');
  const answer = dialogs.prompt(`${text}\n\n${menu}\n\nScrivi il numero (vuoto per annullare)`, '');
  const chosen = answer == null ? undefined : actions[Number(answer.trim()) - 1];
  if (chosen) chosen.onPress?.();
  else cancel?.onPress?.();
}

/** Sostituisce `Alert.alert` sul web; chiamato una volta all'avvio da `index.js`. */
export function installWebAlert(alertModule: { alert: (...args: any[]) => void }, win: BrowserDialogs): void {
  alertModule.alert = (title: string, message?: string, buttons?: WebAlertButton[]) =>
    webAlert(win, title, message, buttons);
}
