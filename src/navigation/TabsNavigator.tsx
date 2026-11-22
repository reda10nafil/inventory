import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens - imported from src/screens (copied via compat)
import HomeScreen from '../screens/tabs/HomeScreen';
import TimelineScreen from '../screens/tabs/TimelineScreen';
import AutomationsScreen from '../screens/tabs/AutomationsScreen';
import AddScreen from '../screens/tabs/AddScreen';
import SettingsScreen from '../screens/tabs/SettingsScreen';
import { AppIcon } from '../../components/ui/AppIcon';
import { fontStyle } from '../../components/ui/Text';
import { useTheme } from '../../contexts/ThemeContext';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const tabBarStyle: any = {
    height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
    paddingTop: 8,
    paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
    paddingHorizontal: 16,
    backgroundColor: t.bar.background,
    borderTopWidth: t.bar.borderWidth,
    borderTopColor: t.bar.borderColor,
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: t.tab.activeColor,
        tabBarInactiveTintColor: t.tab.color,
        tabBarLabelStyle: { fontSize: t.tab.labelSize, ...fontStyle(t, t.tab.activeWeight) },
      }}
    >
      <Tab.Screen name="index" component={HomeScreen} options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <AppIcon name="grid-view" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="timeline" component={TimelineScreen} options={{ title: 'Cronologia', tabBarIcon: ({ color, focused }) => <AppIcon name="timeline" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="automations" component={AutomationsScreen} options={{ title: 'Automazioni', tabBarIcon: ({ color, focused }) => <AppIcon name="account-tree" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="add" component={AddScreen} options={{ title: 'Aggiungi', tabBarIcon: ({ color, focused }) => <AppIcon name="add-circle" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="settings" component={SettingsScreen} options={{ title: 'Impostazioni', tabBarIcon: ({ color, focused }) => <AppIcon name="settings" active={focused} size={24} color={color} /> }} />
    </Tab.Navigator>
  );
}
