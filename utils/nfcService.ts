// FurInventory Pro - NFC Service Utility
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';

class NfcService {
  constructor() {
    this.init();
  }

  async init() {
    try {
      await NfcManager.start();
    } catch (ex) {
      console.warn('NFC Manager initialization failed', ex);
    }
  }

  async isSupported() {
    return await NfcManager.isSupported();
  }

  async isEnabled() {
    return await NfcManager.isEnabled();
  }

  cancel() {
    NfcManager.cancelTechnologyRequest();
  }

  /**
   * Passo 1: Pulisci il Tag
   * Scrive un record NDEF vuoto per "resettare" il tag NFC.
   */
  async cleanTag(): Promise<boolean> {
    let result = false;
    try {
      // Request Ndef technology (works on both iOS and Android)
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Avvicina il tag NFC per pulirlo (1/2)'
      });

      // Write an empty NDEF message to clear the tag
      // TNF_EMPTY is 0
      const emptyRec = Ndef.record(0, '', '', '');
      const bytes = Ndef.encodeMessage([emptyRec]);
      
      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        result = true;
        
        // Optional: show a success message on iOS before closing
        if (NfcManager.setAlertMessageIOS) {
          await NfcManager.setAlertMessageIOS('Tag pulito con successo!');
        }
      }
    } catch (ex) {
      console.warn('Error cleaning tag', ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
    return result;
  }

  /**
   * Passo 2: Scrivi il Tag
   * Scrive un record NDEF URI per registrare il Digital Link.
   */
  async writeGS1Uri(uri: string): Promise<boolean> {
    let result = false;
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Avvicina il tag NFC per registrare il prodotto (2/2)'
      });

      const bytes = Ndef.encodeMessage([
        Ndef.uriRecord(uri),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        result = true;

        if (NfcManager.setAlertMessageIOS) {
          await NfcManager.setAlertMessageIOS('Prodotto registrato sul tag!');
        }
      }
    } catch (ex) {
      console.warn('Error writing tag', ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
    return result;
  }

  /**
   * Legge un tag NFC in primo piano e restituisce la stringa contenuta (se URI o Testo)
   */
  async readTag(): Promise<string | null> {
    let tagValue: string | null = null;
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Avvicina il tag NFC da scansionare'
      });

      const tag = await NfcManager.getTag();
      
      if (tag && tag.ndefMessage && tag.ndefMessage.length > 0) {
        const ndefRecord = tag.ndefMessage[0];
        const payload = new Uint8Array(ndefRecord.payload as number[]);
        // Decode URI
        tagValue = Ndef.uri.decodePayload(payload);
        
        // Se non è un URI, prova a decodificarlo come Testo
        if (!tagValue) {
            tagValue = Ndef.text.decodePayload(payload);
        }
      }
      
      if (NfcManager.setAlertMessageIOS && tagValue) {
        await NfcManager.setAlertMessageIOS('Tag letto con successo!');
      }
    } catch (ex) {
      console.warn('Error reading tag', ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
    
    return tagValue;
  }
}

export const nfcService = new NfcService();
