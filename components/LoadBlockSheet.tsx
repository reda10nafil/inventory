// Blocco del carico (S3, ticket 15; UX0 piano-fette «S3», R13 e R14): una finestra dal basso con il titolo
// «Non entra in A1», il motivo coi numeri («32 kg, il massimo è 30 kg»), perché il posto proposto va bene («Su A2 ne
// entrano ancora 5 come questo»), il pulsante primario «Metti in A2 (libero al 40%)» e «Annulla». Se nessun posto
// basta il primario non c'è e la riga lo dice. Nessun «Metti comunque» (scartato dall'utente). Con il blocco la
// schermata non scrive nulla: solo il tocco sulla proposta fa il carico, nel posto proposto.
// `useLoadBlock()` dà la finestra da mettere nella schermata e `show` per aprirla.
import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { loadBlockTitle, noProposalText, proposalLabel, type LoadCheck, type LoadProposal } from '../utils/shelves';

export interface LoadBlock {
  check: LoadCheck;
  /** Tocco sulla proposta: la schermata fa il carico in `proposal.key`. */
  onUse?: (proposal: LoadProposal) => void;
  /** «Annulla», la X o il tocco fuori: niente scritto. */
  onCancel?: () => void;
}

export function LoadBlockSheet({ block, onClose }: { block: LoadBlock | null; onClose: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  const check = block?.check;
  const proposal = block?.onUse ? check?.proposal : undefined;
  const cancel = () => {
    const onCancel = block?.onCancel;
    onClose();
    onCancel?.();
  };
  const use = () => {
    const onUse = block?.onUse;
    onClose();
    if (proposal) onUse?.(proposal);
  };
  return (
    <Modal visible={!!check} transparent animationType="slide" onRequestClose={cancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={cancel} accessibilityLabel="Chiudi" />
        {check ? (
          <View style={styles.sheet} testID="blocco-carico">
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <AppIcon name="block" size={22} color={t.colors.error} />
              <Text style={styles.title} accessibilityRole="header">{loadBlockTitle(check)}</Text>
              <Pressable onPress={cancel} hitSlop={8} accessibilityLabel="Chiudi">
                <AppIcon name="close" size={24} color={t.colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.body}>
              {check.reason ? <Text style={styles.reason} accessibilityLabel={`Motivo: ${check.reason}`}>{check.reason}</Text> : null}
              <Text style={styles.why}>{proposal ? proposal.why : noProposalText(check)}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.secondary} onPress={cancel} accessibilityRole="button" accessibilityLabel="Annulla">
                <Text style={styles.secondaryText}>Annulla</Text>
              </Pressable>
              {proposal ? (
                <Pressable style={styles.primary} onPress={use} accessibilityRole="button" accessibilityLabel={proposalLabel(proposal)}>
                  <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                  <Text style={styles.primaryText} numberOfLines={2}>{proposalLabel(proposal)}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/** La finestra del blocco e il modo di aprirla. */
export function useLoadBlock() {
  const [block, setBlock] = useState<LoadBlock | null>(null);
  const sheet = <LoadBlockSheet block={block} onClose={() => setBlock(null)} />;
  return { sheet, show: setBlock, open: !!block };
}

const useStyles = makeStyles((t) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: t.colors.scrim,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: t.colors.backgroundSecondary,
    borderTopLeftRadius: t.radius.card,
    borderTopRightRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    backgroundColor: t.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    flex: 1,
    ...t.typography.cardTitle,
    fontSize: 18,
    fontWeight: t.weights.strong,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 6,
  },
  reason: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  why: {
    fontSize: 14,
    lineHeight: 20,
    color: t.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  secondary: {
    height: 52,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  secondaryText: {
    ...t.typography.buttonSecondary,
    fontSize: 15,
    color: t.colors.onButtonSecondary,
  },
  primary: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
  },
  primaryText: {
    ...t.typography.buttonPrimary,
    fontSize: 15,
    textAlign: 'center',
    color: t.colors.onButton,
  },
}));
