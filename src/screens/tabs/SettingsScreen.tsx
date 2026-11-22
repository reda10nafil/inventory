// FurInventory Pro - Settings Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, Platform, Linking, Share } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import * as FileSystem from '../../lib/fileSystem';
import * as Sharing from '../../lib/sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useInventory } from '../../../contexts/InventoryContext';
import { Product } from '../../../types';
import { parseCsv, stringifyCsv } from '../../../utils/csv';
import { LOGIN_ENABLED, useAuth } from '../../../contexts/AuthContext';
import { createGoogleSheetBackup, ensureOrganizationDriveFolder, uploadDriveFile } from '../../../backend-auth/google/driveApi';
import { supabase } from '../../../backend-auth/supabase/client';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text, TextInput, fontStyle } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';

export default function SettingsScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, addProduct, getProductBySku } = useInventory();
  const { session, organizationId, organizations, user, signOut, switchOrganization } = useAuth();
  const [cloudBackupBusy, setCloudBackupBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const activeOrganization = organizations.find((organization) => organization.id === organizationId);

  const createOperatorInvite = async () => {
    if (!organizationId || !inviteEmail.trim()) {
      Alert.alert('Email mancante', 'Inserisci l’email Google dell’operatore.');
      return;
    }
    setInviteBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('create_organization_invitation', {
        target_organization_id: organizationId, invitee_email: inviteEmail.trim(),
      });
      if (error) throw error;
      setInviteToken(data);
      const message = `Sei stato invitato come operatore. Accedi con ${inviteEmail.trim()} e inserisci questo codice in Impostazioni → Team e accesso: ${data}. Il codice scade tra 7 giorni.`;
      if (Platform.OS === 'web') Alert.alert('Invito creato', message);
      else await Share.share({ title: 'Invito Syncro Flow', message });
    } catch (error) {
      Alert.alert('Invito non riuscito', error instanceof Error ? error.message : 'Impossibile creare l’invito.');
    } finally {
      setInviteBusy(false);
    }
  };

  const acceptOperatorInvite = async () => {
    const token = inviteToken.trim();
    if (!token) {
      Alert.alert('Codice mancante', 'Incolla il codice di invito ricevuto.');
      return;
    }
    setInviteBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc('accept_organization_invitation', { invitation_token: token });
      if (error) throw error;
      await switchOrganization(data);
      setInviteToken('');
      Alert.alert('Team collegato', 'Ora stai usando l’inventario condiviso del team.');
    } catch (error) {
      Alert.alert('Invito non valido', error instanceof Error ? error.message : 'Controlla codice e account Google.');
    } finally {
      setInviteBusy(false);
    }
  };

  const showComingSoon = (feature: string) => {
    Alert.alert('Prossimamente', `${feature} sarà disponibile nella prossima versione`);
  };

  const exportToCSV = async () => {
    try {
      const csvContent = stringifyCsv([
        ['SKU', 'Tipo Pelle', 'Posizione', 'Status', 'Prezzo Acquisto', 'Prezzo Vendita', 'Lunghezza', 'Larghezza', 'Peso', 'Note', 'Data Produzione', 'Immagini URL', 'Dati Personalizzati JSON', 'GS1 Digital Link', 'Link allegati Drive JSON'],
        ...products.map((product) => [
          product.sku,
          product.furType,
          product.location,
          product.status,
          product.purchasePrice,
          product.sellPrice,
          product.length,
          product.width,
          product.weight,
          product.technicalNotes,
          product.productionDate,
          JSON.stringify(product.backupImageLinks?.length ? product.backupImageLinks : (product.images || []).filter((uri) => /^https?:\/\//i.test(uri))),
          JSON.stringify(product.customData || []),
          product.gs1DigitalLink,
          JSON.stringify(product.backupCustomDataLinks || {}),
        ]),
      ]);

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventario_${Date.now()}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      const fileUri = FileSystem.documentDirectory + `inventario_${Date.now()}.csv`;
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

  const backupToDrive = async () => {
    const accessToken = (session as any)?.provider_token as string | undefined;
    if (!accessToken || !organizationId) {
      Alert.alert('Google Drive non collegato', 'Accedi di nuovo con Google dopo la configurazione OAuth per autorizzare Drive.');
      return;
    }
    setCloudBackupBusy(true);
    try {
      const values = [
        ['SKU', 'Tipo Pelle', 'Posizione', 'Status', 'Prezzo Acquisto', 'Prezzo Vendita', 'Lunghezza', 'Larghezza', 'Peso', 'Note', 'Data Produzione', 'Immagini URL', 'Dati Personalizzati JSON', 'GS1 Digital Link', 'Link allegati Drive JSON'],
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

    const normalize = (value: string) => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase();
    const headers = rows[0].map(normalize);
    const column = (...names: string[]) => headers.findIndex((header) => names.includes(header));
    const skuIndex = column('sku', 'codice sku');
    if (skuIndex < 0) throw new Error('Manca la colonna SKU. Esporta prima un CSV dall’app per vedere il formato supportato.');

    const valueAt = (row: string[], index: number) => index < 0 ? '' : (row[index] || '').trim();
    const numberAt = (row: string[], index: number) => {
      const raw = valueAt(row, index).replace(',', '.');
      if (!raw) return undefined;
      const value = Number(raw);
      return Number.isFinite(value) ? value : undefined;
    };
    const jsonAt = <T,>(row: string[], index: number, fallback: T): T => {
      if (index < 0 || !valueAt(row, index)) return fallback;
      try { return JSON.parse(valueAt(row, index)) as T; } catch { return fallback; }
    };

    const furTypeIndex = column('tipo pelle', 'tipo pelliccia', 'fur type');
    const locationIndex = column('posizione', 'location');
    const statusIndex = column('status', 'stato');
    const notesIndex = column('note', 'note tecniche', 'technical notes');
    const imagesIndex = column('immagini url', 'immagini', 'foto url', 'images');
    const customDataIndex = column('dati personalizzati json', 'custom data json');
    const productionDateIndex = column('data produzione', 'production date');
    const gs1Index = column('gs1 digital link', 'gs1');
    const backupAttachmentsIndex = column('link allegati drive json', 'drive attachments json');

    let imported = 0;
    let skipped = 0;
    const seenSkus = new Set(products.map((product) => product.sku.trim().toLocaleLowerCase()));
    rows.slice(1).forEach((row) => {
      const sku = valueAt(row, skuIndex);
      const normalizedSku = sku.toLocaleLowerCase();
      if (!sku || seenSkus.has(normalizedSku) || getProductBySku(sku)) {
        skipped += 1;
        return;
      }
      seenSkus.add(normalizedSku);

      const rawStatus = valueAt(row, statusIndex).toLocaleLowerCase();
      const status: Product['status'] = rawStatus === 'sold' || rawStatus === 'venduto'
        ? 'sold'
        : rawStatus === 'archived' || rawStatus === 'archiviato'
          ? 'archived'
          : 'available';
      const rawImages = valueAt(row, imagesIndex);
      const images = jsonAt<string[]>(row, imagesIndex, rawImages ? rawImages.split(';').map((image) => image.trim()).filter(Boolean) : []);
      const backupImageLinks = Array.isArray(images) ? images.filter((image) => /^https?:\/\//i.test(image)) : [];

      addProduct({
        sku,
        furType: valueAt(row, furTypeIndex),
        location: valueAt(row, locationIndex),
        status,
        images: Array.isArray(images) ? images.filter((image) => !/drive\.google\.com/i.test(image)) : [],
        backupImageLinks,
        backupCustomDataLinks: jsonAt(row, backupAttachmentsIndex, {}),
        purchasePrice: numberAt(row, column('prezzo acquisto', 'purchase price')),
        sellPrice: numberAt(row, column('prezzo vendita', 'sell price')),
        length: numberAt(row, column('lunghezza', 'length')),
        width: numberAt(row, column('larghezza', 'width')),
        weight: numberAt(row, column('peso', 'weight')),
        technicalNotes: valueAt(row, notesIndex),
        productionDate: valueAt(row, productionDateIndex) || undefined,
        customData: jsonAt(row, customDataIndex, []),
        gs1DigitalLink: valueAt(row, gs1Index) || undefined,
        isFragile: false,
      });
      imported += 1;
    });

    return { imported, skipped };
  };

  const importFromCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const outcome = importCsvContent(content);
      Alert.alert('Importazione completata', `${outcome.imported} prodotti importati. ${outcome.skipped} saltati (SKU vuoto o già presente).`);
    } catch (error) {
      Alert.alert('Importazione non riuscita', error instanceof Error ? error.message : 'Il file CSV non è valido.');
    }
  };

  const handleCsvDrop = async (event: any) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file || !/\.csv$/i.test(file.name || '')) {
      Alert.alert('Formato non supportato', 'Trascina un file .csv.');
      return;
    }
    try {
      const outcome = importCsvContent(await file.text());
      Alert.alert('Importazione completata', `${outcome.imported} prodotti importati. ${outcome.skipped} saltati (SKU vuoto o già presente).`);
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

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/gs1-config')}
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
          onPress={() => router.push('/settings/hardware')}
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

        {/* GESTIONE INVENTARIO */}
        <Text style={styles.sectionTitle}>Gestione inventario</Text>

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/folders')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
              <AppIcon name="folder" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Gestisci Cartelle</Text>
              <Text style={styles.settingDescription}>
                Crea e organizza librerie personalizzate
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/fields')}
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
          onPress={() => router.push('/settings/layout-builder')}
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

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/trash')}
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
          onPress={() => router.push('/settings/locations')}
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


        {/* CONDIVISIONE */}
        <Text style={styles.sectionTitle}>Condivisione</Text>

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/share')}
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
        <Text style={styles.sectionTitle}>Team e spazi di lavoro</Text>
        <View style={styles.teamPanel}>
          <Text style={styles.settingTitle}>Organizzazione attiva</Text>
          <Text style={styles.settingDescription}>{activeOrganization?.name || 'Workspace'}</Text>
          {organizations.map((organization) => (
            <Pressable
              key={organization.id}
              style={[styles.workspaceChoice, organization.id === organizationId && styles.workspaceChoiceActive]}
              onPress={() => void switchOrganization(organization.id).catch((error) => Alert.alert('Cambio workspace non riuscito', error.message))}
            >
              <Text style={styles.settingTitle}>{organization.name}</Text>
              <Text style={styles.settingDescription}>{organization.role}{organization.id === organizationId ? ' · attiva' : ''}</Text>
            </Pressable>
          ))}
          {LOGIN_ENABLED ? <>
          {(activeOrganization?.role === 'owner' || activeOrganization?.role === 'admin') && <>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Email Google dell’operatore"
              placeholderTextColor={t.colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.teamInput}
            />
            <Pressable disabled={inviteBusy} style={styles.teamButton} onPress={() => void createOperatorInvite()}>
              <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
              <Text style={styles.teamButtonText}>{inviteBusy ? 'Attendi…' : 'Crea e condividi invito'}</Text>
            </Pressable>
          </>}
          <TextInput
            value={inviteToken}
            onChangeText={setInviteToken}
            placeholder="Codice invito ricevuto"
            placeholderTextColor={t.colors.placeholder}
            autoCapitalize="none"
            style={styles.teamInput}
          />
          <Pressable disabled={inviteBusy} style={styles.teamButton} onPress={() => void acceptOperatorInvite()}>
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <Text style={styles.teamButtonText}>{inviteBusy ? 'Attendi…' : 'Unisciti a un team'}</Text>
          </Pressable>
          <Text style={styles.settingDescription}>Gli inviti sono legati all’email indicata e scadono dopo 7 giorni.</Text>
          </> : (
            <Text style={styles.settingDescription}>Accesso con Google disattivato: i dati restano su questo dispositivo. Team e inviti tornano disponibili quando l’accesso verrà riattivato.</Text>
          )}
        </View>

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

        <Pressable
          style={styles.settingRow}
          onPress={() => void backupToDrive()}
          disabled={cloudBackupBusy}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' }]}>
              <AppIcon name="cloud-upload" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{cloudBackupBusy ? 'Backup in corso…' : 'Backup Google Drive'}</Text>
              <Text style={styles.settingDescription}>
                Copia privata di CSV, fogli, foto e allegati
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

        {/* TEAM E ACCESSO */}
        <Text style={styles.sectionTitle}>Team e accesso</Text>

        <Pressable
          style={styles.settingRow}
          onPress={() => router.push('/settings/team')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
              <AppIcon name="people" size={24} color={t.colors.onData} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Accesso Multi-Utente</Text>
              <Text style={styles.settingDescription}>
                Mesh LAN • QR Host/Client • Sync 100%
              </Text>
            </View>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>

        {/* INFO */}
        <Text style={styles.sectionTitle}>Info</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>FurInventory Pro</Text>
          <Text style={styles.infoVersion}>Versione 1.0.0</Text>
          <Text style={styles.infoDescription}>
            Sistema di gestione inventario professionale per pellicce di lusso
          </Text>
          <View style={styles.infoDivider} />
          <Text style={styles.infoLabel}>Spazio di lavoro sicuro</Text>
          <Text style={styles.infoText}>
            Prodotti e impostazioni inventario sono separati per organizzazione. La cache locale permette di continuare offline; la sincronizzazione avviene con Supabase.
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
  teamPanel: {
    ...cardSurface(t),
    padding: 16,
    marginBottom: 12,
  },
  workspaceChoice: {
    ...tileSurface(t),
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  workspaceChoiceActive: { backgroundColor: t.colors.tileSelected, borderColor: t.colors.tileSelectedBorder },
  teamInput: {
    minHeight: t.input.height,
    color: t.colors.inputText,
    backgroundColor: t.colors.input,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 12,
  },
  teamButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
  },
  teamButtonText: { ...t.typography.buttonPrimary, fontSize: 15, color: t.colors.onButton },
}));
