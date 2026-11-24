// N1 (ticket 22, NG11): «Proponi di scrivere il tag» di Scanner e NFC. Dopo «Prodotto Aggiunto» c'è il pulsante «Scrivi
// il tag», che apre la finestra del tag col suo SKU; chiusa la finestra si fa quello che avrebbe fatto «OK». Solo con
// l'interruttore acceso, con l'NFC e non in «Fotocamera» (`offerTagWrite`): sul web non compare mai.
import React, { useState } from 'react';
import type { AlertButton } from 'react-native';
import { NfcSheet } from '../components/NfcSheet';
import { useHardwareConfig } from '../contexts/HardwareConfigContext';
import { useInventory } from '../contexts/InventoryContext';
import { useNfcUsable } from './useNfcUsable';
import { offerTagWrite } from '../utils/nfcTag';

export function useTagOffer() {
  const { hwConfig } = useHardwareConfig();
  const { products } = useInventory();
  const nfcHere = useNfcUsable();
  const [pending, setPending] = useState<{ sku: string; after?: () => void } | null>(null);

  /** I pulsanti dell'avviso con «Scrivi il tag» davanti; l'ultimo pulsante (OK) si esegue dopo la finestra. */
  const withTagOffer = (sku: string, buttons: AlertButton[]): AlertButton[] => {
    if (!offerTagWrite(hwConfig, nfcHere)) return buttons;
    const last = buttons[buttons.length - 1];
    return [{ text: 'Scrivi il tag', onPress: () => setPending({ sku, after: last?.onPress ? () => last.onPress?.() : undefined }) }, ...buttons];
  };

  const close = () => {
    const after = pending?.after;
    setPending(null);
    after?.();
  };
  const product = pending ? products.find((p) => p.sku === pending.sku && !p.deletedAt) : undefined;
  const sheet = pending ? (
    <NfcSheet
      visible
      mode="scrivi"
      code={pending.sku}
      self={product ? { kind: 'product', id: product.id } : undefined}
      onClose={close}
      onDone={close}
    />
  ) : null;

  return { withTagOffer, sheet };
}
