// ==============================================================================
// GESTION DU STOCKAGE LOCAL SÉCURISÉ & CACHE HORS LIGNE
// ==============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  PROFILE: '@mon_vtc_profile',
  CLIENTS: '@mon_vtc_clients',
  BOOKINGS: '@mon_vtc_bookings',
  INVOICES: '@mon_vtc_invoices',
  PAYMENTS: '@mon_vtc_payments',
  OFFLINE_QUEUE: '@mon_vtc_offline_queue',
  AUTH_TOKEN: '@mon_vtc_auth_token',
};

export const localStorage = {
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      await AsyncStorage.setItem(key, json);
    } catch (error) {
      console.error(`Erreur d'écriture locale [${key}]:`, error);
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const json = await AsyncStorage.getItem(key);
      return json != null ? (JSON.parse(json) as T) : null;
    } catch (error) {
      console.error(`Erreur de lecture locale [${key}]:`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Erreur de suppression locale [${key}]:`, error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Erreur lors du nettoyage du stockage local:', error);
    }
  },

  keys: STORAGE_KEYS,
};
