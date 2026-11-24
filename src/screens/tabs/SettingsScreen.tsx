// FurInventory Pro - Settings Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import * as FileSystem from '../../lib/fileSystem';
import * as Sharing from '../../lib/sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useInventory } from '../../../contexts/InventoryContext';
import { parseCsv, stringifyCsv } from '../../../utils/csv';
import { movementCsvRows, productCsvColumns, productCsvRows, productFromCsvRow, stockCsvRows } from '../../../utils/productCsv';
import { categoryPath } from '../../../utils/categories';
import { usePlaceLabel } from '../../../hooks/usePlaceLabel';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { useContacts } from '../../../contexts/ContactsContext';
import { useShelves } from '../../../contexts/ShelvesContext';
import { useLoadCheck } from '../../../hooks/useLoadCheck';
import { overLimitText } from '../../../utils/shelves';
import { placeOfKey, stockKey } from '../../../utils/stock';
import { LOGIN_ENABLED, useAuth } from '../../../contexts/AuthContext';
import { createGoogleSheetBackup, ensureOrganizationDriveFolder, uploadDriveFile } from '../../../backend-auth/google/driveApi';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, fontStyle } from '../../../components/ui/Text';
import { Dimmed, PermissionNote } from '../../../components/PermissionNote';
import { usePermission, useProfile } from '../../../contexts/ProfileContext';
import { profileSubtitle } from '../../../utils/profile';
import { useStoreNetwork } from '../../../contexts/StoreNetworkContext';
import { settingsSubtitle } from '../../../utils/storeNetwork';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';

export default function SettingsScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, timeline, addProduct, getProductBySku, libraries } = useInventory();
  // S1b: nei report le chiavi con lo scaffale si leggono «Magazzino › A1»
  const placeLabel = usePlaceLabel();
  const { furTypes, labelOf } = useFurTypes();
  const { nameOf: contactName } = useContacts();
  // S1a: colonna «Scaffale» nel CSV dei prodotti (nome dello scaffale dentro la posizione)
  const { shelves } = useShelves();
  // S3 (ticket 15): l'import registra merce che è già lì: niente blocco, solo l'informazione «oltre il limite»
  const { check: checkLoad } = useLoadCheck();
  // `contact`: nome del fornitore o cliente nel report dei movimenti (M10); undefined per un id sconosciuto, che resta scritto
  // C1: nel report delle giacenze «Categoria» è la cartella (nome completo) e «Tipo di pelle» il nome del tipo
  const reportLabels = {
    place: placeLabel,
    category: (id: string | undefined) => categoryPath(libraries, id),
    furType: labelOf,
    contact: contactName,
  };
  const { session, organizationId, user, signOut } = useAuth();
  const [cloudBackupBusy, setCloudBackupBusy] = useState(false);
  // ACC1 (ticket 32): profilo e permessi di questo telefono. Le voci che cambiano le impostazioni e l'import restano
  // visibili, attenuate e senza effetto, con il motivo sopra il blocco, quando il ruolo non le permette
  const { profile } = useProfile();
  const settingsPerm = usePermission('impostazioni');
  const addPerm = usePermission('aggiungere');
  const openSetting = (path: string) => { if (settingsPerm.allowed) router.push(path); };
  // Rete del negozio (RETE0): lo stato vero, dal contesto della rete (sul web mai «Fa da centro»)
  const networkState = settingsSubtitle(useStoreNetwork().view);

  const showComingSoon = (feature: string) => {
    Alert.alert('Prossimamente', `${feature} sarà disponibile nella prossima versione`);
  };

  // Un solo modo di scaricare (web) o condividere (telefono) un CSV: prodotti, giacenze e movimenti (M08)
  const exportCsv = async (name: string, rows: readonly (readonly unknown[])[]) => {
    try {
      const csvContent = stringifyCsv(rows);

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name}_${Date.now()}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      const fileUri = FileSystem.documentDirectory + `${name}_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Successo', `File salvato in: ${fileUri}`);
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile esportare i dati');
    }
  };
  const exportToCSV = () => exportCsv('inventario', productCsvRows(products, libraries, shelves));
  const exportStockCsv = () => exportCsv('giacenze', stockCsvRows(products, reportLabels));
  const exportMovementsCsv = () => exportCsv('movimenti', movementCsvRows(timeline, products, reportLabels));

  const backupToDrive = async () => {
    const accessToken = (session as any)?.provider_token as string | undefined;
    if (!accessToken || !organizationId) {
      Alert.alert('Google Drive non collegato', 'Accedi di nuovo con Google dopo la configurazione OAuth per autorizzare Drive.');
      return;
    }
    setCloudBackupBusy(true);
    try {
      const values = [
        ['SKU', 'Tipo di pelle', 'Posizione', 'Status', 'Prezzo Acquisto', 'Prezzo Vendita', 'Lunghezza', 'Larghezza', 'Peso', 'Note', 'Data Produzione', 'Immagini URL', 'Dati Personalizzati JSON', 'GS1 Digital Link', 'Link allegati Drive JSON'],
        ...products.map((product) => [
          product.sku, product.furType, product.location, product.status,
          product.purchasePrice, product.sellPrice, product.length, product.width, product.weight,
          product.technicalNotes, product.productionDate, JSON.stringify(product.backupImageLinks?.length ? product.backupImageLinks : (product.images || []).filter((uri) => /^https?:\/\//i.test(uri))),
          JSON.stringify(product.customData || []), product.gs1DigitalLink, JSON.stringify(product.backupCustomDataLinks || {}),
        ]),
      ];
      const content = stringifyCsv(values);
      const folderId = await ensureOrganizationDriveFolder(accessToken, organizationId);
      const file = await uploadDriveFile(
        accessToken, folderId, `inventario_${new Date().toISOString().slice(0, 10)}.csv`,
        new Blob([content], { type: 'text/csv;charset=utf-8' }), 'text/csv',
      );
      const sheet = await createGoogleSheetBackup(accessToken, `Inventario ${new Date().toLocaleDateString('it-IT')}`, values.map((row) => row.map((cell) => cell == null ? '' : String(cell))));
      Alert.alert(
        'Backup completato',
        `CSV su Drive${file.webViewLink ? `: ${file.webViewLink}` : ''}\nFoglio Google: ${sheet.spreadsheetUrl}`,
        [{ text: 'Apri foglio', onPress: () => void Linking.openURL(sheet.spreadsheetUrl) }, { text: 'Chiudi' }],
      );
    } catch (error) {
      Alert.alert('Backup non riuscito', error instanceof Error ? error.message : 'Google Drive non ha completato il caricamento.');
    } finally {
      setCloudBackupBusy(false);
    }
  };

  const importCsvContent = (content: string) => {
    const rows = parseCsv(content.replace(/^\uFEFF/, ''));
    if (rows.length < 2) throw new Error('Il CSV non contiene prodotti.');
    // C1: colonne e formato (prima di M01, M01-M10, da C1) dall'intestazione; una riga → un prodotto in `productFromCsvRow`
    const cols = productCsvColumns(rows[0]);
    if (cols.sku < 0) throw new Error('Manca la colonna SKU. Esporta prima un CSV dall’app per vedere il formato supportato.');

    let imported = 0;
    let skipped = 0;
    const over = new Map<string, string>(); // S3: nome del posto → «A1 è oltre il limite: …» (l'ultima riga vince)
    const seenSkus = new Set(products.map((product) => product.sku.trim().toLocaleLowerCase()));
    rows.slice(1).forEach((row) => {
      // SKU vuoto, giacenza scritta ma non valida o su uno scaffale (S1a): `null`, la riga si salta
      const parsed = productFromCsvRow(row, cols, { categories: libraries, furTypes, shelves });
      const normalizedSku = parsed ? parsed.product.sku.toLocaleLowerCase() : '';
      if (!parsed || seenSkus.has(normalizedSku) || getProductBySku(parsed.product.sku)) {
        skipped += 1;
        return;
      }
      seenSkus.add(normalizedSku);
      // S3: posti che questa riga porta oltre il limite, prima di scrivere: ogni scaffale con la sua quantità, ogni
      // posizione con capienza con la somma della riga (revisore: «X: 5; X/A1: 5» sono 10 pezzi in X)
      const { product } = parsed;
      const entries: [string, number][] = parsed.stock
        ? Object.entries(parsed.stock).filter(([, qty]) => qty > 0)
        : product.status === 'available' ? [[stockKey(product.location, product.shelfId), 1]] : [];
      const perPlace = new Map<string, number>();
      for (const [key, qty] of entries) perPlace.set(placeOfKey(key), (perPlace.get(placeOfKey(key)) ?? 0) + qty);
      const loads = [
        ...entries.filter(([key]) => key !== placeOfKey(key)).map(([key, qty]) => checkLoad(product, key, [{ qty }], { soloScaffale: true })),
        ...[...perPlace].map(([place, qty]) => checkLoad(product, place, [{ qty }])),
      ];
      const added = addProduct(parsed.product, parsed.stock ? { stock: parsed.stock } : undefined);
      if (added) {
        imported += 1;
        for (const l of loads) if (l.level === 'blocco') over.set(l.name, overLimitText(l));
      } else skipped += 1;
    });

    return { imported, skipped, over: [...over.values()] };
  };

  /** Messaggio finale dell'import (S3: con i posti oltre il limite, se ce ne sono; altrimenti quello di prima). */
  const importText = (outcome: { imported: number; skipped: number; over: string[] }) =>
    `${outcome.imported} prodotti importati. ${outcome.skipped} saltati (SKU vuoto o già presente, o giacenza non valida).`
    + (outcome.over.length ? ` ${outcome.over.join('. ')}.` : '');

  const importFromCSV = async () => {
    if (!addPerm.allowed) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const outcome = importCsvContent(content);
      Alert.alert('Importazione completata', importText(outcome));
    } catch (error) {
      Alert.alert('Importazione non riuscita', error instanceof Error ? error.message : 'Il file CSV non è valido.');
    }
  };

  const handleCsvDrop = async (event: any) => {
    event.preventDefault();
    if (!addPerm.allowed) return;
    const file = event.dataTransfer?.files?.[0];
    if (!file || !/\.csv$/i.test(file.name || '')) {
      Alert.alert('Formato non supportato', 'Trascina un file .csv.');
      return;
    }
    try {
      const outcome = importCsvContent(await file.text());
      Alert.alert('Importazione completata', importText(outcome));
    } catch (error) {
      Alert.alert('Importazione non riuscita', error instanceof Error ? error.message : 'Il file CSV non è valido.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.screenPadding,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Impostazioni</Text>
        </View>



        {/* ASPETTO: stile dell'app, scelto su questo dispositivo */}
        <Text style={styles.sectionTitle}>Aspetto</Text>

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/appearance')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#EC4899' }]}>
              <AppIcon name="palette" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Aspetto</Text>
              <Text style={styles.settingDescription}>
                Stile: {t.name}
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* CONFIGURAZIONE HARDWARE E GS1 - NEW */}
        <Text style={styles.sectionTitle}>Configurazione hardware</Text>
        <PermissionNote text={settingsPerm.reason} />
        <Dimmed off={!settingsPerm.allowed}>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/gs1-config')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}>
              <AppIcon name="link" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>GS1 Digital Link</Text>
              <Text style={styles.settingDescription}>
                Configura lo standard URL per i prodotti
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/hardware')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
              <AppIcon name="settings-cell" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Scanner & NFC</Text>
              <Text style={styles.settingDescription}>
                Preferenze lettura/scrittura hardware
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        </Dimmed>

        {/* GESTIONE INVENTARIO */}
        <Text style={styles.sectionTitle}>Gestione inventario</Text>
        <PermissionNote text={settingsPerm.reason} />
        <Dimmed off={!settingsPerm.allowed}>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/folders')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
              <AppIcon name="folder" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Categorie</Text>
              <Text style={styles.settingDescription}>
                Categorie e sottocategorie dei prodotti
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/fields')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#10B981' }]}>
              <AppIcon name="tune" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Campi Personalizzati</Text>
              <Text style={styles.settingDescription}>
                Aggiungi e riordina campi prodotto
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/layout-builder')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <AppIcon name="dashboard-customize" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Configura Layout Aggiungi</Text>
              <Text style={styles.settingDescription}>
                Personalizza ordine e dimensione campi
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* Modelli di settore: campi pronti per abbigliamento, elettronica, alimentari… (D13) */}
        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/sector-templates')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}>
              <AppIcon name="store" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Modelli di settore</Text>
              <Text style={styles.settingDescription}>
                Campi pronti per il tuo tipo di prodotti
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/trash')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#EF4444' }]}>
              <AppIcon name="delete" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Cestino</Text>
              <Text style={styles.settingDescription}>
                Recupera o elimina prodotti cancellati
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/locations')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="location-on" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Gestisci Posizioni</Text>
              <Text style={styles.settingDescription}>
                Modifica locazioni disponibili
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* Scaffali (S1a): dentro le posizioni, generici o di una categoria */}
        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/shelves')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="shelves" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Scaffali</Text>
              <Text style={styles.settingDescription}>
                Dentro le posizioni, generici o di una categoria
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* C2 (ticket 21): i valori di «Tipo di pelle» si gestiscono solo da Campi Personalizzati (matita del campo) */}
        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/contacts')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="people" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Fornitori e clienti</Text>
              <Text style={styles.settingDescription}>
                Contatti da scegliere nei carichi e negli scarichi
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>


        </Dimmed>

        {/* CONDIVISIONE */}
        <Text style={styles.sectionTitle}>Condivisione</Text>
        <PermissionNote text={settingsPerm.reason} />
        <Dimmed off={!settingsPerm.allowed}>

        <Pressable
          style={styles.settingRow}
          onPress={() => openSetting('/settings/share')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#06B6D4' }]}>
              <AppIcon name="share" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Configurazione Condivisione</Text>
              <Text style={styles.settingDescription}>
                Personalizza info condivise Cliente/Professionista
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        </Dimmed>

        {/* ALERT E NOTIFICHE */}
        <Text style={styles.sectionTitle}>Alert e notifiche</Text>

        <Pressable
          style={styles.settingRow}
          onPress={() => showComingSoon('Configurazione alert manutenzione')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' }]}>
              <AppIcon name="notifications" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Alert Prodotti Dormienti</Text>
              <Text style={styles.settingDescription}>
                Soglia: 6 mesi senza movimenti
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => showComingSoon('Configurazione suggerimenti AI')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <AppIcon name="auto-awesome" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Suggerimenti AI</Text>
              <Text style={styles.settingDescription}>
                Consigli automatici per prodotti in magazzino
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* DATI E BACKUP */}
        <Text style={styles.sectionTitle}>Dati e backup</Text>

        <Pressable
          style={styles.settingRow}
          onPress={exportToCSV}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#10B981' }]}>
              <AppIcon name="file-download" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Esporta Inventario</Text>
              <Text style={styles.settingDescription}>
                Esporta CSV completo, apribile anche in Excel
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable style={styles.settingRow} onPress={exportStockCsv}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="inventory" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Esporta giacenze</Text>
              <Text style={styles.settingDescription}>
                CSV con quantità per posizione e articoli sotto scorta
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable style={styles.settingRow} onPress={exportMovementsCsv}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: t.colors.accent }]}>
              <AppIcon name="swap-vert" size={24} color={t.colors.onAccent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Esporta movimenti</Text>
              <Text style={styles.settingDescription}>
                CSV di carichi, scarichi, trasferimenti e rettifiche
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <PermissionNote text={addPerm.reason} />
        <Dimmed off={!addPerm.allowed}>
        <Pressable style={styles.settingRow} onPress={importFromCSV}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <AppIcon name="file-upload" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Importa prodotti CSV</Text>
              <Text style={styles.settingDescription}>
                Seleziona un CSV; gli SKU già presenti vengono saltati
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {Platform.OS === 'web' && React.createElement('div', {
          role: 'region',
          'aria-label': 'Importa CSV trascinando un file qui',
          onDragOver: (event: any) => event.preventDefault(),
          onDrop: handleCsvDrop,
          style: {
            ...fontStyle(t, '400'),
            fontSize: 13,
            lineHeight: '18px',
            border: `1px dashed ${t.colors.dash}`,
            borderRadius: t.radius.card,
            padding: 18,
            marginBottom: 10,
            color: t.colors.textSecondary,
            background: t.colors.surface,
            textAlign: 'center',
          },
          children: 'Trascina qui un file CSV per importare prodotti. Per esportare usa “Esporta Inventario”.',
        })}
        </Dimmed>

        {/* ACC1 (AR12): col login spento la voce resta, attenuata e senza effetto, con il motivo */}
        <Pressable
          style={[styles.settingRow, !LOGIN_ENABLED && styles.settingRowOff]}
          onPress={() => { if (LOGIN_ENABLED && !cloudBackupBusy) void backupToDrive(); }}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
              <AppIcon name="cloud-upload" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{cloudBackupBusy ? 'Backup in corso…' : 'Backup Google Drive'}</Text>
              <Text style={styles.settingDescription}>
                {LOGIN_ENABLED ? 'Copia privata di CSV, fogli, foto e allegati' : 'Spento: serve l’accesso con Google, che oggi non c’è'}
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {LOGIN_ENABLED && <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('Esci dall’account?', user?.email || 'Google', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Esci', style: 'destructive', onPress: () => void signOut() },
          ])}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#52525B' }]}>
              <AppIcon name="account-circle" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{user?.email || 'Account Google'}</Text>
              <Text style={styles.settingDescription}>Esci da questo profilo</Text>
            </View>
          </View>
          <AppIcon name="logout" size={22} color={t.colors.textSecondary} />
        </Pressable>}

        {/* PERSONE E TELEFONI (ACC1, ticket 32): due voci, lo stato nel sottotitolo (AR09, AR13) */}
        <Text style={styles.sectionTitle}>Persone e telefoni</Text>

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/access')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <AppIcon name="badge" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Accesso</Text>
              <Text style={styles.settingDescription}>
                {profileSubtitle(profile)}
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* RETE0: indirizzo nuovo `settings/network` (`settings/team` resta come indirizzo vecchio) */}
        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/network')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <AppIcon name="wifi" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Rete del negozio</Text>
              <Text style={styles.settingDescription}>
                {networkState}
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* INFO */}
        <Text style={styles.sectionTitle}>Info</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Syncro Flow</Text>
          <Text style={styles.infoVersion}>Versione 1.0.0</Text>
          <Text style={styles.infoDescription}>
            Sistema di gestione inventario professionale per pellicce di lusso
          </Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>{LOGIN_ENABLED ? 'Spazio di lavoro sicuro' : 'Dove stanno i dati'}</Text>
          <Text style={styles.infoText}>
            {LOGIN_ENABLED
              ? 'Prodotti e impostazioni inventario sono separati per organizzazione. La cache locale permette di continuare offline; la sincronizzazione avviene con Supabase.'
              : 'Prodotti e impostazioni restano su questo telefono (o in questo browser). La copia nel cloud arriverà con gli account.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: t.title.size,
    fontWeight: t.title.weight,
    letterSpacing: t.title.tracking,
    color: t.colors.textPrimary,
  },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginTop: 24,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  settingRow: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...t.typography.cardTitle,
    fontSize: 15,
    fontWeight: t.weights.strong,
    marginBottom: 2,
  },
  settingDescription: {
    ...t.typography.caption,
    fontSize: 12,
  },
  infoCard: {
    ...cardSurface(t),
    padding: 20,
    marginBottom: 16,
  },
  infoTitle: {
    ...t.typography.cardTitle,
    fontSize: 20,
    fontWeight: t.title.weight,
    letterSpacing: t.title.tracking,
    marginBottom: 4,
  },
  infoVersion: {
    ...t.typography.caption,
    fontSize: 13,
    marginBottom: 12,
  },
  infoDescription: {
    ...t.typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  infoDivider: {
    height: 1,
    backgroundColor: t.colors.borderLight,
    marginVertical: 16,
  },
  infoLabel: {
    ...t.typography.sectionHeader,
    fontSize: 12,
    marginBottom: 8,
  },
  infoText: {
    ...t.typography.caption,
    fontSize: 13,
    lineHeight: 18,
  },
  settingRowOff: { opacity: 0.55 },
}));
