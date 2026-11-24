// Formato delle etichette scelto nella finestra «Codice ed etichetta» (ETI, ticket 22), ricordato per spazio. Chiave
// facoltativa `furinventory_label_format:{org}`: si scrive solo quando l'utente sceglie un formato, mai all'apertura;
// senza chiave vale «Una etichetta». Le impostazioni complete delle etichette saranno di GS1.
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_LABEL_FORMAT, isLabelFormat, type LabelFormatId } from '../utils/labelHtml';

const STORAGE_KEY = 'furinventory_label_format';

export function useLabelFormat(): [LabelFormatId, (format: LabelFormatId) => void] {
  const { organizationId } = useAuth();
  const [format, setFormat] = useState<LabelFormatId>(DEFAULT_LABEL_FORMAT);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = organizationId ? await AsyncStorage.getItem(`${STORAGE_KEY}:${organizationId}`) : null;
        const value = stored ? JSON.parse(stored) : null;
        if (alive && isLabelFormat(value)) setFormat(value);
      } catch {
        // chiave rovinata: resta il formato predefinito
      }
    })();
    return () => { alive = false; };
  }, [organizationId]);

  const choose = useCallback((next: LabelFormatId) => {
    setFormat(next);
    if (organizationId) AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(next)).catch(() => {});
  }, [organizationId]);

  return [format, choose];
}
