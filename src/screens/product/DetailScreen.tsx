// FurInventory Pro - Product Detail Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, useWindowDimensions, Share, Modal, StatusBar, Linking } from 'react-native';
import * as Print from '../../lib/print';
import * as FileSystem from '../../lib/fileSystem';
import * as ImageManipulator from '../../lib/imageManipulator';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import { ProductNotFound } from '../../components/ProductNotFound';
import * as Clipboard from '../../lib/clipboard';
import * as Sharing from '../../lib/sharing';
import { Image } from '../../lib/ExpoImage';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import { useProductKind } from '../../../hooks/useProductKind';
import { useContacts } from '../../../contexts/ContactsContext';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { orderByLayout } from '../../../utils/layoutOrder';
import { useFieldOptions } from '../../../hooks/useFieldOptions';
import { choiceLabel, liveField, optionOf, valueText } from '../../../utils/fieldValues';
import { OptionMark, hasMark } from '../../../components/OptionMark';
import { CodeSheet } from '../../../components/CodeSheet'; // ETI: finestra «Codice ed etichetta»
import { pdfFieldOrder, pdfFieldRows, productPdfHtml } from '../../../utils/productPdf'; // ETI: PDF con codici locali
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { Glass } from '../../../components/ui/Glass';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { formatPrice } from '../../../utils/price';
import { PhotoGallery } from '../../../components/PhotoGallery';
import { formatNumber } from '../../../utils/number';
import { describeStockEvent, formatQty, isLowStock, isOutOfStock, isStocked, round3, stockGroups, storedStock, totalStock } from '../../../utils/stock';
import { MovementSheet } from '../../../components/MovementSheet';
import { canMoveStock as canMoveStockRule } from '../../../utils/productRules';
import { useShelves } from '../../../contexts/ShelvesContext';
import { usePlaceLabel } from '../../../hooks/usePlaceLabel';
import { UNKNOWN_SHELF } from '../../../utils/shelves';
import { ShelfSpace } from '../../../components/ShelfSpace';
import { Dimmed, PermissionNote } from '../../../components/PermissionNote';
import { usePermission } from '../../../contexts/ProfileContext';

export default function ProductDetailScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // ACC1 (ticket 32): «Modifica» e «Movimenta» spenti col motivo per un ruolo che non modifica (blocco a sé)
  const editPerm = usePermission('modificare');
  const { id } = useLocalSearchParams();
  const { getProductById, getTimelineForProduct } = useInventory();
  const { locations } = useLocations();
  const kindOf = useProductKind();
  const { labelOf: contactLabel } = useContacts();
  const { shelfOf, shelves } = useShelves();
  // S1b: «Magazzino › A1» per le chiavi della giacenza con lo scaffale (movimenti, Cronologia dettagliata)
  const placeLabel = usePlaceLabel();
  const { customFields, allFieldsIncludingDeleted } = useCustomFields();
  // VAL: le etichette delle opzioni dal registro (rinominate, il prodotto segue), nome e icona dalla copia (EDC)
  const optionsOf = useFieldOptions();

  const { layout } = useLayout();

  const product = getProductById(id as string);
  const timeline = getTimelineForProduct(id as string);

  // D17: tutti gli hook prima del ritorno anticipato «Prodotto non trovato» (regole degli hook)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Visore a tutto schermo (GAL): le foto del prodotto (stesso indice della galleria in alto, così chiudendo la
  // Scheda resta sulla foto vista per ultima) o quelle di un campo «immagini» (`field`, indice suo)
  const [viewer, setViewer] = useState<{ images: string[]; field?: string } | null>(null);
  const [fieldImageIndex, setFieldImageIndex] = useState(0);
  const focused = useIsFocused(); // ←/→ solo con la Scheda in primo piano (sotto Modifica resta montata)
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false); // ETI: finestra «Codice ed etichetta»
  const [showMovement, setShowMovement] = useState(false);

  // IND-P6 (ticket 28): con «Torna all'inventario», non più una pagina senza uscita
  if (!product) return <ProductNotFound />;

  const heroWidth = Math.max(1, screenWidth);
  // Visore: con le foto del prodotto si muove insieme alla galleria in alto; con quelle di un campo ha il suo indice
  const viewerIndex = viewer?.field ? fieldImageIndex : currentImageIndex;
  const setViewerIndex = viewer?.field ? setFieldImageIndex : setCurrentImageIndex;
  const closeViewer = () => setViewer(null);
  // Riquadro a metà dei campi strutturati: due per riga con 10 px in mezzo (come la tela), anche se resta da solo
  const halfTileWidth = (screenWidth - t.spacing.screenPadding * 2 - 10) / 2;

  const location = locations.find((l) => l.id === product.location);
  // Scaffale (S1a): nella scheda della posizione, sotto il nome; solo per un pezzo unico che ci sta davvero
  const shelf = shelfOf(product);
  // C1: categoria (la cartella, col nome completo) e tipo di pelle, ognuno solo se c'è
  const kind = kindOf(product);
  /** «Categoria · Tipo - testo», senza separatori in più quando mancano. */
  const withKind = (text: string) => [kind.full, text].filter(Boolean).join(' - ');
  // Articolo a quantità (M03): giacenza per posizione, dalla più grande; il nome della posizione o, se non c'è più, l'id.
  // S1b: una posizione con giacenza sugli scaffali ha sotto una riga per scaffale col nome e «Senza scaffale».
  const stocked = isStocked(product);
  // Nel cestino si mostra la giacenza salvata (torna col ripristino), così non sembra vuoto (M04)
  const stockRows = stockGroups(storedStock(product));
  const stockTotal = round3(stockRows.reduce((sum, row) => sum + row.qty, 0));
  const shelfName = (shelfId: string, place: string) => shelves.find((s) => s.id === shelfId && s.locationId === place)?.name ?? UNKNOWN_SHELF;
  // Sotto la scorta minima (M06): stessa regola dell'avviso «Attenzione»
  const lowStock = isLowStock(product);
  // «Movimenta» (M04): prodotti disponibili e non nel cestino; un pezzo unico diventa articolo a quantità
  const canMoveStock = canMoveStockRule(product);
  // Testo di un movimento per i testi condivisi e il PDF: senza il nome del fornitore o cliente, che resta nell'app
  const stockEventText = (details: Parameters<typeof describeStockEvent>[0]) => describeStockEvent(details, placeLabel, product.unit);
  // A schermo (Cronologia dettagliata) con il contatto (M10): «· Fornitore Rossi»
  const stockEventOnScreen = (details: Parameters<typeof describeStockEvent>[0]) => describeStockEvent(details, placeLabel, product.unit, contactLabel);

  const generateClientText = () => {
    let text = `✨ ${withKind(product.sku)}\n\n`;

    if (product.length || product.width || product.weight) {
      text += '📐 MISURE:\n';
      if (product.length) text += `   Lunghezza: ${formatNumber(product.length)} cm\n`;
      if (product.width) text += `   Larghezza: ${formatNumber(product.width)} cm\n`;
      if (product.weight) text += `   Peso: ${formatNumber(product.weight)} kg\n`;
      text += '\n';
    }

    if (product.sellPrice) {
      text += `💰 PREZZO: ${formatPrice(product.sellPrice)}\n\n`;
    }

    if (product.technicalNotes) {
      text += `📝 ${product.technicalNotes}\n\n`;
    }

    text += `📍 Disponibile presso: ${location?.label || product.location}`;

    return text;
  };

  const generateProfessionalText = () => {
    let text = `╔════════════════════════════════════════╗\n`;
    text += `║        SCHEDA TECNICA PRODOTTO        ║\n`;
    text += `╚════════════════════════════════════════╝\n\n`;

    text += `SKU: ${product.sku}\n`;
    if (kind.path) text += `CATEGORIA: ${kind.path}\n`;
    if (kind.furType) text += `TIPO DI PELLE: ${kind.furType}\n`;
    text += `STATO: ${product.status === 'available' ? 'Disponibile' : 'Venduto'}\n`;
    text += `POSIZIONE: ${location?.label || product.location}\n`;
    if (stocked) text += `GIACENZA: ${formatQty(totalStock(product), product.unit)}\n`;
    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📐 MISURE DETTAGLIATE:\n`;
    text += `   • Lunghezza: ${product.length != null ? formatNumber(product.length) : 'N/D'} cm\n`;
    text += `   • Larghezza: ${product.width != null ? formatNumber(product.width) : 'N/D'} cm\n`;
    text += `   • Peso: ${product.weight != null ? formatNumber(product.weight) : 'N/D'} kg\n`;
    text += `\n`;

    text += `💰 ANALISI PREZZI:\n`;
    text += `   • Prezzo Acquisto: ${product.purchasePrice != null ? formatPrice(product.purchasePrice) : 'N/D'}\n`;
    text += `   • Prezzo Vendita: ${product.sellPrice != null ? formatPrice(product.sellPrice) : 'N/D'}\n`;
    if (product.purchasePrice && product.sellPrice) {
      const margin = product.sellPrice - product.purchasePrice;
      const marginPercent = ((margin / product.purchasePrice) * 100).toFixed(1);
      text += `   • Margine: ${formatPrice(margin)} (+${marginPercent}%)\n`;
    }
    text += `\n`;

    text += `📅 DATE IMPORTANTI:\n`;
    text += `   • Data Produzione: ${product.productionDate || 'N/D'}\n`;
    text += `   • Data Creazione: ${new Date(product.createdAt).toLocaleDateString('it-IT')}\n`;
    text += `   • Ultimo Aggiornamento: ${new Date(product.updatedAt).toLocaleDateString('it-IT')}\n`;
    if (product.lastScannedAt) {
      text += `   • Ultima Scansione: ${new Date(product.lastScannedAt).toLocaleDateString('it-IT')}\n`;
    }
    if (product.soldAt) {
      text += `   • Data Vendita: ${new Date(product.soldAt).toLocaleDateString('it-IT')}\n`;
    }
    text += `\n`;

    text += `📝 NOTE TECNICHE:\n`;
    text += `${product.technicalNotes || 'Nessuna nota disponibile'}\n`;
    text += `\n`;

    text += `📊 CRONOLOGIA MOVIMENTI:\n`;
    timeline.slice(0, 5).forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      let eventText = '';
      if (event.type === 'created') eventText = 'Creato';
      else if (event.type === 'moved') eventText = `${event.details.from} → ${event.details.to}`;
      else if (event.type === 'sold') eventText = 'Venduto';
      else if (event.type === 'modified') eventText = 'Modificato';
      else if (event.type === 'stock') eventText = stockEventText(event.details);
      text += `   • ${date}: ${eventText}\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `Documento generato: ${new Date().toLocaleString('it-IT')}\n`;

    return text;
  };


  const handleShare = async () => {
    Alert.alert(
      'Condividi Prodotto',
      'Scegli il tipo di condivisione:',
      [
        {
          text: 'Cliente',
          onPress: async () => {
            try {
              const text = generateClientText();
              const shareOptions: any = {
                message: text,
                title: [product.sku, kind.full].filter(Boolean).join(' - '),
              };

              // Add first image if available
              if (product.images && product.images.length > 0) {
                shareOptions.url = product.images[0];
              }

              await Share.share(shareOptions);
            } catch (error) {
              console.error('Errore condivisione cliente:', error);
            }
          },
        },
        {
          text: 'Professionista',
          onPress: async () => {
            try {
              const text = generateProfessionalText();
              const shareOptions: any = {
                message: text,
                title: `Scheda Tecnica - ${product.sku}`,
              };

              // Add first image if available
              if (product.images && product.images.length > 0) {
                shareOptions.url = product.images[0];
              }

              await Share.share(shareOptions);
            } catch (error) {
              console.error('Errore condivisione professionista:', error);
            }
          },
        },
        { text: 'Annulla', style: 'cancel' },
      ]
    );
  };

  // ETI (ticket 22, D16, D07, NG21): la scheda PDF da `utils/productPdf` (codici fatti in locale, campi personalizzati
  // nell'ordine del modulo, titolo «Syncro Flow»). L'etichetta sta nella finestra «Codice ed etichetta» (`CodeSheet`).
  // Sul web la finestra della stampa si apre subito, nel tocco (dopo le foto il browser la bloccherebbe), e si stampa
  // quella, mai la pagina dell'app; sul telefono un PDF da condividere, come prima.
  const handlePrintPDF = async () => {
    const win = Print.openPrintWindow();
    try {
      // Foto in base64, ridotte (come prima)
      const imagesBase64: string[] = [];
      for (const uri of product.images ?? []) {
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 600 } }],
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
          );
          imagesBase64.push(await FileSystem.readAsStringAsync(manipulatedImage.uri, { encoding: 'base64' }));
        } catch (error) {
          console.warn('Foto non messa nel PDF:', error);
        }
      }

      const eventText = (event: typeof timeline[number]) => {
        if (event.type === 'created') return 'Creato';
        if (event.type === 'moved') return `Spostato: ${event.details.from} → ${event.details.to}`;
        if (event.type === 'sold') return 'Venduto';
        if (event.type === 'modified') return event.details.changes?.[0] || 'Modificato';
        if (event.type === 'scanned') return 'Scansionato';
        if (event.type === 'photo_added') return `${event.details.photoCount} foto aggiunte`;
        if (event.type === 'stock') return stockEventText(event.details);
        return '';
      };
      const dateText = (timestamp: string | number) => new Date(timestamp).toLocaleDateString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });

      // Campi personalizzati: lo stesso testo della Scheda, nell'ordine del modulo (`pdfFieldOrder`, un punto solo)
      const fields = pdfFieldRows(product.customData, pdfFieldOrder(layout, product), (item) => {
        const snapshot = item.fieldSnapshot;
        // Unione 2: come la Scheda (EDC), nome, tipo e opzioni dal registro con `liveField`; la copia salvata col
        // prodotto solo se il campo non c'è più, e per riconoscere le etichette di prima
        const field = liveField(snapshot, allFieldsIncludingDeleted);
        return { name: field.name, value: valueText(field, item.value, { options: optionsOf(field), snapshot }) };
      });

      const html = productPdfHtml({
        sku: product.sku,
        category: kind.path || undefined,
        furType: kind.furType || undefined,
        sold: product.status === 'sold',
        location: location?.label || product.location,
        locationColor: location?.color,
        purchasePrice: product.purchasePrice ? formatPrice(product.purchasePrice) : undefined,
        sellPrice: product.sellPrice ? formatPrice(product.sellPrice) : undefined,
        measures: [
          ...(product.length ? [{ name: 'Lunghezza', value: `${formatNumber(product.length)} cm` }] : []),
          ...(product.width ? [{ name: 'Larghezza', value: `${formatNumber(product.width)} cm` }] : []),
          ...(product.weight ? [{ name: 'Peso', value: `${formatNumber(product.weight)} kg` }] : []),
        ],
        notes: product.technicalNotes,
        fields,
        images: imagesBase64,
        timeline: timeline.slice(0, 10).map((event) => ({ text: eventText(event), date: dateText(event.timestamp) })),
        generatedAt: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });

      if (!(await Print.savePdf(html, `Scheda Prodotto - ${product.sku}`, win))) {
        Alert.alert('Stampa scheda PDF', 'Il browser ha bloccato la finestra della stampa: consenti le finestre di questo sito e riprova.');
      }
    } catch (error) {
      win?.close();
      console.error('Error generating PDF:', error);
      Alert.alert('Errore', 'Impossibile generare il PDF. Riprova.');
    }
  };

  const handleCopyGS1Link = async () => {
    if (product.gs1DigitalLink) {
      await Clipboard.setStringAsync(product.gs1DigitalLink);
      Alert.alert('Copiato', 'Link GS1 copiato negli appunti');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Galleria (GAL): miniature, frecce, puntini e ←/→; il tocco sulla foto apre il visore */}
        <PhotoGallery
          variant="scheda"
          images={product.images}
          index={currentImageIndex}
          onIndexChange={setCurrentImageIndex}
          width={heroWidth}
          height={320}
          onOpen={(index) => { setCurrentImageIndex(index); setViewer({ images: product.images }); }}
          keyboard={focused && !viewer && !showQRModal && !showMovement} // non sotto le finestre aperte sopra la Scheda
          thumbnails
        />

        {/* Status Badge */}
        {product.status === 'sold' && (
          <View style={styles.soldBadge}>
            <AppIcon name="sell" size={16} color={t.colors.soldBadgeText} />
            <Text style={styles.soldText}>Venduto</Text>
          </View>
        )}
        {isOutOfStock(product) && (
          <View style={styles.soldBadge}>
            <AppIcon name="inventory" size={16} color={t.colors.soldBadgeText} />
            <Text style={styles.soldText}>Esaurito</Text>
          </View>
        )}

        {/* Product Info */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Text style={styles.sku}>{product.sku}</Text>
              {!!kind.path && <Text style={styles.furType}>{kind.path}</Text>}
              {!!kind.furType && <Text style={styles.kindDetail}>Tipo di pelle: {kind.furType}</Text>}
            </View>
            <Pressable style={styles.shareButton} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Condividi">
              <AppIcon name="share" size={20} color={t.colors.accentInk} />
            </Pressable>
          </View>

          {/* Location Card: il colore della posizione è un dato */}
          <View style={[styles.locationCard, location?.color ? { borderColor: location.color } : null]}>
            <View
              style={[
                styles.locationIconWrap,
                { backgroundColor: location?.color ? withAlpha(location.color, 0.16) : t.colors.accentSoft },
              ]}
            >
              <AppIcon name="location-on" size={20} color={location?.color || t.colors.accentInk} />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>{stocked ? 'Posizione principale' : 'Posizione attuale'}</Text>
              <Text style={styles.locationValue}>{location?.label || product.location}</Text>
              {shelf && <Text style={styles.locationShelf}>Scaffale {shelf.name}</Text>}
            </View>
          </View>

          {/* Giacenza (M03): totale e quantità per posizione; «Movimenta» per carico, scarico, trasferimento, rettifica (M04) */}
          {(stocked || canMoveStock) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Giacenza</Text>
              <View style={styles.stockCard}>
                {stocked ? (
                  <>
                    <View style={styles.stockRow}>
                      <Text style={styles.stockTotalLabel}>{product.deletedAt ? 'Totale salvato (nel cestino)' : 'Totale'}</Text>
                      <Text style={styles.stockTotal}>{formatQty(stockTotal, product.unit)}</Text>
                    </View>
                    {stockRows.length === 0 ? (
                      <Text style={styles.stockPlace}>Esaurito: nessuna posizione con giacenza</Text>
                    ) : stockRows.map((row) => (
                      <React.Fragment key={row.place}>
                        <View style={styles.stockRow}>
                          <Text style={styles.stockPlace} numberOfLines={1}>{placeLabel(row.place)}</Text>
                          <Text style={styles.stockQty}>{formatQty(row.qty, product.unit)}</Text>
                        </View>
                        {row.keys.some((k) => k.shelfId) && row.keys.map((k) => (
                          <View key={k.key} style={[styles.stockRow, styles.stockShelfRow]}>
                            <Text style={styles.stockShelf} numberOfLines={1}>{k.shelfId ? `Scaffale ${shelfName(k.shelfId, row.place)}` : 'Senza scaffale'}</Text>
                            <Text style={styles.stockShelfQty}>{formatQty(k.qty, product.unit)}</Text>
                          </View>
                        ))}
                      </React.Fragment>
                    ))}
                    {/* Scorta minima (M06): sotto, il prodotto ha l'avviso «Attenzione» */}
                    {product.minStock != null && product.minStock > 0 && (
                      <View style={[styles.stockRow, styles.minStockRow]}>
                        <Text style={[styles.stockPlace, lowStock && styles.lowStockText]} numberOfLines={1}>
                          {lowStock ? 'Sotto la scorta minima' : 'Scorta minima'}
                        </Text>
                        <Text style={[styles.stockQty, lowStock && styles.lowStockText]}>{formatQty(product.minStock, product.unit)}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.stockRow}>
                    <Text style={styles.stockPlace}>Pezzo unico</Text>
                    <Text style={styles.stockQty}>1 pz</Text>
                  </View>
                )}
                {canMoveStock && (
                  <Dimmed off={!editPerm.allowed}>
                  <Pressable style={styles.moveStockButton} onPress={() => { if (editPerm.allowed) setShowMovement(true); }} accessibilityLabel="Movimenta">
                    <AppIcon name="swap-vert" size={18} color={t.colors.onButtonSecondary} />
                    <Text style={styles.moveStockText}>Movimenta</Text>
                  </Pressable>
                  </Dimmed>
                )}
              </View>
              {!stocked && canMoveStock && (
                <Text style={styles.stockHint}>Con un carico o un altro movimento diventa un articolo a quantità.</Text>
              )}
            </View>
          )}

          {/* S2 (ticket 14 e 15): riempimento dello scaffale del prodotto e quanti ne entrano ancora come questo */}
          <ShelfSpace product={product} />

          {/* Prezzi: anche 0 è un prezzo (CSV-I6: con `&&` sul numero restava uno «0» isolato, e a 0 e 0 la sezione spariva) */}
          {(product.purchasePrice != null || product.sellPrice != null) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prezzi</Text>
              <View style={styles.priceRow}>
                {product.purchasePrice != null && (
                  <View style={styles.priceCard}>
                    <Text style={styles.priceLabel}>Acquisto</Text>
                    <Text style={styles.priceValue}>{formatPrice(product.purchasePrice)}</Text>
                  </View>
                )}
                {product.sellPrice != null && (
                  <View style={styles.priceCard}>
                    <Text style={styles.priceLabel}>Vendita</Text>
                    <Text style={[styles.priceValue, { color: t.colors.accentInk }]}>
                      {formatPrice(product.sellPrice)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Measurements */}
          {!!(product.length || product.width || product.weight || product.height) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Misure</Text>
              <View style={styles.measureRow}>
                {!!product.length && (
                  <View style={styles.measureCard}>
                    <AppIcon name="straighten" size={22} color={t.colors.fieldIcon} />
                    <Text style={styles.measureLabel}>Lunghezza</Text>
                    <Text style={styles.measureValue}>{formatNumber(product.length)} cm</Text>
                  </View>
                )}
                {!!product.width && (
                  <View style={styles.measureCard}>
                    <AppIcon name="width-wide" size={22} color={t.colors.fieldIcon} />
                    <Text style={styles.measureLabel}>Larghezza</Text>
                    <Text style={styles.measureValue}>{formatNumber(product.width)} cm</Text>
                  </View>
                )}
                {!!product.weight && (
                  <View style={styles.measureCard}>
                    <AppIcon name="fitness-center" size={22} color={t.colors.fieldIcon} />
                    <Text style={styles.measureLabel}>Peso</Text>
                    <Text style={styles.measureValue}>{formatNumber(product.weight)} kg</Text>
                  </View>
                )}
                {/* S2 (ticket 14): altezza, in fondo alle misure */}
                {!!product.height && (
                  <View style={styles.measureCard}>
                    <AppIcon name="height" size={22} color={t.colors.fieldIcon} />
                    <Text style={styles.measureLabel}>Altezza</Text>
                    <Text style={styles.measureValue}>{formatNumber(product.height)} cm</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Note tecniche: vuote non si mostrano (CSV-I7: '' dall'import finiva come testo dentro un View) */}
          {!!product.technicalNotes?.trim() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Note tecniche</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{product.technicalNotes}</Text>
              </View>
            </View>
          )}

          {/* Custom Fields Display Redesign */}
          {product.customData && product.customData.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campi strutturati</Text>

              <View style={styles.customCardsContainer}>
                {orderByLayout(product.customData, layout.fields.map((f) => f.id)).map((dataItem, index) => {
                  const value = dataItem.value;
                  // EDC (CAM-F6, CAM-F7): nome, icona, tipo e opzioni dal registro (anche nel cestino); la copia salvata
                  // col prodotto solo se il campo non c'è più, e per riconoscere le etichette di prima
                  const snapshot = dataItem.fieldSnapshot;
                  const field = liveField(snapshot, allFieldsIncludingDeleted);
                  if (value === undefined || value === null || value === '') return null;
                  const options = optionsOf(field);
                  // Icona: quella del modulo (layout builder, come in Aggiungi), poi quella del campo
                  const layoutIcon = layout.fields.find((f) => f.id === field.id)?.icon;
                  const iconOf = (fallback: string) => layoutIcon || field.icon || fallback;

                  // Text Long -> Spanning full width like a Note
                  if (field.type === 'text_long') {
                    return (
                      <View key={field.id || index} style={styles.customWideCard}>
                        <View style={styles.customNotesHeader}>
                          <AppIcon name={iconOf('notes')} size={17} color={t.colors.fieldIcon} />
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                        </View>
                        <Text style={styles.customNotesText}>{String(value)}</Text>
                      </View>
                    );
                  }

                  // Array / Multi Choice -> Chips
                  if (field.type === 'multi_choice' || (Array.isArray(value) && field.type !== 'images' && field.type !== 'document')) {
                    const displayArray = Array.isArray(value) ? value : [value];
                    return (
                      <View key={field.id || index} style={styles.customWideCard}>
                        <View style={styles.customNotesHeader}>
                          <AppIcon name={iconOf('label')} size={17} color={t.colors.fieldIcon} />
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                        </View>
                        <View style={styles.customTagsRow}>
                          {displayArray.map(val => {
                            // Etichetta di adesso anche per un'etichetta salvata prima di VAL o un'opzione rinominata;
                            // colore e icona dell'opzione (EDC) accanto, se ne ha
                            const label = choiceLabel(val, options, snapshot);
                            const option = optionOf(val, options, snapshot);
                            return (
                              <View key={val} style={[styles.customTag, hasMark(option) && styles.customTagMarked]}>
                                {hasMark(option) && <OptionMark option={option} />}
                                <Text style={styles.customTagText}>{label}</Text>
                              </View>
                            )
                          })}
                        </View>
                      </View>
                    );
                  }

                  // Document -> Pressable Link
                  if (field.type === 'document') {
                    const docs = Array.isArray(value) ? value : [value];
                    return (
                      <View key={field.id || index} style={styles.customWideCard}>
                        <View style={styles.customNotesHeader}>
                          <AppIcon name={iconOf('description')} size={17} color={t.colors.fieldIcon} />
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                        </View>
                        <View style={styles.customDocumentList}>
                          {docs.map((docUri, i) => (
                            <Pressable key={i} style={styles.customDocumentItem} onPress={() => Sharing.shareAsync(docUri).catch(() => Alert.alert('Errore', 'Impossibile aprire il file'))}>
                              <AppIcon name="insert-drive-file" size={20} color={t.colors.accentInk} />
                              <Text style={styles.customDocumentText} numberOfLines={1}>{docUri.split('/').pop() || 'Documento Allegato'}</Text>
                              <AppIcon name="open-in-new" size={18} color={t.colors.fieldIcon} />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  }

                  // Images
                  if (field.type === 'images') {
                    const imgs = Array.isArray(value) ? value : [value];
                    return (
                      <View key={field.id || index} style={styles.customWideCard}>
                        <View style={styles.customNotesHeader}>
                          <AppIcon name={iconOf('image')} size={17} color={t.colors.fieldIcon} />
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                        </View>
                        {/* GAL: si aprono nel visore delle foto, partendo da quella toccata */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customImagesRow}>
                          {imgs.map((imgUri, i) => (
                            <Pressable
                              key={i}
                              style={styles.customNestedImageWrap}
                              onPress={() => { setFieldImageIndex(i); setViewer({ images: imgs, field: field.name }); }}
                              accessibilityRole="button"
                              accessibilityLabel={`Apri la foto ${i + 1} di ${field.name}`}
                            >
                              <Image source={{ uri: imgUri }} style={styles.customNestedImage} contentFit="cover" />
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    );
                  }

                  // Date
                  if (field.type === 'date') {
                    const rawDate = new Date(value);
                    const displayDate = isNaN(rawDate.getTime()) ? value : rawDate.toLocaleDateString('it-IT');
                    return (
                      <View key={field.id || index} style={[styles.customMiniCard, { width: halfTileWidth }]}>
                        <View style={[styles.customIconWrap, { backgroundColor: t.colors.infoSoft }]}>
                          <AppIcon name={iconOf('event')} size={19} color={t.colors.info} />
                        </View>
                        <View style={styles.customCardContent}>
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                          <Text style={styles.customFieldValue}>{displayDate}</Text>
                        </View>
                      </View>
                    );
                  }

                  // Currency
                  if (field.type === 'currency') {
                    return (
                      <View key={field.id || index} style={[styles.customMiniCard, { width: halfTileWidth }]}>
                        <View style={[styles.customIconWrap, { backgroundColor: t.colors.accentSoft }]}>
                          <AppIcon name={iconOf('attach-money')} size={19} color={t.colors.accentInk} />
                        </View>
                        <View style={styles.customCardContent}>
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                          <Text style={[styles.customFieldValue, { color: t.colors.accentInk }]}>
                            {/* «12,50» salvato come testo prima di VAL: «12,50 €», non «NaN,undefined» (CAM-F2) */}
                            {valueText(field, value)}
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  // Default / Single Choice / Number / Text Short / Sì-No: numeri con la virgola, scelta con l'etichetta
                  // di adesso; una scelta con colore o icona (EDC) come pillola
                  const displayValue = valueText(field, value, { options, snapshot });
                  const chosen = field.type === 'single_choice' ? optionOf(value, options, snapshot) : undefined;

                  return (
                    <View key={field.id || index} style={[styles.customMiniCard, { width: halfTileWidth }]}>
                      <View style={styles.customIconWrap}>
                        <AppIcon name={iconOf('info')} size={19} color={t.colors.fieldIcon} />
                      </View>
                      <View style={styles.customCardContent}>
                        <Text style={styles.customFieldLabel}>{field.name}</Text>
                        {hasMark(chosen) ? (
                          <View style={[styles.customTag, styles.customTagMarked, styles.customTagInCard]}>
                            <OptionMark option={chosen} />
                            <Text style={styles.customTagText} numberOfLines={2}>{displayValue}</Text>
                          </View>
                        ) : (
                          <Text style={styles.customFieldValue}>{displayValue}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cronologia dettagliata</Text>
              <View style={styles.timelineList}>
                {(showAllHistory ? timeline : timeline.slice(0, 4)).map((event, index) => {
                  let eventText = '';
                  if (event.type === 'created') eventText = 'Creato';
                  else if (event.type === 'moved') eventText = `Spostato: ${event.details.from} → ${event.details.to}`;
                  else if (event.type === 'sold') eventText = 'Venduto';
                  else if (event.type === 'modified') eventText = event.details.changes?.[0] || 'Modificato';
                  else if (event.type === 'scanned') eventText = 'Scansionato';
                  else if (event.type === 'photo_added') eventText = `${event.details.photoCount} foto aggiunte`;
                  else if (event.type === 'deleted') eventText = 'Spostato nel Cestino';
                  else if (event.type === 'restored') eventText = 'Ripristinato dal Cestino';
                  else if (event.type === 'stock') eventText = stockEventOnScreen(event.details);

                  return (
                    <View key={`${event.id || 'evt'}-${index}`} style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineType}>{eventText}</Text>
                        {event.type === 'modified' && event.details.changes && event.details.changes.length > 1 && (
                          <Text style={styles.timelineChanges}>
                            {event.details.changes.slice(1).join(' • ')}
                          </Text>
                        )}
                        <Text style={styles.timelineDate}>
                          {new Date(event.timestamp).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {timeline.length > 4 && (
                <Pressable
                  onPress={() => setShowAllHistory(!showAllHistory)}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreText}>{showAllHistory ? 'Nascondi' : 'Altro'}</Text>
                  <AppIcon name={showAllHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color={t.colors.accentInk} />
                </Pressable>
              )}
            </View>
          )}

          {/* ETI (ticket 22, UX0 F3): il blocco «Identità digitale GS1» (QR grande, link scritto) diventa una riga. QR,
              etichetta, link e «Programma tag» stanno nella finestra «Codice ed etichetta», per ogni prodotto (P27) */}
          <Pressable style={styles.codeRow} onPress={() => setShowQRModal(true)} accessibilityRole="button" accessibilityLabel="Codice ed etichetta">
            <View style={styles.codeRowIcon}>
              <AppIcon name="qr-code-2" size={20} color={t.colors.accentInk} />
            </View>
            <View style={styles.codeRowText}>
              <Text style={styles.codeRowTitle}>Codice ed etichetta</Text>
              <Text style={styles.codeRowSub} numberOfLines={1}>{product.sku}</Text>
            </View>
            <AppIcon name="chevron-right" size={22} color={t.colors.textMuted} />
          </Pressable>

          {/* Azioni PDF */}
          <Pressable style={[styles.qrButton, styles.pdfButton]} onPress={handlePrintPDF}>
            <AppIcon name="picture-as-pdf" size={20} color={t.colors.onButtonSecondary} />
            <Text style={[styles.qrButtonText, styles.pdfButtonText]}>Stampa scheda PDF</Text>
          </Pressable>
        </View>
        {/* ACC1: la riga del motivo sopra la barra non copre l'ultimo pulsante */}
        {!editPerm.allowed && <View style={{ height: 80 }} />}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <Glass />
        <PermissionNote text={editPerm.reason} floating style={{ left: t.spacing.screenPadding, right: t.spacing.screenPadding }} />
        <Pressable style={styles.actionButtonSecondary} onPress={() => router.back()}>
          <AppIcon name="arrow-back" size={20} color={t.colors.onButtonSecondary} />
          <Text style={styles.actionButtonTextSecondary}>Indietro</Text>
        </Pressable>
        <Dimmed off={!editPerm.allowed} style={{ flex: 1 }}>
        <Pressable
          style={styles.actionButtonPrimary}
          onPress={() => { if (editPerm.allowed) router.push(`/product/edit/${product.id}`); }}
        >
          <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
          <AppIcon name="edit" size={20} color={t.colors.onButton} />
          <Text style={styles.actionButtonTextPrimary}>Modifica</Text>
        </Pressable>
        </Dimmed>
      </View>
      <MovementSheet product={product} visible={showMovement} onClose={() => setShowMovement(false)} />

      {/* ETI: «Codice ed etichetta» del prodotto: il QR porta lo SKU, come l'etichetta e il PDF (NG23); il link GS1
          salvato resta com'è (vincolo 5) e si vede sotto «Avanzate» con «Copia link». N1: «Scrivi tag NFC» scrive lo
          SKU sul tag in un tocco, al posto di «Programma tag» (il link in due passi, NG14) */}
      <CodeSheet
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        kind="prodotto"
        items={[{ code: product.sku, name: kind.full }]}
        onEditSku={() => { setShowQRModal(false); router.push(`/product/edit/${product.id}`); }}
        link={product.gs1DigitalLink || undefined}
        onCopyLink={handleCopyGS1Link}
        tag={{ self: { kind: 'product', id: product.id } }}
      />

      {/* Visore a tutto schermo (GAL, CSV-G3): stessa galleria con frecce, ←/→ ed Esc; X e tasto Indietro del telefono */}
      {viewer && (
        <Modal visible transparent animationType="fade" onRequestClose={closeViewer}>
          <View style={styles.modalContainer}>
            <StatusBar hidden={true} />
            <PhotoGallery
              variant="visore"
              images={viewer.images}
              index={viewerIndex}
              onIndexChange={setViewerIndex}
              width={screenWidth}
              height={screenHeight}
              keyboard
              onEscape={closeViewer}
            />

            {/* Contatore e X dopo la galleria, così stanno sopra */}
            <View style={[styles.modalCounter, { top: insets.top + 20 }]} pointerEvents="none">
              <Text style={styles.modalCounterText}>
                {viewerIndex + 1} / {viewer.images.length}
              </Text>
            </View>
            <Pressable
              style={[styles.closeButton, { top: insets.top + 10 }]}
              onPress={closeViewer}
              accessibilityRole="button"
              accessibilityLabel="Chiudi il visore"
            >
              <AppIcon name="close" size={30} color={t.colors.onData} />
            </Pressable>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// Stili della Scheda (lavoro L6b, tavola «Scheda» della tela): riquadri con `tileSurface` e l'ombra delle card,
// titoli di sezione dal tema, pulsanti sui ruoli principale e secondario, barra fissa con `Glass` (regola 9).
const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  soldBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.colors.soldBadge,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.radius.badge,
  },
  soldText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: t.colors.soldBadgeText,
  },
  content: {
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleLeft: {
    flex: 1,
  },
  sku: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: t.weights.strong,
    letterSpacing: t.title.tracking,
    color: t.colors.textPrimary,
  },
  furType: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    color: t.colors.textSecondary,
  },
  kindDetail: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
    borderRadius: t.radius.chip,
  },
  // Il bordo e il quadratino dell'icona prendono il colore della posizione (dato), dato in linea
  locationCard: {
    ...tileSurface(t),
    ...t.shadows.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  locationValue: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  locationShelf: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stockCard: {
    ...tileSurface(t),
    ...t.shadows.card,
    padding: 14,
    gap: 8,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockTotalLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  stockTotal: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: t.weights.price,
    fontVariant: ['tabular-nums'],
    color: t.colors.textPrimary,
  },
  stockPlace: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: t.colors.textSecondary,
  },
  // Scaffali di una posizione (S1b): rientrati sotto la posizione, un gradino più piccoli
  stockShelfRow: {
    paddingLeft: 14,
  },
  stockShelf: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  stockShelfQty: {
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
    color: t.colors.textSecondary,
  },
  moveStockButton: {
    marginTop: 4,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  moveStockText: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.onButtonSecondary,
  },
  minStockRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  lowStockText: {
    color: t.colors.warningText,
    fontWeight: t.weights.strong,
  },
  stockHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  stockQty: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: t.weights.strong,
    fontVariant: ['tabular-nums'],
    color: t.colors.textPrimary,
  },
  priceCard: {
    ...tileSurface(t),
    ...t.shadows.card,
    flex: 1,
    padding: 14,
  },
  priceLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  priceValue: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: t.weights.price,
    color: t.colors.textPrimary,
  },
  measureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  measureCard: {
    ...tileSurface(t),
    ...t.shadows.card,
    flex: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  measureLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  measureValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  notesCard: {
    ...tileSurface(t),
    ...t.shadows.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
    color: t.colors.textPrimary,
  },
  timelineList: {
    gap: 14,
    paddingVertical: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.colors.accent,
    marginTop: 7,
  },
  timelineContent: {
    flex: 1,
  },
  timelineType: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: t.colors.textPrimary,
  },
  timelineDate: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  timelineChanges: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.accentInk,
  },
  // Pulsante secondario della Scheda (Stampa scheda PDF)
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.onButtonSecondary,
  },
  pdfButton: {
    height: 48,
  },
  pdfButtonText: {
    fontSize: 15,
  },
  // Barra fissa Indietro/Modifica (regola 9): vetro o velo pieno dello stile, filetto in alto
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  actionButtonSecondary: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.onButtonSecondary,
  },
  actionButtonPrimary: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
  },
  actionButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: t.colors.onButton,
  },
  // Visore delle foto a schermo intero: fondo nero fisso, testi e icone bianchi fissi
  modalContainer: {
    flex: 1,
    backgroundColor: t.colors.cameraBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalCounter: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: t.colors.scrim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  modalCounterText: {
    color: t.colors.onData,
    fontSize: 14,
    fontWeight: '600',
  },
  customCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  // Riquadro a metà (larghezza calcolata nel componente)
  customMiniCard: {
    ...tileSurface(t),
    ...t.shadows.card,
    minHeight: 72,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  customIconWrap: {
    width: 34,
    height: 34,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCardContent: {
    flex: 1,
    minWidth: 0,
  },
  customFieldLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  customFieldValue: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  // Riquadro intero (testo lungo, valori multipli, documenti, foto)
  customWideCard: {
    ...tileSurface(t),
    ...t.shadows.card,
    width: '100%',
    padding: 12,
  },
  customNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customNotesText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: t.colors.textPrimary,
  },
  customTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  customTag: {
    backgroundColor: t.colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.chip,
  },
  customTagText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: t.colors.textPrimary,
  },
  // EDC: pillola con il colore e l'icona dell'opzione
  customTagMarked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
  },
  customTagInCard: {
    alignSelf: 'flex-start',
    marginTop: 4,
    maxWidth: '100%',
  },
  customDocumentList: {
    gap: 8,
    marginTop: 10,
  },
  customDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: t.colors.input,
    borderRadius: t.radius.inputSmall,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
  },
  customDocumentText: {
    flex: 1,
    fontSize: 14,
    color: t.colors.textPrimary,
  },
  customImagesRow: {
    marginTop: 10,
  },
  customNestedImageWrap: {
    width: 96,
    height: 96,
    borderRadius: t.radius.iconWrap,
    marginRight: 8,
    overflow: 'hidden',
    backgroundColor: t.colors.backgroundSecondary,
  },
  customNestedImage: {
    width: '100%',
    height: '100%',
  },
  // ETI: riga «Codice ed etichetta» (UX0 R9: icona in un riquadro, titolo, sottotitolo, freccia)
  codeRow: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  codeRowIcon: {
    width: 32,
    height: 32,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeRowText: {
    flex: 1,
    minWidth: 0,
  },
  codeRowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  codeRowSub: {
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
}));
