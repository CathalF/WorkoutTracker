import { registerRootComponent } from 'expo';
import App from './App';

// Register Android widget handler — safe no-op when native module unavailable (e.g., Expo Go)
try {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/handler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch {}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
