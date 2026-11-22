import { Alert, AppRegistry, Platform } from 'react-native';
import App from './App';
import { installWebAlert } from './utils/webAlert';

// Sul web Alert.alert di react-native-web è vuoto: conferme e avvisi diventano finestre del browser.
if (Platform.OS === 'web') installWebAlert(Alert, window);

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
