import { installWebAlert } from './src/utils/webAlert';
import { registerRootComponent } from 'expo';
import App from './App';

// BT-020: diálogos visibles también en la versión web.
installWebAlert();

registerRootComponent(App);
