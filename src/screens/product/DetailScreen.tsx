// FurInventory Pro - Product Detail Screen
import React, { useRef, useState } from 'react';
import { View, Pressable, ScrollView, Alert, useWindowDimensions, Share, Modal, StatusBar, Linking } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from '../../lib/print';
import * as FileSystem from '../../lib/fileSystem';
import * as ImageManipulator from '../../lib/imageManipulator';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
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
import { nfcService } from '../../../utils/nfcService';
import Barcode from '../../../components/Barcode';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { Glass } from '../../../components/ui/Glass';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { formatPrice } from '../../../utils/price';
import { PhotoPlaceholder } from '../../../components/ui/PhotoPlaceholder';
import { formatNumber } from '../../../utils/number';
import { describeStockEvent, formatQty, isLowStock, isOutOfStock, isStocked, round3, storedStock, totalStock } from '../../../utils/stock';
import { MovementSheet } from '../../../components/MovementSheet';
import { canMoveStock as canMoveStockRule } from '../../../utils/productRules';
import { useShelves } from '../../../contexts/ShelvesContext';

export default function ProductDetailScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getProductById, getTimelineForProduct } = useInventory();
  const { locations } = useLocations();
  const kindOf = useProductKind();
  const { labelOf: contactLabel } = useContacts();
  const { shelfOf } = useShelves();
  const { customFields } = useCustomFields();

  const { layout } = useLayout();

  const product = getProductById(id as string);
  const timeline = getTimelineForProduct(id as string);

  // D17: tutti gli hook prima del ritorno anticipato «Prodotto non trovato» (regole degli hook)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalVisible, setModalVisible] = useState(false);
  const viewerRef = useRef<ScrollView>(null); // visore delle foto a tutto schermo
  const { width: screenWidth } = useWindowDimensions();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [codeType, setCodeType] = useState<'qr' | 'barcode'>('qr');

  if (!product) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <Backdrop />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Prodotto non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  const heroWidth = Math.max(1, screenWidth);
  // Riquadro a metà dei campi strutturati: due per riga con 10 px in mezzo (come la tela), anche se resta da solo
  const halfTileWidth = (screenWidth - t.spacing.screenPadding * 2 - 10) / 2;

  const location = locations.find((l) => l.id === product.location);
  // Scaffale (S1a): nella scheda della posizione, sotto il nome; solo per un pezzo unico che ci sta davvero
  const shelf = shelfOf(product);
  // C1: categoria (la cartella, col nome completo) e tipo di pelle, ognuno solo se c'è
  const kind = kindOf(product);
  /** «Categoria · Tipo - testo», senza separatori in più quando mancano. */
  const withKind = (text: string) => [kind.full, text].filter(Boolean).join(' - ');
  // Articolo a quantità (M03): giacenza per posizione, dalla più grande; il nome della posizione o, se non c'è più, l'id
  const stocked = isStocked(product);
  const placeLabel = (id: string) => locations.find((l) => l.id === id)?.label ?? id;
  // Nel cestino si mostra la giacenza salvata (torna col ripristino), così non sembra vuoto (M04)
  const stockRows = Object.entries(storedStock(product)).sort((a, b) => b[1] - a[1]);
  const stockTotal = round3(stockRows.reduce((sum, [, qty]) => sum + qty, 0));
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

  const handlePrintLabel = async () => {
    try {
      const qrHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              font-family: sans-serif;
            }
            .label {
              text-align: center;
              border: 1px dashed #000;
              padding: 20px;
              border-radius: 10px;
            }
            .sku {
              font-size: 24px;
              font-weight: bold;
              margin-top: 10px;
            }
            .meta {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div id="qrcode"></div>
            <div class="sku">${product.sku}</div>
            <div class="meta">${withKind(location?.label || product.location)}</div>
          </div>
          <script src="https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js"></script>
          <script>
            new QRCode(document.getElementById("qrcode"), {
              text: "${product.sku}",
              width: 200,
              height: 200
            });
          </script>
        </body>
        </html>
      `;

      const barcodeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              font-family: sans-serif;
            }
            .label {
              text-align: center;
              border: 1px dashed #000;
              padding: 20px;
              border-radius: 10px;
              width: 300px;
            }
            .sku {
              font-size: 24px;
              font-weight: bold;
              margin-top: 10px;
            }
            .meta {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            svg {
              width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <svg id="barcode"></svg>
            <div class="sku">${product.sku}</div>
            <div class="meta">${withKind(location?.label || product.location)}</div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#barcode", "${product.sku}", {
              format: "CODE128",
              width: 2,
              height: 100,
              displayValue: false
            });
          </script>
        </body>
        </html>
      `;

      const html = codeType === 'qr' ? qrHtml : barcodeHtml;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert('Errore', 'Impossibile stampare l\'etichetta');
    }
  };

  const handlePrintPDF = async () => {
    try {
      // Convert ALL images to base64 for embedding (compressed)
      const imagesBase64: string[] = [];
      if (product.images && product.images.length > 0) {
        for (let i = 0; i < product.images.length; i++) {
          try {
            console.log(`Processing image ${i + 1}/${product.images.length} for PDF`);
            const manipulatedImage = await ImageManipulator.manipulateAsync(
              product.images[i],
              [{ resize: { width: 600 } }],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );
            const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
              encoding: 'base64',
            });
            imagesBase64.push(base64);
          } catch (error) {
            console.error(`Could not process image ${i + 1}:`, error);
          }
        }
        console.log(`Processed ${imagesBase64.length} images for PDF`);
      }

      // Build timeline HTML
      let timelineHTML = '';
      timeline.slice(0, 10).forEach((event) => {
        let eventText = '';
        if (event.type === 'created') eventText = 'Creato';
        else if (event.type === 'moved') eventText = `Spostato: ${event.details.from} → ${event.details.to}`;
        else if (event.type === 'sold') eventText = 'Venduto';
        else if (event.type === 'modified') eventText = event.details.changes?.[0] || 'Modificato';
        else if (event.type === 'scanned') eventText = 'Scansionato';
        else if (event.type === 'photo_added') eventText = `${event.details.photoCount} foto aggiunte`;
        else if (event.type === 'stock') eventText = stockEventText(event.details);

        const date = new Date(event.timestamp).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        timelineHTML += `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-text">${eventText}</div>
              <div class="timeline-date">${date}</div>
            </div>
          </div>
        `;
      });

      // Build photo gallery HTML
      let galleryHTML = '';
      if (imagesBase64.length > 0) {
        galleryHTML = `
          <div class="section">
            <div class="section-title">Galleria Foto (${imagesBase64.length})</div>
            <div class="gallery">
              ${imagesBase64.map((img, idx) => `
                <div class="gallery-item">
                  <img src="data:image/jpeg;base64,${img}" alt="Foto ${idx + 1}" />
                  <div class="gallery-caption">Foto ${idx + 1}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Scheda Prodotto - ${product.sku}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              background: #fff;
              color: #000;
              padding: 40px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #D4AF37;
            }
            .header h1 {
              font-size: 32px;
              font-weight: bold;
              color: #000;
              margin-bottom: 8px;
            }
            .header .sku {
              font-size: 24px;
              font-weight: 600;
              color: #D4AF37;
              margin-bottom: 4px;
            }
            .header .fur-type {
              font-size: 18px;
              color: #666;
            }
            ${product.status === 'sold' ? `
            .sold-badge {
              display: inline-block;
              background: #999;
              color: #fff;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
              margin-top: 12px;
            }
            ` : ''}
            .location-card {
              background: #f8f8f8;
              border: 2px solid ${location?.color || '#D4AF37'};
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 30px;
            }
            .location-card .label {
              font-size: 11px;
              font-weight: 600;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .location-card .value {
              font-size: 20px;
              font-weight: 600;
              color: ${location?.color || '#D4AF37'};
            }
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 16px;
            }
            .cards-row {
              display: flex;
              gap: 16px;
              margin-bottom: 20px;
              flex-wrap: wrap;
            }
            .card {
              flex: 1;
              min-width: 120px;
              background: #f8f8f8;
              border-radius: 10px;
              padding: 16px;
            }
            .card-label {
              font-size: 12px;
              color: #999;
              margin-bottom: 6px;
            }
            .card-value {
              font-size: 22px;
              font-weight: 600;
              color: #000;
            }
            .card-value.primary {
              color: #D4AF37;
            }
            .notes-box {
              background: #f8f8f8;
              border-radius: 10px;
              padding: 20px;
              font-size: 15px;
              line-height: 1.8;
              color: #333;
            }
            .gallery {
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .gallery-item {
              width: 100%;
              text-align: center;
              page-break-inside: avoid;
            }
            .gallery-item img {
              width: auto;
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              border: 1px solid #ddd;
            }
            .gallery-caption {
              font-size: 12px;
              color: #999;
              margin-top: 8px;
            }
            .timeline-item {
              display: flex;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .timeline-dot {
              width: 12px;
              height: 12px;
              background: #D4AF37;
              border-radius: 50%;
              margin-top: 4px;
              margin-right: 16px;
              flex-shrink: 0;
            }
            .timeline-content {
              flex: 1;
            }
            .timeline-text {
              font-size: 15px;
              font-weight: 600;
              color: #000;
              margin-bottom: 4px;
            }
            .timeline-date {
              font-size: 12px;
              color: #999;
            }
            .codes-section {
              margin-top: 40px;
              padding: 30px;
              background: #f8f8f8;
              border-radius: 12px;
              border: 2px dashed #D4AF37;
            }
            .codes-container {
              display: flex;
              justify-content: center;
              gap: 60px;
              align-items: flex-start;
              flex-wrap: wrap;
            }
            .code-block {
              text-align: center;
            }
            .code-block .code-label {
              font-size: 12px;
              font-weight: 600;
              color: #999;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            .code-block .code-value {
              font-size: 14px;
              font-weight: 600;
              color: #D4AF37;
              margin-top: 8px;
            }
            #qrcode {
              display: inline-block;
            }
            #barcode {
              max-width: 200px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <h1>FurInventory Pro</h1>
            <div class="sku">${product.sku}</div>
            ${kind.path ? `<div class="fur-type">${kind.path}</div>` : ''}
            ${kind.furType ? `<div class="fur-type">Tipo di pelle: ${kind.furType}</div>` : ''}
            ${product.status === 'sold' ? '<div class="sold-badge">VENDUTO</div>' : ''}
          </div>

          <!-- Location -->
          <div class="location-card">
            <div class="label">Posizione Attuale</div>
            <div class="value">${location?.label || product.location}</div>
          </div>

          <!-- Prices -->
          ${(product.purchasePrice || product.sellPrice) ? `
            <div class="section">
              <div class="section-title">Prezzi</div>
              <div class="cards-row">
                ${product.purchasePrice ? `
                  <div class="card">
                    <div class="card-label">Acquisto</div>
                    <div class="card-value">${formatPrice(product.purchasePrice)}</div>
                  </div>
                ` : ''}
                ${product.sellPrice ? `
                  <div class="card">
                    <div class="card-label">Vendita</div>
                    <div class="card-value primary">${formatPrice(product.sellPrice)}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Measurements -->
          ${(product.length || product.width || product.weight) ? `
            <div class="section">
              <div class="section-title">Misure</div>
              <div class="cards-row">
                ${product.length ? `
                  <div class="card">
                    <div class="card-label">Lunghezza</div>
                    <div class="card-value">${formatNumber(product.length)} cm</div>
                  </div>
                ` : ''}
                ${product.width ? `
                  <div class="card">
                    <div class="card-label">Larghezza</div>
                    <div class="card-value">${formatNumber(product.width)} cm</div>
                  </div>
                ` : ''}
                ${product.weight ? `
                  <div class="card">
                    <div class="card-label">Peso</div>
                    <div class="card-value">${formatNumber(product.weight)} kg</div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <!-- Technical Notes -->
          ${product.technicalNotes ? `
            <div class="section">
              <div class="section-title">Note Tecniche</div>
              <div class="notes-box">${product.technicalNotes}</div>
            </div>
          ` : ''}

          <!-- Photo Gallery -->
          ${galleryHTML}

          <!-- Timeline -->
          ${timeline.length > 0 ? `
            <div class="section">
              <div class="section-title">Cronologia Dettagliata</div>
              ${timelineHTML}
            </div>
          ` : ''}

          <!-- QR Code + Barcode -->
          <div class="codes-section">
            <div class="section-title" style="text-align: center; margin-bottom: 20px;">Codici Identificativi</div>
            <div class="codes-container">
              <div class="code-block">
                <div class="code-label">QR Code</div>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(product.sku)}" alt="QR Code" style="width: 150px; height: 150px;" />
                <div class="code-value">${product.sku}</div>
              </div>
              <div class="code-block">
                <div class="code-label">Barcode</div>
                <img src="https://barcodeapi.org/api/code128/${encodeURIComponent(product.sku)}" alt="Barcode" style="height: 80px;" />
                <div class="code-value">${product.sku}</div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            Documento generato: ${new Date().toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        dialogTitle: `Scheda Prodotto - ${product.sku}`,
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
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

  const handleProgramNFC = async () => {
    if (!product.gs1DigitalLink) {
      Alert.alert('Errore', 'Nessun Digital Link generato per questo prodotto.');
      return;
    }

    try {
      // Step 1: Clean tag
      const cleaned = await nfcService.cleanTag();
      if (!cleaned) {
        Alert.alert('Operazione Annullata', 'Pulizia del tag non completata.');
        return;
      }

      // Step 2: Write tag (small delay to let user remove and re-tap if needed, or just let system prompt handle it)
      setTimeout(async () => {
        const written = await nfcService.writeGS1Uri(product.gs1DigitalLink!);
        if (written) {
          Alert.alert('Successo', 'Il tag NFC è stato programmato correttamente con il Digital Link GS1.');
        } else {
          Alert.alert('Errore', 'Impossibile registrare il prodotto sul tag.');
        }
      }, 500);

    } catch (e) {
      Alert.alert('Errore Hardware', 'Si è verificato un errore di comunicazione con il sensore NFC.');
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
        {/* Hero Image Gallery */}
        <View style={styles.imageGalleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / heroWidth);
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {product.images.map((uri, index) => (
              <Pressable key={index} onPress={() => setModalVisible(true)}>
                <Image
                  source={{ uri }}
                  style={[styles.heroImage, { width: heroWidth }]}
                  contentFit="contain"
                />
              </Pressable>
            ))}
            {product.images.length === 0 && <PhotoPlaceholder size={56} style={[styles.heroImage, { width: heroWidth }]} />}
          </ScrollView>

          {/* Image Counter */}
          {product.images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1}/{product.images.length}
              </Text>
            </View>
          )}

          {/* Pagination Dots */}
          {product.images.length > 1 && (
            <View style={styles.paginationDots}>
              {product.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

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
            <Pressable style={styles.shareButton} onPress={handleShare}>
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
                    ) : stockRows.map(([place, qty]) => (
                      <View key={place} style={styles.stockRow}>
                        <Text style={styles.stockPlace} numberOfLines={1}>{placeLabel(place)}</Text>
                        <Text style={styles.stockQty}>{formatQty(qty, product.unit)}</Text>
                      </View>
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
                  <Pressable style={styles.moveStockButton} onPress={() => setShowMovement(true)} accessibilityLabel="Movimenta">
                    <AppIcon name="swap-vert" size={18} color={t.colors.onButtonSecondary} />
                    <Text style={styles.moveStockText}>Movimenta</Text>
                  </Pressable>
                )}
              </View>
              {!stocked && canMoveStock && (
                <Text style={styles.stockHint}>Con un carico o un altro movimento diventa un articolo a quantità.</Text>
              )}
            </View>
          )}

          {/* Prices */}
          {(product.purchasePrice || product.sellPrice) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prezzi</Text>
              <View style={styles.priceRow}>
                {product.purchasePrice && (
                  <View style={styles.priceCard}>
                    <Text style={styles.priceLabel}>Acquisto</Text>
                    <Text style={styles.priceValue}>{formatPrice(product.purchasePrice)}</Text>
                  </View>
                )}
                {product.sellPrice && (
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
          {!!(product.length || product.width || product.weight) && (
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
              </View>
            </View>
          )}

          {/* Technical Notes */}
          {product.technicalNotes && (
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
                  const field = dataItem.fieldSnapshot;
                  if (value === undefined || value === null || value === '') return null;

                  // Text Long -> Spanning full width like a Note
                  if (field.type === 'text_long') {
                    return (
                      <View key={field.id || index} style={styles.customWideCard}>
                        <View style={styles.customNotesHeader}>
                          <AppIcon name={field.icon as any || 'notes'} size={17} color={t.colors.fieldIcon} />
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
                          <AppIcon name={field.icon as any || 'label'} size={17} color={t.colors.fieldIcon} />
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                        </View>
                        <View style={styles.customTagsRow}>
                          {displayArray.map(val => {
                            // Find label if dataset has options
                            let label = val;
                            if (field.options) {
                              const opt = field.options.find((o: any) => o.id === val);
                              if (opt) label = opt.label;
                            }
                            return (
                              <View key={val} style={styles.customTag}>
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
                          <AppIcon name={field.icon as any || 'description'} size={17} color={t.colors.fieldIcon} />
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
                          <AppIcon name={field.icon as any || 'image'} size={17} color={t.colors.fieldIcon} />
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customImagesRow}>
                          {imgs.map((imgUri, i) => (
                            <View key={i} style={styles.customNestedImageWrap}>
                              <Image source={{ uri: imgUri }} style={styles.customNestedImage} contentFit="cover" />
                            </View>
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
                          <AppIcon name={field.icon as any || 'event'} size={19} color={t.colors.info} />
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
                          <AppIcon name={field.icon as any || 'attach-money'} size={19} color={t.colors.accentInk} />
                        </View>
                        <View style={styles.customCardContent}>
                          <Text style={styles.customFieldLabel}>{field.name}</Text>
                          <Text style={[styles.customFieldValue, { color: t.colors.accentInk }]}>
                            {formatPrice(Number(value))}
                          </Text>
                        </View>
                      </View>
                    );
                  }

                  // Default / Single Choice / Number / Text Short
                  let displayValue = String(value) + (field.unit ? ` ${field.unit}` : '');
                  if (typeof value === 'boolean') {
                    displayValue = value ? 'Sì' : 'No';
                  } else if (field.options && field.type === 'single_choice') {
                    const opt = field.options.find((o: any) => o.id === value);
                    if (opt) displayValue = opt.label;
                  }

                  return (
                    <View key={field.id || index} style={[styles.customMiniCard, { width: halfTileWidth }]}>
                      <View style={styles.customIconWrap}>
                        <AppIcon name={field.icon as any || 'info'} size={19} color={t.colors.fieldIcon} />
                      </View>
                      <View style={styles.customCardContent}>
                        <Text style={styles.customFieldLabel}>{field.name}</Text>
                        <Text style={styles.customFieldValue}>{displayValue}</Text>
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

          {/* GS1 Digital Link Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identità digitale GS1</Text>

            {product.gs1DigitalLink ? (
              <View style={styles.gs1Card}>
                <View style={styles.gs1QrContainer}>
                  <QRCode
                    value={product.gs1DigitalLink}
                    size={160}
                    color={t.colors.qrInk}
                    backgroundColor={t.colors.qrPaper}
                    logoSize={30}
                    logoBackgroundColor='transparent'
                  />
                </View>
                <View style={styles.gs1Info}>
                  <Text style={styles.gs1Label}>URL GS1 Digital Link</Text>
                  <Text style={styles.gs1UrlText} numberOfLines={2}>
                    {product.gs1DigitalLink}
                  </Text>
                </View>
                
                <View style={styles.gs1Actions}>
                  <Pressable style={styles.gs1ActionButton} onPress={handleCopyGS1Link}>
                    <AppIcon name="content-copy" size={18} color={t.colors.onButtonSecondary} />
                    <Text style={styles.gs1ActionText}>Copia link</Text>
                  </Pressable>
                  <Pressable style={styles.gs1ActionButton} onPress={handleProgramNFC}>
                    <AppIcon name="nfc" size={18} color={t.colors.onButtonSecondary} />
                    <Text style={styles.gs1ActionText}>Programma tag</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.gs1Card}>
                 <Text style={styles.gs1MissingText}>Questo prodotto non ha un Digital Link GS1 generato. Modifica e salva il prodotto per generarlo.</Text>
                 <Pressable style={styles.qrButton} onPress={() => setShowQRModal(true)}>
                    <AppIcon name="qr-code-2" size={20} color={t.colors.onButtonSecondary} />
                    <Text style={styles.qrButtonText}>Mostra SKU QR (Legacy)</Text>
                  </Pressable>
              </View>
            )}
          </View>

          {/* Azioni PDF (sotto GS1) */}
          <Pressable style={[styles.qrButton, styles.pdfButton]} onPress={handlePrintPDF}>
            <AppIcon name="picture-as-pdf" size={20} color={t.colors.onButtonSecondary} />
            <Text style={[styles.qrButtonText, styles.pdfButtonText]}>Stampa scheda PDF</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 12 }]}>
        <Glass />
        <Pressable style={styles.actionButtonSecondary} onPress={() => router.back()}>
          <AppIcon name="arrow-back" size={20} color={t.colors.onButtonSecondary} />
          <Text style={styles.actionButtonTextSecondary}>Indietro</Text>
        </Pressable>
        <Pressable
          style={styles.actionButtonPrimary}
          onPress={() => router.push(`/product/edit/${product.id}`)}
        >
          <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
          <AppIcon name="edit" size={20} color={t.colors.onButton} />
          <Text style={styles.actionButtonTextPrimary}>Modifica</Text>
        </Pressable>
      </View>
      <MovementSheet product={product} visible={showMovement} onClose={() => setShowMovement(false)} />

      {/* QR Code Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showQRModal}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>Codice Prodotto</Text>
              <Pressable onPress={() => setShowQRModal(false)}>
                <AppIcon name="close" size={24} color={t.colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.toggleContainer}>
              <Pressable
                style={[styles.toggleButton, codeType === 'qr' && styles.toggleButtonActive]}
                onPress={() => setCodeType('qr')}
              >
                <Text style={[styles.toggleText, codeType === 'qr' && styles.toggleTextActive]}>QR Code</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleButton, codeType === 'barcode' && styles.toggleButtonActive]}
                onPress={() => setCodeType('barcode')}
              >
                <Text style={[styles.toggleText, codeType === 'barcode' && styles.toggleTextActive]}>Barcode</Text>
              </Pressable>
            </View>

            <View style={styles.qrContainer}>
              {codeType === 'qr' ? (
                <QRCode
                  value={product.sku}
                  size={200}
                  color={t.colors.qrInk}
                  backgroundColor={t.colors.qrPaper}
                />
              ) : (
                <View style={{ padding: 10, alignItems: 'center' }}>
                  <Barcode
                    value={product.sku}
                    width={260}
                    height={100}
                  />
                </View>
              )}
            </View>

            <Text style={styles.qrSkuText}>{product.sku}</Text>
            {!!kind.full && <Text style={styles.qrInfoText}>{kind.full}</Text>}

            <Pressable style={styles.printLabelButton} onPress={handlePrintLabel}>
              <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
              <AppIcon name="print" size={20} color={t.colors.onButton} />
              <Text style={styles.printLabelText}>Stampa Etichetta</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar hidden={true} />

          {/* Close Button */}
          <Pressable
            style={[styles.closeButton, { top: insets.top + 10 }]}
            onPress={() => setModalVisible(false)}
          >
            <AppIcon name="close" size={30} color={t.colors.onData} />
          </Pressable>

          {/* Image Counter */}
          <View style={[styles.modalCounter, { top: insets.top + 20 }]}>
            <Text style={styles.modalCounterText}>
              {currentImageIndex + 1} / {product.images.length}
            </Text>
          </View>

          {/* Larghezza dello schermo: senza, sul web lo scorrevole diventava largo quanto tutte le foto e veniva
              centrato, mostrando sempre la seconda (P21). La foto di partenza si imposta anche al montaggio,
              perché `contentOffset` vale solo sul telefono. */}
          <ScrollView
            ref={viewerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: screenWidth, flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            onContentSizeChange={() => viewerRef.current?.scrollTo({ x: currentImageIndex * screenWidth, y: 0, animated: false })}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
            contentOffset={{ x: currentImageIndex * screenWidth, y: 0 }}
          >
            {product.images.map((uri, index) => (
              <View key={index} style={{ width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  imageGalleryContainer: {
    position: 'relative',
  },
  heroImage: {
    height: 320,
    backgroundColor: t.colors.backgroundSecondary,
  },
  // Contatore e pallini stanno sopra la foto: bianchi fissi su velo nero, uguali in tutti gli stili
  imageCounter: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: withAlpha(t.colors.shadow, 0.55),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  imageCounterText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: t.colors.onData,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: withAlpha(t.colors.onData, 0.55),
  },
  dotActive: {
    backgroundColor: t.colors.onData,
    width: 18,
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
  // Pulsanti secondari della Scheda (Mostra SKU QR, Stampa scheda PDF)
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...t.typography.cardTitle,
    fontSize: 18,
    color: t.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: t.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Finestra sopra la Scheda: fondo opaco (regola 7)
  qrModalContent: {
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...t.shadows.cardElevated,
  },
  qrHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: t.colors.qrPaper,
    borderRadius: t.radius.medium,
    marginBottom: 20,
  },
  qrSkuText: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: t.weights.strong,
    color: t.colors.accentInk,
    marginBottom: 4,
  },
  qrInfoText: {
    fontSize: 16,
    color: t.colors.textSecondary,
    marginBottom: 24,
  },
  // Interruttore QR / Barcode: binario opaco, scelta su `accent`
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: t.colors.background,
    padding: 4,
    borderRadius: t.radius.medium,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: 20,
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: t.radius.small,
  },
  toggleButtonActive: {
    backgroundColor: t.colors.accent,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.textSecondary,
  },
  toggleTextActive: {
    color: t.colors.onAccent,
  },
  printLabelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.colors.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
  },
  printLabelText: {
    fontSize: 16,
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
  // Identità GS1: card della tela; il codice QR resta su carta bianca e inchiostro nero
  gs1Card: {
    ...cardSurface(t),
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  gs1QrContainer: {
    padding: 10,
    backgroundColor: t.colors.qrPaper,
    borderRadius: t.radius.medium,
  },
  gs1Info: {
    alignItems: 'center',
    gap: 4,
  },
  gs1Label: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  gs1UrlText: {
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  gs1Actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  gs1ActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  gs1ActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.onButtonSecondary,
  },
  gs1MissingText: {
    fontSize: 14,
    lineHeight: 20,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
}));
