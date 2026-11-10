// ==============================================================================
// SERVICE DE NUMÉROTATION CHRONOLOGIQUE CONTINUE SANS TROU
// Conforme au Code Général des Impôts (art. 242 nonies A de l'annexe II au CGI)
// et à l'Arrêté VTC du 6 août 2025
// ==============================================================================

import { supabase } from './supabase';
import { localStorage } from './storage';

export type DocumentType = 'booking' | 'invoice' | 'credit_note' | 'receipt';

interface LocalCounters {
  [year: number]: {
    booking: number;
    invoice: number;
    credit_note: number;
    receipt: number;
  };
}

const LOCAL_COUNTERS_KEY = '@mon_vtc_counters';

export const numberingService = {
  /**
   * Génère le prochain numéro séquentiel unique.
   * Tente d'abord l'appel atomique à la fonction PostgreSQL Supabase (en ligne).
   * En cas de déconnexion, utilise le compteur local sécurisé.
   */
  async getNextNumber(
    userId: string,
    docType: DocumentType,
    date: Date = new Date()
  ): Promise<string> {
    const year = date.getFullYear();
    const prefixMap: Record<DocumentType, string> = {
      booking: 'BC',
      invoice: 'FAC',
      credit_note: 'AV',
      receipt: 'REC',
    };
    const prefix = prefixMap[docType];

    try {
      // 1. TENTATIVE EN LIGNE (GARANTIE ATOMIQUE POSTGRES)
      const { data, error } = await supabase.rpc('get_next_document_number', {
        p_user_id: userId,
        p_doc_type: docType,
        p_year: year,
      });

      if (!error && data) {
        // Mettre à jour le miroir local
        await this.syncLocalCounterFromNumber(docType, year, data);
        return data as string;
      }
    } catch {
      // Échec réseau, passage en mode hors-ligne
    }

    // 2. SECOURS HORS LIGNE (LOCAL SECURE COUNTER)
    const localCounters = (await localStorage.getItem<LocalCounters>(LOCAL_COUNTERS_KEY)) || {};
    if (!localCounters[year]) {
      localCounters[year] = { booking: 0, invoice: 0, credit_note: 0, receipt: 0 };
    }

    localCounters[year][docType] += 1;
    const nextVal = localCounters[year][docType];
    await localStorage.setItem(LOCAL_COUNTERS_KEY, localCounters);

    const formattedNumber = `${prefix}-${year}-${String(nextVal).padStart(4, '0')}`;
    return formattedNumber;
  },

  async syncLocalCounterFromNumber(
    docType: DocumentType,
    year: number,
    formattedNumber: string
  ): Promise<void> {
    const parts = formattedNumber.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      const localCounters = (await localStorage.getItem<LocalCounters>(LOCAL_COUNTERS_KEY)) || {};
      if (!localCounters[year]) {
        localCounters[year] = { booking: 0, invoice: 0, credit_note: 0, receipt: 0 };
      }
      if (num > localCounters[year][docType]) {
        localCounters[year][docType] = num;
        await localStorage.setItem(LOCAL_COUNTERS_KEY, localCounters);
      }
    }
  },
};
