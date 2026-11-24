// Finestra «Movimenta» della Scheda (M04, ticket 02): carico, scarico, trasferimento o rettifica con quantità,
// posizioni, causale e nota. Il calcolo e i rifiuti sono in `applyMovement` (utils/stock.ts); qui solo la scelta.
// M10 (ticket 07): per carico e scarico si può scegliere un fornitore o un cliente (solo se l'anagrafica ne ha);
// lo scarico con causale vendita ha anche un prezzo per unità facoltativo (vuoto = listino, come la Vendita flash).
// S1b (ticket 13): dopo la posizione, se ha scaffali, la fila «Nessuno» + gli scaffali (anche quelli che questo
// dispositivo non conosce, se il prodotto ci ha giacenza); il movimento usa la chiave `posizione/scaffale`. Una
// posizione senza scaffali si sceglie come prima.
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import type { MovementKind, MovementReason, Product } from '../types';
import { useInventory } from '../contexts/InventoryContext';
import { useLocations } from '../contexts/LocationsContext';
import { useContacts } from '../contexts/ContactsContext';
import { useShelves } from '../contexts/ShelvesContext';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import {
  MOVEMENT_LABELS, REASON_LABELS, formatQty, keysAt, movementErrorText, parseQty, parseSalePrice, placeOfKey, qtyAt, qtyIn,
  splitStockKey, stockKey, takesContact, takesPrice, type Movement,
} from '../utils/stock';
import { UNKNOWN_SHELF, withShelfRead, type LoadProposal } from '../utils/shelves';
import { useLoadCheck } from '../hooks/useLoadCheck';
import { useLoadBlock } from './LoadBlockSheet';
import { LoadNotice, OverLimitTag } from './LoadNotice';
import { salePrice } from '../utils/inventoryOps';
import { CONTACT_KIND_ICONS, CONTACT_KIND_LABELS, contactsForMovement } from '../utils/contacts';
import { formatNumber } from '../utils/number';
import { formStyles } from './ui/formStyles';
import { GradientFill } from './ui/GradientFill';
import { AppIcon } from './ui/AppIcon';
import { Text, TextInput } from './ui/Text';
import { PermissionNote } from './PermissionNote';
import { usePermission } from '../contexts/ProfileContext';

const KINDS: MovementKind[] = ['carico', 'scarico', 'trasferimento', 'rettifica'];
/** Contatti proposti subito (poche pillole: la finestra resta corta); gli altri con «Altri N». */
const FIRST_CONTACTS = 6;

/** Causali proposte per ogni tipo (facoltative; «iniziale» la scrive solo Aggiungi). */
export const REASONS_BY_KIND: Record<MovementKind, MovementReason[]> = {
  carico: ['acquisto', 'reso', 'altro'],
  scarico: ['vendita', 'uso_interno', 'danno', 'altro'],
  trasferimento: [],
  rettifica: ['conta', 'danno', 'altro'],
};

/**
 * `initialKind`: tipo già scelto all'apertura (Azione rapida, M09). `onDone`: chiamata solo dopo un movimento
 * registrato (Annulla e chiusura non la chiamano).
 */
export function MovementSheet({ product: saved, visible, onClose, initialKind = 'carico', onDone }: {
  product: Product;
  visible: boolean;
  onClose: () => void;
  initialKind?: MovementKind;
  onDone?: (movement: Movement) => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const { moveStock } = useInventory();
  const { locations } = useLocations();
  const { contacts } = useContacts();
  const { shelves } = useShelves();
  // ACC1 (revisore): la causale «Vendita» è una vendita: spenta col motivo per un ruolo che non vende
  const sellPerm = usePermission('vendere');
  // Un pezzo unico con uno scaffale che non torna si muove dalla sua posizione (come lo legge la Scheda, S1b)
  const product = withShelfRead(saved, shelves);

  const [kind, setKind] = useState<MovementKind>(initialKind);
  const [qtyText, setQtyText] = useState('');
  const [place, setPlace] = useState(product.location);
  // Scaffale della posizione scelta ('' = nessuno, la parte senza scaffale) per «Da»/«In» e per «A» (S1b)
  const [placeShelf, setPlaceShelf] = useState('');
  const [to, setTo] = useState('');
  const [toShelf, setToShelf] = useState('');
  const [reason, setReason] = useState<MovementReason | undefined>();
  const [note, setNote] = useState('');
  const [contactId, setContactId] = useState<string | undefined>();
  const [priceText, setPriceText] = useState('');
  const [allContacts, setAllContacts] = useState(false);

  /** Scaffale proposto in una posizione: nessuno se lì c'è giacenza senza scaffale (o niente), altrimenti quello con
   *  più giacenza (un pezzo unico sul suo scaffale: quello). */
  const defaultShelf = (pos: string) => {
    const keys = keysAt(product, pos);
    if (!keys.length || keys.some(([key]) => key === pos)) return '';
    return splitStockKey([...keys].sort((a, b) => b[1] - a[1])[0][0]).shelfId ?? '';
  };

  // Ogni apertura riparte pulita dal tipo chiesto e dalla posizione principale del prodotto
  useEffect(() => {
    if (!visible) return;
    setKind(initialKind); setQtyText(''); setPlace(product.location); setPlaceShelf(defaultShelf(product.location)); setTo(''); setToShelf('');
    setReason(undefined); setNote(''); setContactId(undefined); setPriceText(''); setAllContacts(false);
  }, [visible, product.location, initialKind]);

  const unit = product.unit || 'pz';
  // Posizioni dell'elenco più quelle che il prodotto ha ancora ma non sono più in elenco (si mostrano con l'id); una
  // chiave con lo scaffale vale la sua posizione
  const known = new Set(locations.map((l) => l.id));
  const orphan = [...new Set([product.location, ...Object.keys(product.stock ?? {}).map(placeOfKey)])].filter((id) => id && !known.has(id)).map((id) => ({ id, label: id }));
  const places = [...locations.map((l) => ({ id: l.id, label: l.label })), ...orphan];
  const labelOf = (id: string) => places.find((p) => p.id === id)?.label ?? id;

  /** Scaffali di una posizione: quelli in elenco, più quelli dove il prodotto ha giacenza ma che qui non si conoscono. */
  const shelvesAt = (pos: string) => {
    const here = shelves
      .filter((s) => s.locationId === pos)
      .sort((a, b) => a.name.localeCompare(b.name, 'it', { numeric: true, sensitivity: 'base' }))
      .map((s) => ({ id: s.id, name: s.name }));
    const unknown = keysAt(product, pos)
      .map(([key]) => splitStockKey(key).shelfId)
      .filter((id): id is string => !!id && !here.some((s) => s.id === id))
      .map((id) => ({ id, name: UNKNOWN_SHELF }));
    return [...here, ...unknown];
  };
  const fromKey = stockKey(place, placeShelf);
  const toKey = stockKey(to, toShelf);

  // Fornitori e clienti (M10): prima quelli del tipo suggerito, poi gli altri; nessuno per trasferimento e rettifica
  const contactChoices = contactsForMovement(contacts, kind);
  const shownContacts = allContacts ? contactChoices : contactChoices.slice(0, FIRST_CONTACTS);
  const withPrice = takesPrice(kind, reason);

  const chooseKind = (k: MovementKind) => {
    setKind(k);
    setReason(undefined);
    // Causale, contatto e prezzo sono del tipo scelto: cambiando tipo si riparte senza
    setContactId(undefined);
    setPriceText('');
    if (k === 'trasferimento' && toKey === fromKey) { setTo(''); setToShelf(''); }
  };

  // Un'altra posizione: lo scaffale riparte da quello proposto («Da»/«In») o da nessuno («A»)
  // Cambiata la partenza, se «A» è diventata la stessa chiave (fila nascosta nella stessa posizione) si propone un'altra
  // chiave di quella posizione, così il movimento non resta bloccato su «Le due posizioni devono essere diverse»
  const keepToApart = (pos: string, shelf: string) => {
    if (to !== pos || toShelf !== shelf) return;
    setToShelf(['', ...shelvesAt(pos).map((s) => s.id)].find((id) => id !== shelf) ?? '');
  };
  const pickPlace = (id: string) => { const shelf = defaultShelf(id); setPlace(id); setPlaceShelf(shelf); keepToApart(id, shelf); };
  const pickPlaceShelf = (shelf: string) => { setPlaceShelf(shelf); keepToApart(place, shelf); };
  // Nella stessa posizione partendo dalla parte senza scaffale, la destinazione proposta è il primo scaffale
  const pickTo = (id: string) => { setTo(id); setToShelf(id === place && !placeShelf ? (shelvesAt(id)[0]?.id ?? '') : ''); };

  // S3 (ticket 15): avviso e blocco per il carico e il trasferimento (verso uno scaffale con limiti o una posizione con
  // capienza); la rettifica in aumento registra merce che è già lì, quindi solo l'informazione «oltre il limite»
  const { check: checkLoad } = useLoadCheck();
  const load = useLoadBlock();
  const loadCheck = (() => {
    const qty = parseQty(qtyText);
    if (qty == null || (!(qty > 0) && kind !== 'rettifica')) return null;
    if (kind === 'carico') return checkLoad(product, fromKey, [{ qty }]);
    if (kind === 'trasferimento') return to ? checkLoad(product, toKey, [{ from: fromKey, qty }]) : null;
    if (kind === 'rettifica') {
      const more = qty - qtyIn(product, fromKey);
      return more > 0 ? checkLoad(product, fromKey, [{ qty: more }]) : null;
    }
    return null;
  })();
  const takeProposal = (p: LoadProposal) => {
    if (kind === 'trasferimento') { setTo(p.locationId); setToShelf(p.shelfId ?? ''); return; }
    setPlace(p.locationId);
    setPlaceShelf(p.shelfId ?? '');
  };

  /** `overrideTo`: la chiave proposta dalla finestra del blocco (il tocco su «Metti in A2»). */
  const submit = (overrideTo?: string) => {
    if (reason === 'vendita' && !sellPerm.allowed) return;
    const qty = parseQty(qtyText);
    const common = {
      ...(reason && { reason }),
      ...(note.trim() && { note: note.trim() }),
      ...(contactId && takesContact(kind) && { contactId }),
    };
    let movement: Movement;
    if (kind === 'rettifica') {
      if (qty == null) { Alert.alert('Movimento non registrato', 'Scrivi la quantità contata (anche 0).'); return; }
      movement = { kind, at: fromKey, counted: qty, ...common };
    } else {
      if (qty == null) { Alert.alert('Movimento non registrato', movementErrorText({ error: 'bad_qty' })); return; }
      // Vendita: prezzo per unità scritto, altrimenti il listino (stesso evento della Vendita flash)
      let price: number | undefined;
      if (withPrice) {
        const written = parseSalePrice(priceText);
        if (written === null) { Alert.alert('Movimento non registrato', 'Scrivi un prezzo valido (es. 120 o 12,50) oppure lascia il campo vuoto.'); return; }
        price = salePrice(product, written);
      }
      // S3: col blocco nulla è registrato; la finestra propone un altro posto e il tocco registra lì
      if (!overrideTo && (kind === 'carico' || kind === 'trasferimento') && loadCheck?.level === 'blocco') {
        load.show({ check: loadCheck, onUse: (p) => submit(p.key) });
        return;
      }
      movement = kind === 'carico' ? { kind, qty, to: overrideTo ?? fromKey, ...common }
        : kind === 'scarico' ? { kind, qty, from: fromKey, ...common, ...(price != null && { finalPrice: price }) }
          : { kind, qty, from: fromKey, to: overrideTo ?? (to ? toKey : ''), ...common };
    }
    const result = moveStock(product.id, movement);
    if (!result.ok) {
      Alert.alert('Movimento non registrato', movementErrorText(result, unit));
      return;
    }
    onClose();
    onDone?.(movement);
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

  // Scaffali della posizione scelta (S1b): «Nessuno» (la parte senza scaffale) e gli scaffali, con la quantità di
  // ognuno. Etichetta accessibile «Da Magazzino › A1», «A Magazzino › Nessuno scaffale».
  const shelfChips = (title: string, pos: string, value: string, onPick: (id: string) => void, excludeKey?: string) => {
    const list = pos ? shelvesAt(pos) : [];
    if (!list.length) return null;
    const options = [{ id: '', name: 'Nessuno' }, ...list].filter((s) => stockKey(pos, s.id) !== excludeKey);
    return (
      <>
        <Text style={styles.label}>Scaffale</Text>
        <View style={styles.chipWrap}>
          {options.map((s) => {
            const active = value === s.id;
            const here = qtyIn(product, stockKey(pos, s.id));
            return (
              <Pressable
                key={s.id || 'none'}
                style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
                onPress={() => onPick(s.id)}
                accessibilityLabel={`${title} ${labelOf(pos)} › ${s.id ? s.name : 'Nessuno scaffale'}`}
              >
                {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                <AppIcon name={s.id ? 'shelves' : 'layers-clear'} size={14} color={active ? t.colors.chipActiveText : t.colors.chipText} />
                <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]} numberOfLines={1}>
                  {s.name}{here > 0 ? ` · ${formatQty(here, unit)}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </>
    );
  };

  const placeTitle = kind === 'carico' ? 'In' : kind === 'rettifica' ? 'Posizione contata' : 'Da';
  const recorded = qtyIn(product, fromKey);
  // In «A» la posizione di partenza manca solo se non ha scaffali (come prima); con gli scaffali si può spostare dalla
  // posizione a un suo scaffale e viceversa, e manca la sola chiave di partenza
  const placeHasShelves = shelvesAt(place).length > 0;

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
            {placeChips(placeTitle, place, pickPlace)}
            {shelfChips(placeTitle, place, placeShelf, pickPlaceShelf)}
            {kind === 'carico' && <LoadNotice check={loadCheck} onUseProposal={takeProposal} />}

            {kind === 'trasferimento' && (
              <>
                <Text style={styles.label}>A</Text>
                {placeChips('A', to, pickTo, placeHasShelves ? undefined : place)}
                {shelfChips('A', to, toShelf, setToShelf, fromKey)}
                <LoadNotice check={loadCheck} onUseProposal={takeProposal} />
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
            {kind === 'rettifica' && <OverLimitTag check={loadCheck} />}

            {REASONS_BY_KIND[kind].length > 0 && (
              <>
                <Text style={styles.label}>Causale (facoltativa)</Text>
                <View style={styles.chipWrap}>
                  {REASONS_BY_KIND[kind].map((r) => {
                    const active = reason === r;
                    const off = r === 'vendita' && !sellPerm.allowed;
                    return (
                      <Pressable key={r} style={[styles.chip, styles.chipSmall, active && styles.chipActive, off && styles.chipOff]} onPress={() => { if (!off) setReason(active ? undefined : r); }} accessibilityLabel={`Causale ${REASON_LABELS[r]}`}>
                        {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                        <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]}>{REASON_LABELS[r]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {REASONS_BY_KIND[kind].includes('vendita') && <PermissionNote text={sellPerm.reason} style={{ marginTop: 8, marginBottom: 0 }} />}
              </>
            )}

            {withPrice && (
              <>
                <Text style={styles.label}>Prezzo per unità (facoltativo)</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.inputText}
                    placeholder={product.sellPrice != null ? `Vuoto = listino ${formatNumber(product.sellPrice)}` : 'Vuoto = nessun prezzo'}
                    placeholderTextColor={t.colors.placeholder}
                    keyboardType="decimal-pad"
                    value={priceText}
                    onChangeText={setPriceText}
                    accessibilityLabel="Prezzo per unità"
                  />
                  <Text style={styles.unit}>€/{unit}</Text>
                </View>
              </>
            )}

            {contactChoices.length > 0 && (
              <>
                <Text style={styles.label}>{kind === 'carico' ? 'Fornitore o cliente (facoltativo)' : 'Cliente o fornitore (facoltativo)'}</Text>
                <View style={styles.chipWrap}>
                  {shownContacts.map((c) => {
                    const active = contactId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
                        onPress={() => setContactId(active ? undefined : c.id)}
                        accessibilityLabel={`Contatto ${CONTACT_KIND_LABELS[c.kind]} ${c.name}`}
                      >
                        {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                        <AppIcon name={CONTACT_KIND_ICONS[c.kind]} size={14} color={active ? t.colors.chipActiveText : t.colors.chipText} />
                        <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]} numberOfLines={1}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                  {contactChoices.length > shownContacts.length && (
                    <Pressable style={[styles.chip, styles.chipSmall]} onPress={() => setAllContacts(true)} accessibilityLabel="Mostra tutti i contatti">
                      <Text style={[styles.chipText, styles.chipTextSmall]}>Altri {contactChoices.length - shownContacts.length}</Text>
                    </Pressable>
                  )}
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
            <Pressable style={styles.primary} onPress={() => submit()} accessibilityLabel="Registra movimento">
              <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
              <Text style={styles.primaryText}>Registra</Text>
            </Pressable>
          </View>
        </View>
        {load.sheet}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  chipOff: { opacity: 0.4 },
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
