import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { exportProductsToCSV, importProductsFromCSV } from '../../utils/exportImport';
import * as DocumentPicker from 'expo-document-picker';

export default function ExportScreen() {
  const { operatorId } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (!operatorId) { Alert.alert('Errore', 'Operatore non selezionato'); return; }
    setExporting(true);
    const result = await exportProductsToCSV(operatorId);
    setExporting(false);
    if (result.success) Alert.alert('Successo', 'File CSV esportato con successo!');
    else Alert.alert('Errore', 'Impossibile esportare il file');
  };

  const handleImport = async () => {
    if (!operatorId) { Alert.alert('Errore', 'Operatore non selezionato'); return; }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      setImporting(true);
      const importResult = await importProductsFromCSV(result.assets[0].uri, operatorId);
      setImporting(false);
      if (importResult.success) Alert.alert('Import completato', `${importResult.count} prodotti importati!`);
      else Alert.alert('Errore', 'Impossibile importare il file');
    } catch (error) {
      setImporting(false);
      Alert.alert('Errore', 'Errore durante l\'import');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Export / Import</Text>
        <Text style={styles.subtitle}>Backup e ripristino inventario</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Esporta</Text>
          <Text style={styles.description}>Scarica tutti i prodotti in CSV, inclusi i link delle immagini.</Text>
          <TouchableOpacity style={styles.button} onPress={handleExport} disabled={exporting}>
            {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Esporta CSV</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Importa</Text>
          <Text style={styles.description}>Ripristina prodotti da file CSV.</Text>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleImport} disabled={importing}>
            {importing ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Importa CSV</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Informazioni</Text>
          <Text style={styles.infoText}>• Il CSV include TUTTI i dati, inclusi i link delle immagini</Text>
          <Text style={styles.infoText}>• Le immagini rimangono su Google Drive, il CSV contiene solo i link</Text>
          <Text style={styles.infoText}>• Puoi importare il CSV su un altro dispositivo</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  description: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  button: { backgroundColor: '#4285F4', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#34A853' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: '#fff' },
  infoBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 8 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#666', marginBottom: 8, lineHeight: 20 },
});
