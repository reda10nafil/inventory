// Segno di un'opzione per la lettura veloce (EDC, ticket 23): il pallino del colore scelto dall'utente, con il bordo del
// tema perché si veda anche quando il colore è vicino al fondo (Bianco su Babilonia, Nero su Ardesia), e l'icona
// dell'opzione col colore del testo. Niente se l'opzione non ha né colore né icona: il disegno di prima non cambia.
// Lo usano `FieldInput` (Aggiungi e Modifica), la Scheda e la card dell'Inventario.
import React from 'react';
import { View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import type { FieldOption } from '../utils/fieldValues';

export const hasMark = (option: Pick<FieldOption, 'color' | 'icon'> | undefined | null): boolean => !!(option && (option.color || option.icon));

export function OptionMark({ option, size = 10, iconColor }: { option: Pick<FieldOption, 'color' | 'icon'> | undefined | null; size?: number; iconColor?: string }) {
  const styles = useStyles();
  const t = useTheme();
  if (!option || !hasMark(option)) return null;
  return (
    <>
      {option.color ? (
        <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: option.color }]} />
      ) : null}
      {option.icon ? <AppIcon name={option.icon} size={size + 6} color={iconColor ?? t.colors.textSecondary} /> : null}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  dot: { borderWidth: 1, borderColor: t.colors.border },
}));
