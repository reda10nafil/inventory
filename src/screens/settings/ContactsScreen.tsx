// Impostazioni › Fornitori e clienti (M10, ticket 07): anagrafica minima per spazio (nome, tipo, telefono, email,
// nota). Il tocco su un contatto apre la sua scheda con i movimenti che lo citano; un contatto usato nei movimenti
// non si elimina, si può solo modificare. «Usato» e «i suoi movimenti» sono lo stesso filtro (utils/contacts.ts).
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContacts } from '../../../contexts/ContactsContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import {
  CONTACT_KINDS, CONTACT_KIND_ICONS, CONTACT_KIND_LABELS, contactDeleteError, contactEvents, contactNameError, contactUsage, filterContacts,
  type Contact, type ContactFilter, type ContactKind,
} from '../../../utils/contacts';
import { describeStockEvent } from '../../../utils/stock';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { formStyles } from '../../../components/ui/formStyles';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';

const FILTERS: { id: ContactFilter; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'fornitore', label: 'Fornitori' },
  { id: 'cliente', label: 'Clienti' },
];
/** Movimenti mostrati subito nella scheda; gli altri con «Mostra tutti». */
const FIRST_EVENTS = 20;

const movements = (n: number) => (n === 0 ? 'Nessun movimento' : n === 1 ? '1 movimento' : `${n} movimenti`);

export default function ContactsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { contacts, loading, addContact, updateContact, deleteContact } = useContacts();
  const { timeline, getProductById } = useInventory();
  const { locations } = useLocations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ContactKind>('fornitore');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<ContactFilter>('tutti');
  const [openId, setOpenId] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const usage = useMemo(() => contactUsage(timeline), [timeline]);
  const shown = useMemo(() => filterContacts(contacts, filter), [contacts, filter]);
  const open = contacts.find((c) => c.id === openId);
  const openEvents = useMemo(() => (openId ? contactEvents(timeline, openId) : []), [timeline, openId]);
  const placeLabel = (id: string) => locations.find((l) => l.id === id)?.label ?? id;
  const countFor = (f: ContactFilter) => (f === 'tutti' ? contacts.length : contacts.filter((c) => c.kind === f).length);
  // Senza contatti il modulo è già aperto: è la prima cosa da fare
  const showForm = formOpen || contacts.length === 0;

  const resetForm = () => {
    setName(''); setKind('fornitore'); setPhone(''); setEmail(''); setNote('');
    setEditingId(null); setFormOpen(false);
  };

  const startEdit = (contact: Contact) => {
    setName(contact.name); setKind(contact.kind); setPhone(contact.phone ?? ''); setEmail(contact.email ?? ''); setNote(contact.note ?? '');
    setEditingId(contact.id); setFormOpen(true); setOpenId(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openCard = (id: string) => { setAllEvents(false); setOpenId(id); };

  const handleSave = async () => {
    const error = contactNameError(name, kind, contacts, editingId ?? undefined);
    if (error) {
      Alert.alert('Errore', error);
      return;
    }
    const data = { name, kind, phone, email, note };
    if (editingId) {
      await updateContact(editingId, data);
      Alert.alert('Fatto', 'Contatto aggiornato');
    } else {
      await addContact(data);
      Alert.alert('Fatto', 'Contatto creato');
    }
    // Il contatto appena salvato deve vedersi anche se il filtro era sull'altro tipo
    if (filter !== 'tutti' && filter !== kind) setFilter('tutti');
    resetForm();
  };

  const handleDelete = (contact: Contact) => {
    const error = contactDeleteError(contact, usage[contact.id] ?? 0);
    if (error) {
      Alert.alert('Attenzione', error);
      return;
    }
    Alert.alert('Conferma eliminazione', `Eliminare ${CONTACT_KIND_LABELS[contact.kind].toLocaleLowerCase()} "${contact.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteContact(contact.id);
          if (editingId === contact.id) resetForm();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Backdrop />
        <ActivityIndicator size="large" color={t.colors.accentInk} />
      </View>
    );
  }

  const chip = (key: string, label: string, active: boolean, onPress: () => void, accessibilityLabel: string) => (
    <Pressable key={key} style={[styles.chip, styles.chipSmall, active && styles.chipActive]} onPress={onPress} accessibilityLabel={accessibilityLabel}>
      {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
      <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string, extra: object = {}) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.inputText}
          placeholder={placeholder}
          placeholderTextColor={t.colors.placeholder}
          value={value}
          onChangeText={onChange}
          accessibilityLabel={label}
          {...extra}
        />
      </View>
    </>
  );

  const visibleEvents = allEvents ? openEvents : openEvents.slice(0, FIRST_EVENTS);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Backdrop />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? 'Modifica contatto' : 'Nuovo contatto'}</Text>
            {field('Nome', name, setName, 'Es. Conceria Rossi')}
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.chipWrap}>
              {CONTACT_KINDS.map((k) => chip(k, CONTACT_KIND_LABELS[k], kind === k, () => setKind(k), `Tipo ${CONTACT_KIND_LABELS[k]}`))}
            </View>
            {field('Telefono (facoltativo)', phone, setPhone, 'Es. 333 1234567', { keyboardType: 'phone-pad' })}
            {field('Email (facoltativa)', email, setEmail, 'Es. ordini@esempio.it', { keyboardType: 'email-address', autoCapitalize: 'none' })}
            {field('Nota (facoltativa)', note, setNote, 'Es. consegna il martedì')}
            <View style={styles.actionButtons}>
              {(editingId || contacts.length > 0) && (
                <Pressable style={[styles.secondaryButton, styles.button]} onPress={resetForm}>
                  <Text style={styles.secondaryButtonText}>Annulla</Text>
                </Pressable>
              )}
              <Pressable style={[styles.primaryButton, styles.button]} onPress={handleSave} accessibilityLabel={editingId ? 'Salva contatto' : 'Crea contatto'}>
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                <Text style={styles.primaryButtonText}>{editingId ? 'Salva' : 'Crea contatto'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.primaryButton, styles.newButton]} onPress={() => setFormOpen(true)} accessibilityLabel="Nuovo contatto">
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <AppIcon name="person-add" size={20} color={t.colors.onButton} />
            <Text style={styles.primaryButtonText}>Nuovo contatto</Text>
          </Pressable>
        )}

        <Text style={styles.listTitle}>Contatti ({contacts.length})</Text>
        {contacts.length > 0 && (
          <View style={[styles.chipWrap, styles.filters]}>
            {FILTERS.map((f) => chip(f.id, `${f.label} · ${countFor(f.id)}`, filter === f.id, () => setFilter(f.id), `Filtro ${f.label}`))}
          </View>
        )}
        {shown.map((contact) => {
          const label = `${CONTACT_KIND_LABELS[contact.kind]} ${contact.name}`;
          return (
            <Pressable
              key={contact.id}
              style={[styles.item, editingId === contact.id && styles.itemEditing]}
              onPress={() => openCard(contact.id)}
              accessibilityLabel={`Apri ${label}`}
            >
              <View style={styles.itemIcon}>
                <AppIcon name={CONTACT_KIND_ICONS[contact.kind]} size={18} color={t.colors.accentInk} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemLabel} numberOfLines={2}>{contact.name}</Text>
                <Text style={styles.itemMeta} numberOfLines={2}>
                  {CONTACT_KIND_LABELS[contact.kind]} · {movements(usage[contact.id] ?? 0)}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(contact)} hitSlop={8} accessibilityLabel={`Elimina ${label}`}>
                <AppIcon name="delete" size={20} color={t.colors.error} />
              </Pressable>
            </Pressable>
          );
        })}
        {shown.length === 0 && (
          <Text style={styles.empty}>
            {contacts.length === 0 ? 'Nessun contatto: crea il primo qui sopra.' : filter === 'fornitore' ? 'Nessun fornitore.' : 'Nessun cliente.'}
          </Text>
        )}
        <Text style={styles.hint}>
          {contacts.length > 0 ? 'Tocca un contatto per vedere i suoi movimenti. ' : ''}
          Fornitori e clienti si scelgono in «Movimenta», per i carichi e gli scarichi.
        </Text>
      </ScrollView>

      <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpenId(null)}>
        <View style={styles.overlay}>
          {open && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardName} numberOfLines={2}>{open.name}</Text>
                  <Text style={styles.cardKind}>{CONTACT_KIND_LABELS[open.kind]}</Text>
                </View>
                <Pressable onPress={() => setOpenId(null)} accessibilityLabel="Chiudi scheda" hitSlop={8}>
                  <AppIcon name="close" size={24} color={t.colors.textSecondary} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.cardBody}>
                {([['phone', open.phone], ['email', open.email], ['notes', open.note]] as const).map(([icon, value]) => (value ? (
                  <View key={icon} style={styles.infoRow}>
                    <AppIcon name={icon} size={16} color={t.colors.textSecondary} />
                    <Text style={styles.infoText}>{value}</Text>
                  </View>
                ) : null))}
                <Text style={styles.cardSection}>Movimenti ({openEvents.length})</Text>
                {openEvents.length === 0 && <Text style={styles.empty}>Nessun movimento registrato con questo contatto.</Text>}
                {visibleEvents.map((event) => {
                  const product = getProductById(event.productId);
                  return (
                    <View key={event.id} style={styles.eventRow}>
                      <Text style={styles.eventText}>
                        {product?.sku || 'Prodotto eliminato'} · {describeStockEvent(event.details, placeLabel, product?.unit)}
                      </Text>
                      <Text style={styles.eventDate}>
                        {new Date(event.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  );
                })}
                {openEvents.length > visibleEvents.length && (
                  <Pressable onPress={() => setAllEvents(true)} accessibilityLabel="Mostra tutti i movimenti" hitSlop={8}>
                    <Text style={styles.more}>Mostra tutti ({openEvents.length})</Text>
                  </Pressable>
                )}
              </ScrollView>
              <View style={styles.cardActions}>
                <Pressable style={[styles.secondaryButton, styles.button]} onPress={() => startEdit(open)} accessibilityLabel="Modifica contatto">
                  <Text style={styles.secondaryButtonText}>Modifica</Text>
                </Pressable>
                <Pressable style={[styles.primaryButton, styles.button]} onPress={() => setOpenId(null)}>
                  <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                  <Text style={styles.primaryButtonText}>Chiudi</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    ...cardSurface(t),
    padding: 16,
    marginBottom: 24,
  },
  formTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 12,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  label: {
    fontSize: t.label.size,
    fontWeight: t.label.weight,
    color: t.label.color,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  newButton: {
    minHeight: 48,
    marginBottom: 24,
  },
  listTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  filters: {
    marginBottom: 12,
  },
  item: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemEditing: {
    borderWidth: 1,
    borderColor: t.colors.accent,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemLabel: {
    ...t.typography.cardTitle,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: t.weights.strong,
  },
  itemMeta: {
    ...t.typography.caption,
    lineHeight: 18,
    marginTop: 2,
  },
  empty: {
    ...t.typography.caption,
    lineHeight: 18,
    marginBottom: 6,
  },
  hint: {
    ...t.typography.caption,
    lineHeight: 18,
    marginTop: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: t.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  // Scheda del contatto sopra l'elenco: fondo opaco come la finestra «Movimenta»
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardHeading: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    ...t.typography.cardTitle,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: t.weights.strong,
  },
  cardKind: {
    ...t.typography.caption,
    lineHeight: 18,
    marginTop: 2,
  },
  cardBody: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 19,
    color: t.colors.textPrimary,
  },
  cardSection: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 8,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  eventRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  eventText: {
    fontSize: 14,
    lineHeight: 19,
    color: t.colors.textPrimary,
  },
  eventDate: {
    ...t.typography.caption,
    lineHeight: 18,
    marginTop: 2,
  },
  more: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: t.colors.accentInk,
    marginTop: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));
