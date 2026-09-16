import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../backend-auth/supabase/client';

interface Operator { id: string; name: string; role: string | null; }

export function OperatorSelector({ onSelect }: { onSelect?: (operatorId: string) => void }) {
  const { operatorId, setOperatorId, user } = useAuth();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('operators').select('*').eq('user_id', user.id).then(({ data, error }) => {
      if (error) return;
      setOperators(data || []);
      if (data?.length && !operatorId) setOperatorId(data[0].id);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (operatorId && operators.length) setCurrentOperator(operators.find((op) => op.id === operatorId) || null);
  }, [operatorId, operators]);

  const handleSelectOperator = (op: Operator) => {
    setOperatorId(op.id);
    setModalVisible(false);
    onSelect?.(op.id);
  };

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setModalVisible(true)}>
        <View style={styles.selectorContent}>
          <Text style={styles.selectorLabel}>Operatore:</Text>
          <Text style={styles.selectorValue}>{loading ? '...' : currentOperator?.name || 'Nessuno'}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleziona Operatore</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.closeButton}>✕</Text></TouchableOpacity>
            </View>
            <FlatList data={operators} keyExtractor={(item) => item.id} renderItem={({ item }) => (
              <TouchableOpacity style={[styles.operatorItem, operatorId === item.id && styles.operatorItemActive]} onPress={() => handleSelectOperator(item)}>
                <View><Text style={styles.operatorName}>{item.name}</Text><Text style={styles.operatorRole}>{item.role || 'Operatore'}</Text></View>
                {operatorId === item.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  selectorContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorLabel: { fontSize: 14, color: '#666' },
  selectorValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  chevron: { fontSize: 20, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  closeButton: { fontSize: 24, color: '#999' },
  operatorItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  operatorItemActive: { backgroundColor: '#f0f7ff' },
  operatorName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  operatorRole: { fontSize: 14, color: '#666', marginTop: 2 },
  checkmark: { fontSize: 20, color: '#4285F4', fontWeight: 'bold' },
});

export default OperatorSelector;
