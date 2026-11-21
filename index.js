import { AppRegistry, Platform } from 'react-native';
import App from './App';

// Package android: com.redako35.syncroflow, scheme syncroflow://
// MainActivity getMainComponentName = "main" (expo legacy) — mantenuto per compatibilità Fase 1-5
// In Fase 5 verrà allineato a "SyncroFlow" se necessario
if (Platform.OS === 'web') {
  // Sul web registerRootComponent monta l'app nel DOM (#root) e carica il runtime Metro di Expo.
  // Senza, AppRegistry.registerComponent da solo lascia la pagina bianca.
  require('expo').registerRootComponent(App);
} else {
  AppRegistry.registerComponent('main', () => App);
}
