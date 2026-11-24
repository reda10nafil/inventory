// Avviso del carico (S3, ticket 15; UX0 piano-fette «S3»): una riga sotto il campo dello scaffale (o della
// destinazione), su fondo `warningSurface`, «A1 sarà pieno all'85%», con «Usa A2» se c'è un posto più libero e la
// schermata lo può scegliere. Niente finestra. L'etichetta piccola «oltre il limite» è la sola informazione di Conta,
// Audit e import (e della rettifica di Movimenta). Colori solo dai ruoli del tema.
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { loadWarningText, OVER_LIMIT, overLimitText, type LoadCheck, type LoadProposal } from '../utils/shelves';

/** Riga dell'avviso; niente se il controllo non dà l'avviso. */
export function LoadNotice({ check, onUseProposal }: { check: LoadCheck | null | undefined; onUseProposal?: (proposal: LoadProposal) => void }) {
  const styles = useStyles();
  const t = useTheme();
  if (!check || check.level !== 'avviso') return null;
  const text = loadWarningText(check);
  const proposal = check.proposal;
  return (
    <View style={styles.box} accessible={!proposal || !onUseProposal} accessibilityLabel={`Avviso: ${text}`} testID="avviso-carico">
      <AppIcon name="warning" size={18} color={t.colors.onWarningSurface} />
      <Text style={styles.text}>{text}</Text>
      {proposal && onUseProposal ? (
        <Pressable onPress={() => onUseProposal(proposal)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Usa ${proposal.name}`}>
          <Text style={styles.link}>Usa {proposal.name}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Solo informazione (Conta, Audit, import): l'etichetta «oltre il limite», niente se il carico entra. */
export function OverLimitTag({ check }: { check: LoadCheck | null | undefined }) {
  const styles = useStyles();
  if (!check || check.level !== 'blocco') return null;
  return (
    <View style={styles.tag} accessible accessibilityLabel={overLimitText(check)} testID="oltre-il-limite">
      <Text style={styles.tagText}>{OVER_LIMIT}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.warningSurfaceBorder,
    backgroundColor: t.colors.warningSurface,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: t.weights.strong,
    color: t.colors.onWarningSurface,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: t.weights.strong,
    color: t.colors.onWarningSurface,
    textDecorationLine: 'underline',
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: t.radius.chip,
    borderWidth: 1,
    borderColor: t.colors.warningSurfaceBorder,
    backgroundColor: t.colors.warningSurface,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: t.weights.strong,
    color: t.colors.onWarningSurface,
  },
}));
