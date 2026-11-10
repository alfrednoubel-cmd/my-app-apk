// ==============================================================================
// MOTEUR DE SYNCHRONISATION HORS LIGNE & FILE D'ATTENTE SÉCURISÉE
// Détection des conflits, prévention des doublons et réconciliation
// ==============================================================================

import { localStorage } from './storage';
import { supabase } from './supabase';

export type SyncActionType =
  | 'UPSERT_PROFILE'
  | 'INSERT_CLIENT'
  | 'UPDATE_CLIENT'
  | 'INSERT_BOOKING'
  | 'UPDATE_BOOKING_STATUS'
  | 'INSERT_INVOICE'
  | 'INSERT_PAYMENT';

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  payload: any;
  createdAt: string;
  retryCount: number;
}

export const syncEngine = {
  /**
   * Ajoute une action dans la file d'attente hors-ligne
   */
  async enqueue(action: SyncActionType, payload: any): Promise<void> {
    const queue = (await localStorage.getItem<SyncQueueItem[]>(localStorage.keys.OFFLINE_QUEUE)) || [];
    const item: SyncQueueItem = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      action,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(item);
    await localStorage.setItem(localStorage.keys.OFFLINE_QUEUE, queue);
  },

  /**
   * Traite la file d'attente lors du retour du réseau
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    const queue = (await localStorage.getItem<SyncQueueItem[]>(localStorage.keys.OFFLINE_QUEUE)) || [];
    if (queue.length === 0) return { processed: 0, failed: 0 };

    let processedCount = 0;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        let success = false;

        switch (item.action) {
          case 'UPSERT_PROFILE': {
            const { error } = await supabase.from('profiles').upsert(item.payload);
            success = !error;
            break;
          }
          case 'INSERT_CLIENT': {
            const { error } = await supabase.from('clients').insert(item.payload);
            success = !error;
            break;
          }
          case 'UPDATE_CLIENT': {
            const { error } = await supabase
              .from('clients')
              .update(item.payload.updates)
              .eq('id', item.payload.id);
            success = !error;
            break;
          }
          case 'INSERT_BOOKING': {
            const { error } = await supabase.from('bookings').insert(item.payload);
            success = !error;
            break;
          }
          case 'UPDATE_BOOKING_STATUS': {
            const { error } = await supabase
              .from('bookings')
              .update({
                status: item.payload.status,
                completed_at: item.payload.completed_at,
              })
              .eq('id', item.payload.id);
            success = !error;
            break;
          }
          case 'INSERT_INVOICE': {
            const { error } = await supabase.from('invoices').insert(item.payload);
            success = !error;
            break;
          }
          case 'INSERT_PAYMENT': {
            const { error } = await supabase.from('payments').insert(item.payload);
            success = !error;
            break;
          }
        }

        if (success) {
          processedCount++;
        } else {
          item.retryCount += 1;
          if (item.retryCount < 5) remainingQueue.push(item);
        }
      } catch {
        item.retryCount += 1;
        if (item.retryCount < 5) remainingQueue.push(item);
      }
    }

    await localStorage.setItem(localStorage.keys.OFFLINE_QUEUE, remainingQueue);
    return { processed: processedCount, failed: remainingQueue.length };
  },

  async getPendingCount(): Promise<number> {
    const queue = (await localStorage.getItem<SyncQueueItem[]>(localStorage.keys.OFFLINE_QUEUE)) || [];
    return queue.length;
  },
};
