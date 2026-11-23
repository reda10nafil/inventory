// Conta di magazzino (M07): passo precedente e uscita (IND-P5, ticket 28). La freccia a video e il tasto Indietro di
// sistema (Android, tasto del browser) fanno la stessa cosa: dal riepilogo all'elenco, dall'elenco alla scelta della
// posizione; dalla scelta della posizione (o dall'esito) si esce, ma con quantità scritte e non registrate prima si
// chiede «Uscire dalla conta? Le quantità scritte si perdono.».

export type CountStep = 'place' | 'count' | 'summary' | 'done';

/** Passo prima di `step` dentro la Conta, o null se da lì si esce. */
export function previousCountStep(step: CountStep): CountStep | null {
  if (step === 'summary') return 'count';
  if (step === 'count') return 'place';
  return null;
}

/** Quantità scritte e non registrate (anche quelle non valide: uscendo si perderebbero lo stesso). */
export function hasWrittenCounts(texts: Record<string, string>): boolean {
  return Object.values(texts).some((text) => text.trim() !== '');
}

/**
 * Che cosa fa l'uscita dalla schermata (freccia o X a video, tasto di sistema) a questo passo: `step` torna di un
 * passo, `ask` chiede prima di uscire, `leave` esce.
 */
export function countLeave(step: CountStep, written: boolean): 'step' | 'ask' | 'leave' {
  if (previousCountStep(step)) return 'step';
  return step === 'place' && written ? 'ask' : 'leave';
}
