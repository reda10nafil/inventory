// Formato delle etichette scelto nella finestra «Codice ed etichetta» (ETI, ticket 22), ricordato per spazio. Chiave
// facoltativa `furinventory_label_format:{org}`: si scrive solo quando l'utente sceglie un formato, mai all'apertura;
// senza chiave vale «Una etichetta». Le impostazioni complete delle etichette saranno di GS1.
// `active`: la chiave si rilegge ogni volta che la finestra si apre (una finestra sempre montata, come quella della
// Scheda, vede il formato scelto altrove); una lettura arrivata dopo una scelta dell'utente non la copre.
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_LABEL_FORMAT, isLabelFormat, type LabelFormatId } from '../utils/labelHtml';

const STORAGE_KEY = 'furinventory_label_format';

export function useLabelFormat(active = true): [LabelFormatId, (format: LabelFormatId) => void] {
  const { organizationId } = useAuth();
  const [format, setFormat] = useState<LabelFormatId>(DEFAULT_LABEL_FORMAT);
  // Scelte dell'utente da quando è partita l'ultima lettura: se ce n'è una, la lettura non la sovrascrive
  const choices = useRef(0);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const before = choices.current;
    (async () => {
      try {
        const stored = organizationId ? await AsyncStorage.getItem(`${STORAGE_KEY}:${organizationId}`) : null;
        const value = stored ? JSON.parse(stored) : null;
        if (alive && choices.current === before && isLabelFormat(value)) setFormat(value);
      } catch {
        // chiave rovinata: resta il formato di adesso
      }
    })();
    return () => { alive = false; };
  }, [organizationId, active]);

  const choose = useCallback((next: LabelFormatId) => {
    choices.current += 1;
    setFormat(next);
    if (organizationId) AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(next)).catch(() => {});
  }, [organizationId]);

  return [format, choose];
}
