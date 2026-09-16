import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, loading } = useAuth();
  const [loggingIn, setLoggingIn] = React.useState(false);

  const handleLogin = async () => {
    setLoggingIn(true);
    const result = await signIn();
    if (result.success) router.replace('/(tabs)');
    else alert(result.error || 'Login fallito');
    setLoggingIn(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Synchroflow</Text>
        <Text style={styles.subtitle}>Gestione Inventario</Text>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading || loggingIn}>
          {loading || loggingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accedi con Google</Text>}
        </TouchableOpacity>
        <Text style={styles.info}>Accedi per sincronizzare i tuoi dati tra più dispositivi</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 48 },
  spacer: { height: 32 },
  button: { backgroundColor: '#4285F4', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 8, minWidth: 200, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  info: { marginTop: 24, color: '#999', fontSize: 14, textAlign: 'center' },
});
