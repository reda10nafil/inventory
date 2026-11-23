import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabsNavigator from './TabsNavigator';
import { useTheme } from '../../contexts/ThemeContext';

// Import screens from src/screens (copied)
import ScannerScreen from '../screens/ScannerScreen';
import ScannerActionScreen from '../screens/ScannerActionScreen';
import ProductDetailScreen from '../screens/product/DetailScreen';
import ProductEditScreen from '../screens/product/EditScreen';
import NotFoundScreen from '../screens/NotFoundScreen';

import LocationsScreen from '../screens/settings/LocationsScreen';
import ContactsScreen from '../screens/settings/ContactsScreen';
import ShelvesScreen from '../screens/settings/ShelvesScreen';
import FieldsScreen from '../screens/settings/FieldsScreen';
import FoldersScreen from '../screens/settings/FoldersScreen';
import LayoutBuilderScreen from '../screens/settings/LayoutBuilderScreen';
import Gs1ConfigScreen from '../screens/settings/Gs1ConfigScreen';
import HardwareScreen from '../screens/settings/HardwareScreen';
import TrashScreen from '../screens/settings/TrashScreen';
import ShareScreen from '../screens/settings/ShareScreen';
import SectorTemplatesScreen from '../screens/settings/SectorTemplatesScreen';
import AutomationBuilderScreen from '../screens/settings/AutomationBuilderScreen';
import TeamScreen from '../screens/settings/TeamScreen';
import AppearanceScreen from '../screens/settings/AppearanceScreen';
import ChatScreen from '../screens/ChatScreen';

import AutomationFlowScreen from '../screens/automations/AutomationFlowScreen';
import CustomRunnerScreen from '../screens/automations/CustomRunnerScreen';
import AuditScreen from '../screens/automations/AuditScreen';
import BatchMoveScreen from '../screens/automations/BatchMoveScreen';
import ScanSellScreen from '../screens/automations/ScanSellScreen';
import QuickTagScreen from '../screens/automations/QuickTagScreen';
import CountScreen from '../screens/automations/CountScreen';

export type RootStackParamList = {
  '(tabs)': undefined;
  Scanner: undefined;
  ScannerAction: { type?: string; id?: string; productId?: string; library?: string } | undefined;
  ProductDetail: { id: string };
  ProductEdit: { id: string };
  SettingsLocations: undefined;
  SettingsCategories: undefined;
  SettingsContacts: undefined;
  SettingsShelves: undefined;
  SettingsFields: undefined;
  SettingsFolders: undefined;
  SettingsLayoutBuilder: undefined;
  SettingsGs1: undefined;
  SettingsHardware: undefined;
  SettingsTrash: undefined;
  SettingsShare: undefined;
  SettingsSector: undefined;
  SettingsTeam: undefined;
  SettingsAppearance: undefined;
  Chat: undefined;
  SettingsAutomationBuilder: { editId?: string } | undefined;
  AutomationFlow: { id: string } | undefined;
  CustomRunner: { id: string } | undefined;
  Audit: undefined;
  BatchMove: undefined;
  ScanSell: undefined;
  QuickTag: undefined;
  Count: undefined;
  NotFound: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const t = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Intestazioni native (lavoro L6): fondo dello stile, frecce d'accento, titolo come i testi; carattere e
        // filetto sotto (`border`) vengono dal tema di navigazione di App.tsx
        headerStyle: { backgroundColor: t.colors.background },
        headerTintColor: t.colors.accentInk,
        headerTitleStyle: { color: t.colors.textPrimary },
      }}
    >
      <Stack.Screen name="(tabs)" component={TabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ScannerAction"
        component={ScannerActionScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Azione Rapida',
        }}
      />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProductEdit" component={ProductEditScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SettingsLocations" component={LocationsScreen} options={{ headerShown: true, headerTitle: 'Gestisci Posizioni' }} />
      {/* C2 (ticket 21): l'indirizzo di Impostazioni › Tipi di pelle (M01) apre Campi Personalizzati con i valori di
          «Tipo di pelle» aperti (FieldsScreen guarda il nome della schermata); la voce non è più in Impostazioni */}
      <Stack.Screen name="SettingsCategories" component={FieldsScreen} options={{ headerShown: true, headerTitle: 'Campi Personalizzati' }} />
      <Stack.Screen name="SettingsContacts" component={ContactsScreen} options={{ headerShown: true, headerTitle: 'Fornitori e clienti' }} />
      <Stack.Screen name="SettingsShelves" component={ShelvesScreen} options={{ headerShown: true, headerTitle: 'Scaffali' }} />
      <Stack.Screen name="SettingsFields" component={FieldsScreen} options={{ headerShown: true, headerTitle: 'Campi Personalizzati' }} />
      <Stack.Screen name="SettingsFolders" component={FoldersScreen} options={{ headerShown: true, headerTitle: 'Categorie' }} />
      <Stack.Screen name="SettingsLayoutBuilder" component={LayoutBuilderScreen} options={{ headerShown: true, headerTitle: 'Configura Layout Aggiungi' }} />
      <Stack.Screen name="SettingsGs1" component={Gs1ConfigScreen} options={{ headerShown: true, headerTitle: 'GS1 Digital Link' }} />
      <Stack.Screen name="SettingsHardware" component={HardwareScreen} options={{ headerShown: true, headerTitle: 'Scanner & Hardware' }} />
      <Stack.Screen name="SettingsAppearance" component={AppearanceScreen} options={{ headerShown: true, headerTitle: 'Aspetto' }} />
      <Stack.Screen name="SettingsTrash" component={TrashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SettingsShare" component={ShareScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SettingsSector" component={SectorTemplatesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SettingsTeam" component={TeamScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SettingsAutomationBuilder" component={AutomationBuilderScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AutomationFlow" component={AutomationFlowScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CustomRunner" component={CustomRunnerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Audit" component={AuditScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BatchMove" component={BatchMoveScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ScanSell" component={ScanSellScreen} options={{ headerShown: false }} />
      <Stack.Screen name="QuickTag" component={QuickTagScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Count" component={CountScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotFound" component={NotFoundScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
