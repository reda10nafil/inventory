// Azione non permessa al ruolo di questo telefono (ACC1, ticket 32): una riga col lucchetto e il motivo in parole,
// sopra il blocco che spegne («Il ruolo Operatore non può eliminare. Lo decide il Titolare in Accesso.»). L'azione
// resta visibile, attenuata e senza effetto: mai nascosta senza spiegazione, mai una finestra. Colori solo dal tema.
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';

/** Riga del motivo; niente se il testo è vuoto (azione permessa). `floating`: sopra una barra fissa in basso. */
export function PermissionNote({ text, floating, style }: { text: string; floating?: boolean; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  const t = useTheme();
  if (!text) return null;
  const note = (
    <View style={[styles.box, floating ? styles.boxFloating : style]} accessible accessibilityLabel={text} testID="permesso-negato">
      <AppIcon name="lock" size={16} color={t.colors.onWarningSurface} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
  // Sopra una barra la riga copre ciò che scorre sotto: un fondo pieno sotto il colore d'avviso (che in alcuni stili
  // è trasparente) la tiene leggibile
  return floating ? <View style={[styles.floating, style]}>{note}</View> : note;
}

/** Blocco attenuato quando l'azione non è permessa; con il permesso i figli restano come sono (nessun contenitore). */
export function Dimmed({ off, children, style }: { off: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  if (!off) return <>{children}</>;
  // niente `accessibilityState.disabled`: su web diventa `aria-disabled` e spegnerebbe anche il tocco; il motivo è
  // nella riga sopra, il tocco non ha effetto (lo decide chi chiama)
  return <View style={[styles.dim, style]}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.warningSurfaceBorder,
    backgroundColor: t.colors.warningSurface,
  },
  floating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: 8,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.background,
  },
  boxFloating: { marginBottom: 0 },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: t.weights.strong,
    color: t.colors.onWarningSurface,
  },
  dim: { opacity: 0.45 },
}));
