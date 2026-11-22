// Finestra «Movimenta» della Scheda (M04, ticket 02): carico, scarico, trasferimento o rettifica con quantità,
// posizioni, causale e nota. Il calcolo e i rifiuti sono in `applyMovement` (utils/stock.ts); qui solo la scelta.
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import type { MovementKind, MovementReason, Product } from '../types';
import { useInventory } from '../contexts/InventoryContext';
import { useLocations } from '../contexts/LocationsContext';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { MOVEMENT_LABELS, REASON_LABELS, formatQty, movementErrorText, parseQty, qtyAt, type Movement } from '../utils/stock';
import { formStyles } from './ui/formStyles';
import { GradientFill } from './ui/GradientFill';
import { AppIcon } from './ui/AppIcon';
import { Text, TextInput } from './ui/Text';

const KINDS: MovementKind[] = ['carico', 'scarico', 'trasferimento', 'rettifica'];

/** Causali proposte per ogni tipo (facoltative; «iniziale» la scrive solo Aggiungi). */
export const REASONS_BY_KIND: Record<MovementKind, MovementReason[]> = {
  carico: ['acquisto', 'reso', 'altro'],
  scarico: ['vendita', 'uso_interno', 'danno', 'altro'],
  trasferimento: [],
  rettifica: ['conta', 'danno', 'altro'],
};

export function MovementSheet({ product, visible, onClose }: { product: Product; visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  const { moveStock } = useInventory();
  const { locations } = useLocations();

  const [kind, setKind] = useState<MovementKind>('carico');
  const [qtyText, setQtyText] = useState('');
  const [place, setPlace] = useState(product.location);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState<MovementReason | undefined>();
  const [note, setNote] = useState('');

  // Ogni apertura riparte pulita dalla posizione principale del prodotto
  useEffect(() => {
    if (!visible) return;
    setKind('carico'); setQtyText(''); setPlace(product.location); setTo(''); setReason(undefined); setNote('');
  }, [visible, product.location]);

  const unit = product.unit || 'pz';
  // Posizioni dell'elenco più quelle che il prodotto ha ancora ma non sono più in elenco (si mostrano con l'id)
  const known = new Set(locations.map((l) => l.id));
  const orphan = [...new Set([product.location, ...Object.keys(product.stock ?? {})])].filter((id) => id && !known.has(id)).map((id) => ({ id, label: id }));
  const places = [...locations.map((l) => ({ id: l.id, label: l.label })), ...orphan];
  const labelOf = (id: string) => places.find((p) => p.id === id)?.label ?? id;

  const chooseKind = (k: MovementKind) => {
    setKind(k);
    setReason(undefined);
    if (k === 'trasferimento' && to === place) setTo('');
  };

  const submit = () => {
    const qty = parseQty(qtyText);
    const common = { ...(reason && { reason }), ...(note.trim() && { note: note.trim() }) };
    let movement: Movement;
    if (kind === 'rettifica') {
      if (qty == null) { Alert.alert('Movimento non registrato', 'Scrivi la quantità contata (anche 0).'); return; }
      movement = { kind, at: place, counted: qty, ...common };
    } else {
      if (qty == null) { Alert.alert('Movimento non registrato', movementErrorText({ error: 'bad_qty' })); return; }
      movement = kind === 'carico' ? { kind, qty, to: place, ...common }
        : kind === 'scarico' ? { kind, qty, from: place, ...common }
          : { kind, qty, from: place, to, ...common };
    }
    const result = moveStock(product.id, movement);
    if (!result.ok) {
      Alert.alert('Movimento non registrato', movementErrorText(result, unit));
      return;
    }
    onClose();
  };

  const placeChips = (title: string, value: string, onPick: (id: string) => void, exclude?: string) => (
    <View style={styles.chipWrap}>
      {places.filter((p) => p.id !== exclude).map((p) => {
        const active = value === p.id;
        const here = qtyAt(product, p.id);
        return (
          <Pressable key={p.id} style={[styles.chip, styles.chipSmall, active && styles.chipActive]} onPress={() => onPick(p.id)} accessibilityLabel={`${title} ${p.label}`}>
            {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
            <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]} numberOfLines={1}>
              {p.label}{here > 0 ? ` · ${formatQty(here, unit)}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const placeTitle = kind === 'carico' ? 'In' : kind === 'rettifica' ? 'Posizione contata' : 'Da';
  const recorded = qtyAt(product, place);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Movimenta {product.sku}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Chiudi" hitSlop={8}>
              <AppIcon name="close" size={24} color={t.colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.chipWrap}>
              {KINDS.map((k) => {
                const active = kind === k;
                return (
                  <Pressable key={k} style={[styles.chip, styles.chipSmall, active && styles.chipActive]} onPress={() => chooseKind(k)} accessibilityLabel={`Tipo ${MOVEMENT_LABELS[k]}`}>
                    {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                    <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]}>{MOVEMENT_LABELS[k]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>{placeTitle}</Text>
            {placeChips(placeTitle, place, setPlace)}

            {kind === 'trasferimento' && (
              <>
                <Text style={styles.label}>A</Text>
                {placeChips('A', to, setTo, place)}
              </>
            )}

            <Text style={styles.label}>{kind === 'rettifica' ? 'Quantità contata' : 'Quantità'}</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                placeholder={kind === 'rettifica' ? `Registrata: ${formatQty(recorded, unit)}` : 'es. 2,5'}
                placeholderTextColor={t.colors.placeholder}
                keyboardType="decimal-pad"
                value={qtyText}
                onChangeText={setQtyText}
              />
              <Text style={styles.unit}>{unit}</Text>
            </View>

            {REASONS_BY_KIND[kind].length > 0 && (
              <>
                <Text style={styles.label}>Causale (facoltativa)</Text>
                <View style={styles.chipWrap}>
                  {REASONS_BY_KIND[kind].map((r) => {
                    const active = reason === r;
                    return (
                      <Pressable key={r} style={[styles.chip, styles.chipSmall, active && styles.chipActive]} onPress={() => setReason(active ? undefined : r)} accessibilityLabel={`Causale ${REASON_LABELS[r]}`}>
                        {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                        <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]}>{REASON_LABELS[r]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Text style={styles.label}>Nota (facoltativa)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.inputText}
                placeholder="es. fattura 124, bancale rotto"
                placeholderTextColor={t.colors.placeholder}
                value={note}
                onChangeText={setNote}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>Annulla</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={submit} accessibilityLabel="Registra movimento">
              <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
              <Text style={styles.primaryText}>Registra</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  overlay: {
    flex: 1,
    backgroundColor: t.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  // Finestra sopra la Scheda: fondo opaco come il riquadro del codice
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadows.cardElevated,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    flex: 1,
    ...t.typography.cardTitle,
    fontSize: 18,
    fontWeight: t.weights.strong,
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 8,
  },
  label: {
    fontSize: t.label.size,
    lineHeight: 18,
    fontWeight: t.label.weight,
    color: t.label.color,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  secondary: {
    flex: 1,
    height: 48,
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
    height: 48,
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
    color: t.colors.onButton,
  },
}));
