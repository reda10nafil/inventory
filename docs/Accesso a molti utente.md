

# **Product Requirements Document (PRD): SyncroFlow \- Modulo Mesh, Chat Avanzata e Storage Ottimizzato**

**Framework Target:** React Native (Strictly Bare Workflow / React Native CLI) **Ambito:** Logistica universale, sincronizzazione offline-first, networking locale, compressione media e chat interattiva multi-operatore.

## **1\. Panoramica e Obiettivi del Modulo**

Il presente documento definisce le specifiche tecniche per l'estensione di **SyncroFlow**, un'applicazione di logistica universale multi-settore. Il modulo integra una rete mesh/locale offline-first, un sistema di chat di team orientato alle operazioni di magazzino e una pipeline di ottimizzazione delle immagini. Il sistema garantisce operatività continua anche in assenza totale di connessione a internet, sfruttando router locali e sincronizzazione reattiva dei dati.

## **2\. Architettura di Rete e Connettività Locale**

> * **Infrastruttura Hardware:** Utilizzo di router Wi-Fi locali dedicati (es. Mercusys 4G LTE) configurati come access point chiusi. Il sistema non richiede una SIM attiva o connessione WAN; i terminali si agganciano alla LAN locale creata dal router per scambiare pacchetti a banda larga.  
> * **Pairing Rapido via QR Code:** Un dispositivo host genera un QR code dinamico contenente l'indirizzo IP/WebSocket o il token della stanza. Gli operatori inquadrano il codice per connettersi istantaneamente alla rete. La scansione è affidata a react-native-vision-camera con frame processor dedicati per latenza zero.  
> * **Sincronizzazione Dati (Offline-First):** Implementazione di database locali reattivi capaci di propagare modifiche a SKU, cronologia e stati in tempo reale tra tutti i nodi connessi. Soluzioni native consigliate: **WatermelonDB** (sfruttando l'adattatore JSI nativo per massimizzare le prestazioni) o **Ditto SDK**.

## **3\. Pipeline di Acquisizione e Compressione Media (Bare React Native)**

> * **Origine Unificata:** L'acquisizione avviene indifferentemente tramite fotocamera o selezione dalla galleria nativa del dispositivo utilizzando react-native-image-crop-picker (che in ambiente Bare RN offre un controllo totale sui permessi nativi Android/iOS).  
> * **Conversione WebP On-Device:** Prima del salvataggio nel database locale o della trasmissione, il file temporaneo viene intercettato. Utilizzando la libreria react-native-compressor, l'immagine subisce una compressione multi-thread direttamente a livello nativo.  
> * **Riduzione del Carico:** L'output viene forzato in formato **WebP** con rimozione dei metadati (EXIF) e ridimensionamento preventivo (es. risoluzione massima 1920x1080), abbattendo il peso del file per preservare la banda della rete locale.

## **4\. Chat Operativa con "Hydrated Product Cards"**

> * **Payload Leggero (Transmission):** I messaggi di chat relativi a operazioni di inventario spediscono esclusivamente un payload JSON ultraleggero. Questo pacchetto contiene solo l'array di stringhe SKU e gli ID delle automazioni associate (es. spostamento, tagging).  
> * **Rendering Dinamico Locale (Hydration):** Il client React Native ricevente intercetta il payload testuale e interroga in modo sincrono il database locale tramite gli withObservables di WatermelonDB. La UI monta istantaneamente una **Card Interattiva** identica a quella del mittente, popolata con dati e anteprime WebP già presenti sul dispositivo.  
> * **Interattività Integrata:** La card renderizzata in chat è un componente completamente attivo. Il tap sulla card reindirizza al dettaglio prodotto. I pulsanti d'azione (es. "Sposta", "Vendi") eseguono l'automazione indicata direttamente sul record locale dello SKU.

## **5\. Fasi di Implementazione e Librerie (Roadmap Tecnica)**

| Fase | Macro-Attività | Librerie Native / CLI Raccomandate |
| :---- | :---- | :---- |
| **Fase 1** | **Infrastruttura Media & Storage** | react-native-image-crop-picker (acquisizione), react-native-compressor (conversione nativa WebP). |
| **Fase 2** | **Configurazione Database Locale** | WatermelonDB (con integrazione JSI abilitata su Gradle/Podfile) o @dittolive/ditto. |
| **Fase 3** | **Modulo di Rete & Pairing QR** | react-native-vision-camera (scansione codice), API WebSocket per la comunicazione su LAN o SDK Ditto. |
| **Fase 4** | **Sviluppo UI Chat & Hydration** | Componenti React Native customizzati per il parsing JSON e il rendering delle Product Cards osservabili in tempo reale. |
| **Fase 5** | **Test di Carico & Ottimizzazione** | Simulazione di disconnessioni fisiche via adb (inclusi test di rendering UI ad alti Hz su terminali Android di punta come il Samsung Galaxy S25 Ultra) con profilazione dell'uso della RAM durante la compressione. |

