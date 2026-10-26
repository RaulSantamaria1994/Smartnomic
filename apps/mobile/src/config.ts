import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiUrl } from './api-url';

export const API_URL = apiUrl({
  configured: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  isWeb: Platform.OS === 'web',
  isDev: __DEV__,
});
