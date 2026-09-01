import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

// Screens - imported from src/screens (copied via compat)
import HomeScreen from '../screens/tabs/HomeScreen';
import TimelineScreen from '../screens/tabs/TimelineScreen';
import AutomationsScreen from '../screens/tabs/AutomationsScreen';
import AddScreen from '../screens/tabs/AddScreen';
import SettingsScreen from '../screens/tabs/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarStyle: any = {
    height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
    paddingHorizontal: 16,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as any },
      }}
    >
      <Tab.Screen name="index" component={HomeScreen} options={{ title: 'Home', tabBarIcon: ({ color, size }) => <MaterialIcons name="grid-view" size={24} color={color} /> }} />
      <Tab.Screen name="timeline" component={TimelineScreen} options={{ title: 'Cronologia', tabBarIcon: ({ color }) => <MaterialIcons name="timeline" size={24} color={color} /> }} />
      <Tab.Screen name="automations" component={AutomationsScreen} options={{ title: 'Automazioni', tabBarIcon: ({ color }) => <MaterialIcons name="account-tree" size={24} color={color} /> }} />
      <Tab.Screen name="add" component={AddScreen} options={{ title: 'Aggiungi', tabBarIcon: ({ color }) => <MaterialIcons name="add-circle" size={24} color={color} /> }} />
      <Tab.Screen name="settings" component={SettingsScreen} options={{ title: 'Impostazioni', tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} /> }} />
    </Tab.Navigator>
  );
}
