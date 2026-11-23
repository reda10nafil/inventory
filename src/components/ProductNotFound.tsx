// «Prodotto non trovato» della Scheda e della Modifica (IND-P6, ticket 28): con un id che non c'è (link vecchio,
// prodotto eliminato del tutto) la pagina non resta più senza uscita. «Torna all'inventario» riporta alla barra delle
// schede che sta sotto (`popTo` in compat.ts, una barra sola) e la apre sulla Home, anche se era su un'altra scheda.
import React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '../navigation/compat';
import { AppIcon } from '../../components/ui/AppIcon';
import { Backdrop } from '../../components/ui/Backdrop';
import { GradientFill } from '../../components/ui/GradientFill';
import { Text } from '../../components/ui/Text';
import { formStyles } from '../../components/ui/formStyles';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';

export function ProductNotFound() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <View style={styles.box}>
        <AppIcon name="search-off" size={56} color={t.colors.textMuted} />
        <Text style={styles.title}>Prodotto non trovato</Text>
        <Text style={styles.text}>Forse è stato eliminato o il link non è più giusto.</Text>
        <Pressable
          style={[styles.primaryButton, styles.button]}
          onPress={() => router.push({ pathname: '/(tabs)', params: { screen: 'index' } })}
          accessibilityRole="button"
        >
          <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
          <AppIcon name="inventory-2" size={20} color={t.colors.onButton} />
          <Text style={styles.primaryButtonText}>Torna all'inventario</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  container: { flex: 1, backgroundColor: t.colors.background },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  title: { ...t.typography.cardTitle, fontSize: 18, color: t.colors.textPrimary, textAlign: 'center' },
  text: { fontSize: 15, lineHeight: 21, color: t.colors.textSecondary, textAlign: 'center' },
  button: { height: 52, paddingHorizontal: 24, marginTop: 14 },
}));
