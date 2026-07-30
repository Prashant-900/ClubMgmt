/**
 * ClubMgmt mobile entry point.
 * gesture-handler must be the very first import in the app.
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
