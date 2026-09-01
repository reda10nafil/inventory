import { AppRegistry } from 'react-native';
import App from './App';

// Package android: com.redako35.syncroflow, scheme syncroflow://
// MainActivity getMainComponentName = "main" (expo legacy) — mantenuto per compatibilità Fase 1-5
// In Fase 5 verrà allineato a "SyncroFlow" se necessario
AppRegistry.registerComponent('main', () => App);
