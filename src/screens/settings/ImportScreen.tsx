// Impostazioni › Dati e backup › Importa prodotti (IMP, ticket 26, fetta DATI). Una schermata che scorre con quattro
// passi: 1. File (CSV con «,» o «;», oppure lo ZIP di «Esporta con le foto»; sul web anche trascinandolo qui);
// 2. Colonne (ogni intestazione con 2-3 valori d'esempio e dove va: Ignora, un campo di sistema, un campo
// personalizzato, «+ Crea campo»; proposta automatica con `guessMapping`); 3. Anteprima (nulla è scritto: nuovi,
// rifiutati col motivo, avvisi con «Crea / Usa…», numeri già convertiti, «Verifica link»); 4. Importa e riepilogo,
// con «Scarica righe rifiutate». La logica è in `utils/csvImport.ts`; qui solo lo stato e le scritture dopo «Importa».
// «+ Crea campo»: si va in Campi Personalizzati con l'editor già compilato, si salva e si torna qui con la colonna
// abbinata al campo nuovo (confronto degli id prima e dopo). File, abbinamento e scelte restano in una bozza
// (`furinventory_import_draft:{org}`) per la ricarica del web; le foto dello ZIP no (troppo grandi per il localStorage).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from '../../navigation/compat';
import * as FileSystem from '../../lib/fileSystem';
import * as Sharing from '../../lib/sharing';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { useShelves } from '../../../contexts/ShelvesContext';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { useGS1Config } from '../../../contexts/GS1ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { usePermission } from '../../../contexts/ProfileContext';
import { useLoadCheck } from '../../../hooks/useLoadCheck';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { Sheet } from '../../../components/ui/Sheet';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, fontStyle } from '../../../components/ui/Text';
import { PermissionNote } from '../../../components/PermissionNote';
import { parseCsv, stringifyCsv } from '../../../utils/csv';
import {
  detectDelimiter, fold, guessFieldType, guessMapping, importableFields, isAppFile, newLocationId, previewImport, rejectedRows,
  SYSTEM_TARGETS, type Preview, type Target,
} from '../../../utils/csvImport';
import { base64ToBytes, bytesToBase64, fromUtf8, isZip, mimeOfName, readZip } from '../../../utils/zip';
import { ZIP_IMAGES_DIR } from '../../../utils/productExport';
import { categoryPath } from '../../../utils/categories';
import { formatNumber } from '../../../utils/number';
import { formatPrice } from '../../../utils/price';
import { generateGS1DigitalLink } from '../../../utils/gs1';
import { overLimitText } from '../../../utils/shelves';
import { placeOfKey, stockKey } from '../../../utils/stock';

const DRAFT_KEY = 'furinventory_import_draft';

interface LoadedFile {
  name: string;
  text: string;
  zip: boolean;
}

interface Draft {
  file: LoadedFile;
  mapping: Target[];
  defaults: { location?: string; category?: string };
  locationChoice: Record<string, string>;
  categoryChoice: Record<string, string>;
  pending?: { column: number; idsBefore: string[] };
  created: string[];
}

/** Testo di un file: UTF-8, oppure Windows-1252 (CSV salvato da Excel senza UTF-8), senza BOM. */
function decodeText(bytes: Uint8Array): string {
  let text = fromUtf8(bytes);
  if (text.includes('�') && typeof TextDecoder !== 'undefined') {
    try { text = new TextDecoder('windows-1252').decode(bytes); } catch { /* resta UTF-8 */ }
  }
  return text.replace(/^﻿/, '');
}

export default function ImportScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, addProduct, libraries, addLibrary } = useInventory();
  const { locations, addLocation } = useLocations();
  const { furTypes } = useFurTypes();
  const { shelves } = useShelves();
  const { customFields, updateField } = useCustomFields();
  const { layout } = useLayout();
  const { gs1Config } = useGS1Config();
  const { organizationId } = useAuth();
  const addPerm = usePermission('aggiungere');
  const { check: checkLoad } = useLoadCheck();
  const draftKey = `${DRAFT_KEY}:${organizationId || 'local'}`;

  const [file, setFile] = useState<LoadedFile | null>(null);
  const [photos, setPhotos] = useState<Map<string, string> | null>(null);
  const [mapping, setMapping] = useState<Target[]>([]);
  const [defaults, setDefaults] = useState<Draft['defaults']>({});
  const [locationChoice, setLocationChoice] = useState<Record<string, string>>({});
  const [categoryChoice, setCategoryChoice] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Draft['pending']>();
  const [created, setCreated] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [picker, setPicker] = useState<null | { kind: 'column'; column: number } | { kind: 'default'; what: 'location' | 'category' } | { kind: 'use'; what: 'location' | 'category'; value: string }>(null);
  const [done, setDone] = useState<null | { imported: number; rejected: Preview['rejected']; header: string[]; over: string[] }>(null);
  const [links, setLinks] = useState<null | { ok: number; ko: string[]; checking: boolean }>(null);
  const restored = useRef(false);

  // ── File letto ─────────────────────────────────────────────
  const parsed = useMemo(() => {
    if (!file) return null;
    const delimiter = detectDelimiter(file.text);
    const rows = parseCsv(file.text, delimiter);
    return { delimiter, header: rows[0] ?? [], body: rows.slice(1) };
  }, [file]);
  const fields = importableFields(customFields);
  const lists = { fields: customFields, furTypes, categories: libraries };

  // Bozza ritrovata (ricarica del web, o ritorno da «+ Crea campo» dopo una ricarica)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(draftKey);
        const d: Draft | null = raw ? JSON.parse(raw) : null;
        if (d?.file && !restored.current) {
          setFile(d.file); setMapping(d.mapping ?? []); setDefaults(d.defaults ?? {}); setLocationChoice(d.locationChoice ?? {});
          setCategoryChoice(d.categoryChoice ?? {}); setPending(d.pending); setCreated(d.created ?? []);
          if (d.file.zip) setDraftNote('Le foto dello ZIP non restano dopo una ricarica: scegli di nuovo lo ZIP per importarle.');
        }
      } catch { /* bozza illeggibile: si riparte */ }
      restored.current = true;
    })();
  }, [draftKey]);

  // Bozza salvata a ogni cambio (non le foto)
  useEffect(() => {
    if (!restored.current || done) return;
    if (!file) { void AsyncStorage.removeItem(draftKey).catch(() => {}); return; }
    const d: Draft = { file, mapping, defaults, locationChoice, categoryChoice, pending, created };
    AsyncStorage.setItem(draftKey, JSON.stringify(d)).catch(() => setDraftNote('La bozza non si è potuta salvare (file troppo grande): non ricaricare la pagina prima di «Importa».'));
  }, [file, mapping, defaults, locationChoice, categoryChoice, pending, created, done, draftKey]);

  // Ritorno da «+ Crea campo»: il campo nuovo (non c'era prima) va sulla colonna
  useEffect(() => {
    if (!pending) return;
    const fresh = fields.find((f) => !pending.idsBefore.includes(f.id));
    if (!fresh) return;
    setMapping((m) => m.map((x, i) => (i === pending.column ? `field:${fresh.id}` as Target : x)));
    setCreated((c) => [...c, fresh.name]);
    setPending(undefined);
  }, [customFields, pending]);

  const load = async (name: string, bytes: Uint8Array) => {
    setError(''); setDone(null); setLinks(null); setDraftNote('');
    try {
      let text: string;
      let zipPhotos: Map<string, string> | null = null;
      if (isZip(bytes)) {
        const entries = await readZip(bytes);
        const csv = entries.find((e) => /(^|\/)inventario\.csv$/i.test(e.name)) ?? entries.find((e) => /\.csv$/i.test(e.name));
        if (!csv) throw new Error('Nello ZIP non c\'è un file CSV.');
        text = decodeText(csv.data);
        zipPhotos = new Map();
        for (const e of entries) {
          if (!e.name.startsWith(ZIP_IMAGES_DIR) || !/\.(jpe?g|png|webp|gif|heic)$/i.test(e.name)) continue;
          zipPhotos.set(e.name.slice(ZIP_IMAGES_DIR.length), `data:${mimeOfName(e.name)};base64,${bytesToBase64(e.data)}`);
        }
      } else {
        if (!/\.(csv|txt)$/i.test(name)) throw new Error('Scegli un file .csv o lo .zip di «Esporta con le foto».');
        text = decodeText(bytes);
      }
      const delimiter = detectDelimiter(text);
      const rows = parseCsv(text, delimiter);
      if (rows.length < 2) throw new Error('Il CSV non contiene prodotti.');
      setFile({ name, text, zip: !!zipPhotos });
      setPhotos(zipPhotos);
      setMapping(guessMapping(rows[0], lists, rows.slice(1)));
      setDefaults({}); setLocationChoice({}); setCategoryChoice({}); setPending(undefined); setCreated([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Il file non si può leggere.');
    }
  };

  const pickFile = async () => {
    if (!addPerm.allowed) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain', 'application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      await load(asset.name || 'file.csv', base64ToBytes(base64));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Il file non si può leggere.');
    }
  };

  const onDrop = async (event: any) => {
    event.preventDefault();
    if (!addPerm.allowed) return;
    const dropped = event.dataTransfer?.files?.[0];
    if (!dropped) return;
    if (!/\.(csv|txt|zip)$/i.test(dropped.name || '')) {
      Alert.alert('Formato non supportato', 'Trascina un file .csv o lo .zip di «Esporta con le foto».');
      return;
    }
    await load(dropped.name, new Uint8Array(await dropped.arrayBuffer()));
  };

  const cancel = () => {
    setFile(null); setPhotos(null); setMapping([]); setDone(null); setError(''); setLinks(null); setPending(undefined); setCreated([]);
    void AsyncStorage.removeItem(draftKey).catch(() => {});
  };

  // ── Anteprima (pura, a ogni cambio) ────────────────────────
  const layoutFields = layout.fields;
  const gs1 = gs1Config.baseUrl ? (sku: string, n: number) => generateGS1DigitalLink(gs1Config, sku, n) : undefined;
  const appFile = parsed ? isAppFile(parsed.header, parsed.delimiter) : false;
  const context = {
    products, locations, categories: libraries, furTypes, shelves, fields: customFields, layoutFields,
    defaults, locationChoice, categoryChoice, photos: photos ?? undefined, gs1, appFile,
  };
  const preview = useMemo(
    () => (parsed && !done ? previewImport(parsed.body, mapping, context) : null),
    [parsed, mapping, products, locations, libraries, furTypes, shelves, customFields, layoutFields, defaults, locationChoice, categoryChoice, photos, done],
  );

  const targetLabel = (target: Target) => {
    if (target === 'ignore') return 'Ignora';
    if (target.startsWith('field:')) return fields.find((f) => `field:${f.id}` === target)?.name ?? 'Campo';
    return SYSTEM_TARGETS.find((s) => s.id === target)?.label ?? target;
  };
  const examples = (i: number) => (parsed?.body ?? []).map((r) => (r[i] ?? '').trim()).filter(Boolean).slice(0, 3);

  const createField = (column: number) => {
    if (!parsed) return;
    const values = parsed.body.map((r) => r[column] ?? '');
    const guess = guessFieldType(values);
    setPending({ column, idsBefore: fields.map((f) => f.id) });
    setPicker(null);
    // dopo la chiusura della finestra (la sua voce della storia del web), poi Campi Personalizzati
    setTimeout(() => router.push({
      pathname: '/settings/fields',
      params: { nuovoCampo: parsed.header[column].trim(), tipo: guess.type, valori: JSON.stringify(guess.options), ritorno: 'import' },
    }), 350);
  };

  const createPlace = async (what: 'location' | 'category', value: string) => {
    if (what === 'location') {
      const id = newLocationId(value, locations);
      await addLocation({ id, label: value.trim(), color: t.colors.accent });
      setLocationChoice((c) => ({ ...c, [fold(value)]: id }));
    } else {
      const lib = addLibrary(value.trim(), 'folder');
      setCategoryChoice((c) => ({ ...c, [fold(value)]: lib.id }));
    }
  };

  const checkLinks = async () => {
    const all = [...new Set((preview?.toAdd ?? []).flatMap((r) => r.product.images.filter((u) => /^https?:\/\//i.test(u))))];
    if (!all.length || Platform.OS !== 'web') { setLinks({ ok: 0, ko: [], checking: false }); return; }
    setLinks({ ok: 0, ko: [], checking: true });
    const results = await Promise.all(all.slice(0, 60).map((url) => new Promise<boolean>((resolve) => {
      const img = new (window as any).Image();
      const timer = setTimeout(() => resolve(false), 8000);
      img.onload = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = url;
    })));
    setLinks({ ok: results.filter(Boolean).length, ko: all.slice(0, 60).filter((_, i) => !results[i]), checking: false });
  };

  // ── Importa: si rifà l'anteprima e si scrive quella ────────
  const runImport = async () => {
    if (!parsed || !addPerm.allowed) return;
    const p = previewImport(parsed.body, mapping, context);
    for (const { fieldId, options } of p.newOptions) {
      const field = customFields.find((f) => f.id === fieldId);
      if (field) await updateField(fieldId, { options, dataset: options.map((o) => o.label) });
    }
    let imported = 0;
    const failed: Preview['rejected'] = [];
    const over = new Map<string, string>(); // S3: «A1 è oltre il limite: …» (l'ultima riga vince), solo informazione
    for (const row of p.toAdd) {
      const { product } = row;
      // S3: posti che questa riga porta oltre il limite, prima di scrivere (come l'import di prima)
      const entries: [string, number][] = row.stock
        ? Object.entries(row.stock).filter(([, qty]) => qty > 0)
        : product.status === 'available' ? [[stockKey(product.location, product.shelfId), 1]] : [];
      const perPlace = new Map<string, number>();
      for (const [key, qty] of entries) perPlace.set(placeOfKey(key), (perPlace.get(placeOfKey(key)) ?? 0) + qty);
      const loads = [
        ...entries.filter(([key]) => key !== placeOfKey(key)).map(([key, qty]) => checkLoad(product as any, key, [{ qty }], { soloScaffale: true })),
        ...[...perPlace].map(([place, qty]) => checkLoad(product as any, place, [{ qty }])),
      ];
      // Le opzioni nuove sono già nel registro: la copia del campo salvata col prodotto le ha
      const fresh = { ...product, customData: product.customData.map((c) => ({ ...c, fieldSnapshot: p.newOptions.find((n) => n.fieldId === c.fieldSnapshot.id) ? { ...c.fieldSnapshot, options: p.newOptions.find((n) => n.fieldId === c.fieldSnapshot.id)!.options } : c.fieldSnapshot })) };
      if (addProduct(fresh, row.stock ? { stock: row.stock } : undefined)) {
        imported += 1;
        for (const l of loads) if (l.level === 'blocco') over.set(l.name, overLimitText(l));
      } else failed.push({ row: row.row, sku: row.sku, reason: 'giacenza non valida', cells: parsed.body[row.row - 2] ?? [] });
    }
    const rejected = [...p.rejected, ...failed].sort((a, b) => a.row - b.row);
    setDone({ imported, rejected, header: parsed.header, over: [...over.values()] });
    void AsyncStorage.removeItem(draftKey).catch(() => {});
    Alert.alert('Importazione completata', `${imported} prodotti importati. ${rejected.length} saltati (SKU vuoto o già presente, o giacenza non valida).`
      + (over.size ? ` ${[...over.values()].join('. ')}.` : ''));
  };

  const downloadRejected = async () => {
    if (!done) return;
    const content = `﻿${stringifyCsv(rejectedRows(done.header, done.rejected), parsed?.delimiter ?? ',')}`;
    const name = `righe-rifiutate_${Date.now()}.csv`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const uri = FileSystem.documentDirectory + name;
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  const finish = () => { cancel(); router.back(); };

  // ── Disegno ────────────────────────────────────────────────
  const sample = (preview?.toAdd ?? []).slice(0, 3);
  const placeName = (id: string) => locations.find((l) => l.id === id)?.label ?? id;
  const sampleLine = (r: NonNullable<typeof preview>['toAdd'][number]) => [
    r.product.location && placeName(r.product.location),
    r.product.libraryId && categoryPath(libraries, r.product.libraryId),
    r.product.sellPrice != null && formatPrice(r.product.sellPrice),
    r.stock && `${formatNumber(Object.values(r.stock).reduce((a, b) => a + b, 0))} ${r.product.unit || 'pz'}`,
    r.product.images.length ? `${r.product.images.length} foto` : '',
    ...r.product.customData.filter((c) => mapping.includes(`field:${c.fieldSnapshot.id}` as Target)).map((c) => `${c.fieldSnapshot.name}: ${Array.isArray(c.value) ? c.value.length : 1}`),
  ].filter(Boolean).join(' · ');

  const pickerOptions = (): { id: string; label: string; onPress: () => void }[] => {
    if (!picker) return [];
    if (picker.kind === 'column') {
      const set = (target: Target) => () => { setMapping((m) => m.map((x, i) => (i === picker.column ? target : x))); setPicker(null); };
      return [
        { id: 'ignore', label: 'Ignora', onPress: set('ignore') },
        ...SYSTEM_TARGETS.map((s) => ({ id: s.id, label: s.label, onPress: set(s.id) })),
        ...fields.map((f) => ({ id: `field:${f.id}`, label: `${f.name} (campo)`, onPress: set(`field:${f.id}`) })),
        { id: 'create', label: '+ Crea campo', onPress: () => createField(picker.column) },
      ];
    }
    const list = picker.what === 'location'
      ? locations.map((l) => ({ id: l.id, label: l.label }))
      : libraries.map((c) => ({ id: c.id, label: categoryPath(libraries, c.id) }));
    if (picker.kind === 'default') {
      const set = (id?: string) => () => { setDefaults((d) => ({ ...d, [picker.what]: id })); setPicker(null); };
      return [{ id: '', label: 'Nessuno', onPress: set(undefined) }, ...list.map((o) => ({ ...o, onPress: set(o.id) }))];
    }
    const setChoice = picker.what === 'location' ? setLocationChoice : setCategoryChoice;
    return list.map((o) => ({ ...o, onPress: () => { setChoice((c) => ({ ...c, [fold(picker.value)]: o.id })); setPicker(null); } }));
  };
  const pickerTitle = !picker ? '' : picker.kind === 'column' ? `Colonna «${parsed?.header[picker.column] ?? ''}»`
    : picker.kind === 'default' ? (picker.what === 'location' ? 'Posizione per le righe vuote' : 'Categoria per le righe vuote')
      : `Usa al posto di «${picker.value}»`;
  const selectedId = !picker ? '' : picker.kind === 'column' ? mapping[picker.column] : picker.kind === 'default' ? defaults[picker.what] ?? '' : '';

  return (
    <View style={styles.container}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: t.spacing.screenPadding, paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        <PermissionNote text={addPerm.reason} />

        {/* 1. FILE */}
        <Text style={styles.sectionTitle}>1. File</Text>
        <View style={styles.card}>
          {file ? (
            <>
              <Text style={styles.strong} testID="import-file">{file.name}</Text>
              <Text style={styles.caption}>
                {`${parsed?.body.length ?? 0} righe · separatore «${parsed?.delimiter === '\t' ? 'tab' : parsed?.delimiter}»`}
                {photos ? ` · ${photos.size} foto nello ZIP` : ''}
              </Text>
              {draftNote ? <Text style={styles.note}>{draftNote}</Text> : null}
              <View style={styles.actions}>
                <Pressable onPress={() => void pickFile()} accessibilityRole="button"><Text style={styles.link}>Cambia file</Text></Pressable>
                <Pressable onPress={cancel} accessibilityRole="button"><Text style={styles.link}>Annulla</Text></Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.caption}>Un CSV con la virgola o il punto e virgola (Excel), oppure lo ZIP di «Esporta con le foto». Nulla si scrive prima di «Importa».</Text>
              <Pressable style={styles.button} onPress={() => void pickFile()} accessibilityRole="button">
                <AppIcon name="file-upload" size={20} color={t.colors.onButton} />
                <Text style={styles.buttonText}>Scegli file</Text>
              </Pressable>
            </>
          )}
          {Platform.OS === 'web' && React.createElement('div', {
            role: 'region',
            'aria-label': 'Importa CSV trascinando un file qui',
            onDragOver: (event: any) => event.preventDefault(),
            onDrop: (event: any) => void onDrop(event),
            style: {
              ...fontStyle(t, '400'), fontSize: 13, lineHeight: '18px', border: `1px dashed ${t.colors.dash}`, borderRadius: t.radius.card,
              padding: 14, marginTop: 12, color: t.colors.textSecondary, background: t.colors.surface, textAlign: 'center',
            },
            children: 'Oppure trascina qui il file (.csv o .zip)',
          })}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {parsed && !done && (
          <>
            {/* 2. COLONNE */}
            <Text style={styles.sectionTitle}>2. Colonne</Text>
            {!mapping.includes('sku') && <Text style={styles.warning}>Nessuna colonna è lo SKU: scegli quale (le righe senza SKU non si importano).</Text>}
            {parsed.header.map((name, i) => (
              <Pressable key={`${i}-${name}`} style={styles.columnRow} onPress={() => setPicker({ kind: 'column', column: i })} accessibilityRole="button" accessibilityLabel={`Colonna ${name}: ${targetLabel(mapping[i] ?? 'ignore')}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.strong} numberOfLines={1}>{name || `Colonna ${i + 1}`}</Text>
                  <Text style={styles.caption} numberOfLines={1}>{examples(i).join(' · ') || 'vuota'}</Text>
                </View>
                <Text style={[styles.target, (mapping[i] ?? 'ignore') === 'ignore' && styles.targetOff]} numberOfLines={1}>{targetLabel(mapping[i] ?? 'ignore')}</Text>
                <AppIcon name="expand-more" size={20} color={t.colors.textSecondary} />
              </Pressable>
            ))}
            <View style={styles.card}>
              <Text style={styles.caption}>Valore per le righe vuote</Text>
              <Pressable style={styles.inline} onPress={() => setPicker({ kind: 'default', what: 'location' })} accessibilityRole="button">
                <Text style={styles.body}>Posizione</Text>
                <Text style={styles.target}>{defaults.location ? placeName(defaults.location) : 'Nessuna'}</Text>
              </Pressable>
              <Pressable style={styles.inline} onPress={() => setPicker({ kind: 'default', what: 'category' })} accessibilityRole="button">
                <Text style={styles.body}>Categoria</Text>
                <Text style={styles.target}>{defaults.category ? categoryPath(libraries, defaults.category) : 'Nessuna'}</Text>
              </Pressable>
            </View>

            {/* 3. ANTEPRIMA */}
            {preview && (
              <>
                <Text style={styles.sectionTitle}>3. Anteprima</Text>
                <View style={styles.card} testID="import-anteprima">
                  <Text style={styles.strong}>{`${preview.toAdd.length} nuovi, ${preview.rejected.length} rifiutati, ${preview.warnings.length} avvisi`}</Text>
                  <Text style={styles.caption}>Nulla è ancora scritto. I prodotti già presenti non si toccano.</Text>
                  {created.length > 0 && <Text style={styles.note}>{`${created.map((n) => `«${n}»`).join(', ')}: il campo creato resta anche se annulli l'import.`}</Text>}
                  {sample.map((r) => (
                    <Text key={r.row} style={styles.body} numberOfLines={2}>{`${r.sku}: ${sampleLine(r) || '—'}`}</Text>
                  ))}
                </View>
                {preview.warnings.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.caption}>Avvisi</Text>
                    {preview.warnings.map((w) => (
                      <View key={w.key} style={styles.warningRow}>
                        <Text style={styles.body}>{w.text}</Text>
                        {w.kind && w.value ? (
                          <View style={styles.actions}>
                            <Pressable onPress={() => void createPlace(w.kind!, w.value!)} accessibilityRole="button"><Text style={styles.link}>Crea</Text></Pressable>
                            <Pressable onPress={() => setPicker({ kind: 'use', what: w.kind!, value: w.value! })} accessibilityRole="button"><Text style={styles.link}>Usa…</Text></Pressable>
                          </View>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
                {preview.rejected.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.caption}>Righe rifiutate</Text>
                    {preview.rejected.slice(0, 50).map((r) => (
                      <Text key={r.row} style={styles.body}>{`Riga ${r.row} · ${r.sku || 'senza SKU'}: ${r.reason}`}</Text>
                    ))}
                    {preview.rejected.length > 50 && <Text style={styles.caption}>{`…e altre ${preview.rejected.length - 50}`}</Text>}
                  </View>
                )}
                {preview.toAdd.some((r) => r.product.images.some((u) => /^https?:\/\//i.test(u))) && (
                  <View style={styles.card}>
                    <Pressable onPress={() => void checkLinks()} accessibilityRole="button"><Text style={styles.link}>Verifica link delle immagini</Text></Pressable>
                    {links && (
                      <Text style={styles.caption}>{links.checking ? 'Verifica in corso…' : `${links.ok} si vedono, ${links.ko.length} non rispondono${links.ko.length ? `: ${links.ko.slice(0, 3).join(', ')}` : ''}`}</Text>
                    )}
                  </View>
                )}

                {/* 4. IMPORTA */}
                <Pressable
                  style={[styles.button, (!preview.toAdd.length || !addPerm.allowed) && styles.buttonOff]}
                  onPress={() => { if (preview.toAdd.length) void runImport(); }}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>{`Importa ${preview.toAdd.length} ${preview.toAdd.length === 1 ? 'prodotto' : 'prodotti'}`}</Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {done && (
          <>
            <Text style={styles.sectionTitle}>4. Fatto</Text>
            <View style={styles.card} testID="import-fatto">
              <Text style={styles.strong}>{`${done.imported} prodotti importati, ${done.rejected.length} rifiutati`}</Text>
              {done.over.map((o) => <Text key={o} style={styles.body}>{o}</Text>)}
              {done.rejected.slice(0, 20).map((r) => <Text key={r.row} style={styles.body}>{`Riga ${r.row} · ${r.sku || 'senza SKU'}: ${r.reason}`}</Text>)}
              {done.rejected.length > 0 && (
                <Pressable onPress={() => void downloadRejected()} accessibilityRole="button"><Text style={styles.link}>Scarica righe rifiutate</Text></Pressable>
              )}
            </View>
            <Pressable style={styles.button} onPress={finish} accessibilityRole="button"><Text style={styles.buttonText}>Fatto</Text></Pressable>
          </>
        )}
      </ScrollView>

      <Sheet visible={!!picker} onClose={() => setPicker(null)} title={pickerTitle}>
        {pickerOptions().map((o) => (
          <Pressable key={o.id || 'none'} style={styles.option} onPress={o.onPress} accessibilityRole="button">
            <Text style={[styles.body, o.id === selectedId && styles.selected]}>{o.label}</Text>
            {o.id === selectedId && <AppIcon name="check" size={20} color={t.colors.accentInk} />}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  sectionTitle: { ...t.typography.sectionHeader, lineHeight: 18, marginTop: 18, marginBottom: 8 },
  card: { ...cardSurface(t), paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10, gap: 6 },
  strong: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong },
  caption: { ...t.typography.caption, fontSize: 13, lineHeight: 18 },
  body: { ...t.typography.body, fontSize: 14, lineHeight: 20 },
  note: { fontSize: 13, lineHeight: 18, color: t.colors.textSecondary, fontStyle: 'italic' },
  warning: { fontSize: 13, lineHeight: 18, color: t.colors.error, marginBottom: 8 },
  error: { fontSize: 13, lineHeight: 18, color: t.colors.error, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 4 },
  link: { fontSize: 14, lineHeight: 20, fontWeight: t.weights.strong, color: t.colors.accentInk, paddingVertical: 4 },
  columnRow: { ...cardSurface(t), flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, minHeight: 52 },
  target: { maxWidth: '45%', fontSize: 14, fontWeight: t.weights.strong, color: t.colors.accentInk },
  targetOff: { color: t.colors.textSecondary, fontWeight: '400' },
  inline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
  warningRow: { paddingVertical: 4, borderTopWidth: 1, borderTopColor: t.colors.borderLight },
  button: {
    height: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.button,
    borderRadius: t.radius.button, marginTop: 10, marginBottom: 6,
  },
  buttonOff: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600', color: t.colors.onButton },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderBottomWidth: 1, borderBottomColor: t.colors.borderLight },
  selected: { fontWeight: t.weights.strong, color: t.colors.accentInk },
}));
