// Placeholder RootNavigator — Fase 1 stub, verrà completato in Fase 2 con migrazione 14 screen
import React from 'react';
import { View, Text } from 'react-native';
import { theme } from '../../constants/theme';

export default function RootNavigator() {
  return (
    <View style={{flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center'}}>
      <Text style={{color: theme.primary, fontSize: 18}}>Syncro Flow — RootNavigator stub Fase 1</Text>
      <Text style={{color: theme.textSecondary, marginTop: 8}}>Fase 2 migrerà 14 Stack.Screen</Text>
    </View>
  );
}
