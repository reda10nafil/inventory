import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens - imported from src/screens (copied via compat)
import HomeScreen from '../screens/tabs/HomeScreen';
import TimelineScreen from '../screens/tabs/TimelineScreen';
import AutomationsScreen from '../screens/tabs/AutomationsScreen';
import AddScreen from '../screens/tabs/AddScreen';
import SettingsScreen from '../screens/tabs/SettingsScreen';
import { AppIcon } from '../../components/ui/AppIcon';
import TabBar from './TabBar';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="index" component={HomeScreen} options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <AppIcon name="grid-view" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="timeline" component={TimelineScreen} options={{ title: 'Cronologia', tabBarIcon: ({ color, focused }) => <AppIcon name="timeline" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="automations" component={AutomationsScreen} options={{ title: 'Automazioni', tabBarIcon: ({ color, focused }) => <AppIcon name="account-tree" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="add" component={AddScreen} options={{ title: 'Aggiungi', tabBarIcon: ({ color, focused }) => <AppIcon name="add-circle" active={focused} size={24} color={color} /> }} />
      <Tab.Screen name="settings" component={SettingsScreen} options={{ title: 'Impostazioni', tabBarIcon: ({ color, focused }) => <AppIcon name="settings" active={focused} size={24} color={color} /> }} />
    </Tab.Navigator>
  );
}
