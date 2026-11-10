// ==============================================================================
// GESTIONNAIRE D'ÉTAT DES PAIEMENTS & LIVRE DES RECETTES - ZUSTAND
// Enregistrement chronologique, multi-moyens (CB, Espèces, Virement, Lien)
// ==============================================================================

import { create } from 'zustand';
import { Payment, PaymentMethod, Invoice, ReceiptBookEntry } from '../types/models';
import { supabase } from '../services/supabase';
import { localStorage } from '../services/storage';
import { useInvoiceStore } from './useInvoiceStore';

interface PaymentState {
  payments: Payment[];
  receiptBookEntries: ReceiptBookEntry[];
  isLoading: boolean;
  isRecording: boolean;
  loadPayments: (userId: string) => Promise<void>;
  recordPayment: (
    userId: string,
    invoice: Invoice,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    notes?: string
  ) => Promise<Payment>;
  getPaymentsForInvoice: (invoiceId: string) => Payment[];
  getTotalPaidForInvoice: (invoiceId: string) => number;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  receiptBookEntries: [],
  isLoading: false,
  isRecording: false,

  loadPayments: async (userId: string) => {
    set({ isLoading: true });

    // 1. Cache local
    const cachedPayments = (await localStorage.getItem<Payment[]>(localStorage.keys.PAYMENTS)) || [];
    const cachedReceipts =
      (await localStorage.getItem<ReceiptBookEntry[]>('@mon_vtc_receipt_book')) || [];

    if (cachedPayments.length > 0) {
      set({ payments: cachedPayments, receiptBookEntries: cachedReceipts, isLoading: false });
    }

    // 2. Synchronisation Supabase
    try {
      const { data: pData, error: pError } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (!pError && pData) {
        set({ payments: pData as Payment[], isLoading: false });
        await localStorage.setItem(localStorage.keys.PAYMENTS, pData);
      }
    } catch {
      set({ isLoading: false });
    }
  },

  recordPayment: async (userId, invoice, amount, method, reference, notes) => {
    set({ isRecording: true });

    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);

    const newPayment: Payment = {
      id: 'local_pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      invoice_id: invoice.id,
      amount,
      payment_date: todayDate,
      payment_method: method,
      transaction_reference: reference,
      notes,
      created_at: nowIso,
    };

    // 1. Mettre à jour la liste des paiements en local
    const updatedPayments = [newPayment, ...get().payments];
    set({ payments: updatedPayments });
    await localStorage.setItem(localStorage.keys.PAYMENTS, updatedPayments);

    // 2. Vérifier si la facture est désormais soldée
    const totalPaid = updatedPayments
      .filter((p) => p.invoice_id === invoice.id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    if (totalPaid >= Number(invoice.total_ttc)) {
      await useInvoiceStore.getState().updateInvoiceStatus(invoice.id, 'paid');
    }

    // 3. Alimenter le Livre des Recettes (Article L. 123-28 du Code de commerce)
    const clientName =
      invoice.client?.type === 'entreprise'
        ? invoice.client.company_name || 'Entreprise'
        : `${invoice.client?.last_name || ''} ${invoice.client?.first_name || ''}`.trim() || 'Particulier';

    const currentReceipts = get().receiptBookEntries;
    const nextEntryNumber = currentReceipts.length + 1;

    const receiptEntry: ReceiptBookEntry = {
      id: 'local_rec_' + Date.now(),
      user_id: userId,
      payment_id: newPayment.id,
      entry_number: nextEntryNumber,
      entry_date: todayDate,
      client_name: clientName,
      invoice_number: invoice.invoice_number,
      service_nature: 'Transport de personnes VTC',
      amount,
      payment_method: method,
      created_at: nowIso,
    };

    const updatedReceipts = [receiptEntry, ...currentReceipts];
    set({ receiptBookEntries: updatedReceipts, isRecording: false });
    await localStorage.setItem('@mon_vtc_receipt_book', updatedReceipts);

    // 4. Synchronisation Supabase en tâche de fond
    try {
      await supabase.from('payments').insert({
        user_id: userId,
        invoice_id: invoice.id,
        amount: newPayment.amount,
        payment_date: newPayment.payment_date,
        payment_method: newPayment.payment_method,
        transaction_reference: newPayment.transaction_reference,
        notes: newPayment.notes,
      });
    } catch {
      // Ignorer si offline
    }

    return newPayment;
  },

  getPaymentsForInvoice: (invoiceId: string) => {
    return get().payments.filter((p) => p.invoice_id === invoiceId);
  },

  getTotalPaidForInvoice: (invoiceId: string) => {
    return get()
      .payments.filter((p) => p.invoice_id === invoiceId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  },
}));
