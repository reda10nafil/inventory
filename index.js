import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent registra 'main' sia su Android/iOS (compatibile con MainActivity.kt)
// sia monta l'applicazione su DOM (#root) quando in esecuzione sul Web
registerRootComponent(App);
