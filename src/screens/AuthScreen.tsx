import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthScreen() {
  const { signInWithGoogle, authError } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Accesso Google non riuscito.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>SYNCRO FLOW</Text>
      <Text style={styles.title}>Accedi al tuo inventario</Text>
      <Text style={styles.copy}>Ogni organizzazione ha i propri prodotti, file e operatori.</Text>
      <Pressable accessibilityRole="button" disabled={busy} onPress={signIn} style={styles.button}>
        {busy ? <ActivityIndicator color="#151515" /> : <Text style={styles.buttonText}>Continua con Google</Text>}
      </Pressable>
      {!!(error || authError) && <Text accessibilityRole="alert" style={styles.error}>{error || authError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#0A0A0A' },
  brand: { color: '#D4AF37', fontSize: 13, fontWeight: '700', letterSpacing: 3, marginBottom: 22 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '700', textAlign: 'center' },
  copy: { color: '#A1A1AA', fontSize: 15, lineHeight: 23, marginTop: 12, marginBottom: 28, textAlign: 'center', maxWidth: 360 },
  button: { minHeight: 50, minWidth: 250, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 22, backgroundColor: '#D4AF37' },
  buttonText: { color: '#151515', fontWeight: '700', fontSize: 16 },
  error: { color: '#FCA5A5', textAlign: 'center', marginTop: 18, maxWidth: 400 },
});
