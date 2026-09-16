import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../backend-auth/supabase/client';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setOperatorId } = useAuth();
  const [operatorName, setOperatorName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateOperator = async () => {
    if (!operatorName.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('operators').insert({ user_id: user.id, name: operatorName.trim(), role: 'admin' }).select().single();
      if (error) throw error;
      setOperatorId(data.id);
      router.replace('/(tabs)');
    } catch (error) {
      alert('Errore nella creazione del profilo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Benvenuto!</Text>
        <Text style={styles.subtitle}>Crea il tuo profilo operatore</Text>
        <View style={styles.form}>
          <Text style={styles.label}>Nome operatore</Text>
          <TextInput style={styles.input} value={operatorName} onChangeText={setOperatorName} placeholder="Es. Magazzino Principale" placeholderTextColor="#999" />
          <TouchableOpacity style={[styles.button, !operatorName.trim() && styles.buttonDisabled]} onPress={handleCreateOperator} disabled={loading || !operatorName.trim()}>
            <Text style={styles.buttonText}>{loading ? 'Creazione...' : 'Continua'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.info}>Potrai aggiungere altri operatori dalle impostazioni</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  button: { backgroundColor: '#4285F4', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  info: { marginTop: 24, color: '#999', fontSize: 14, textAlign: 'center' },
});
