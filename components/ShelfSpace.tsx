// Spazio sullo scaffale del prodotto, nella Scheda (S2, ticket 14 e 15): per ogni scaffale con misure o limiti su cui
// il prodotto sta (il pezzo unico sul suo, l'articolo a quantità dove ha giacenza), il riempimento e quanti ne
// entrano ancora come questo, oppure perché non entra. Gli altri scaffali, l'avviso e la proposta sono di S3.
// Componente a sé, così la Scheda (toccata anche da altre fette) cambia di una riga.
import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { Product } from '../types';
import { useInventory } from '../contexts/InventoryContext';
import { useShelves } from '../contexts/ShelvesContext';
import { makeStyles } from '../contexts/ThemeContext';
import { tileSurface } from './ui/surfaces';
import { Text } from './ui/Text';
import { ShelfFill } from './ShelfFill';
import { capacityText, fillLevel, fitCount, fitCountText, hasMeasures, shelfLoad, shelvesOfProduct } from '../utils/shelves';

export function ShelfSpace({ product }: { product: Product }) {
  const styles = useStyles();
  const { shelves } = useShelves();
  const { products } = useInventory();
  const rows = useMemo(() => shelvesOfProduct(product, shelves)
    .filter((shelf) => shelf.kind === 'barra' || hasMeasures(shelf))
    .map((shelf) => {
      const load = shelfLoad(shelf, products);
      return { shelf, fill: fillLevel(shelf, load), text: fitCountText(fitCount(shelf, product, load), shelf.name) };
    }), [product, shelves, products]);

  if (!rows.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Spazio sullo scaffale</Text>
      {rows.map(({ shelf, fill, text }) => (
        <View key={shelf.id} style={styles.card}>
          <Text style={styles.name} numberOfLines={1}>Scaffale {shelf.name}</Text>
          <Text style={styles.meta}>{capacityText(shelf)}</Text>
          {fill ? <ShelfFill fill={fill} name={shelf.name} /> : null}
          <Text style={styles.fit} accessibilityLabel={`Quanti ne entrano: ${text}`}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  card: {
    ...tileSurface(t),
    ...t.shadows.card,
    padding: 14,
    gap: 2,
  },
  name: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  meta: {
    ...t.typography.caption,
    lineHeight: 18,
  },
  fit: {
    fontSize: 14,
    lineHeight: 20,
    color: t.colors.textPrimary,
    marginTop: 6,
  },
}));
