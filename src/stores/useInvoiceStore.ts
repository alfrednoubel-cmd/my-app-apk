// ==============================================================================
// GESTIONNAIRE D'ÉTAT FACTURATION & AVOIRS - ZUSTAND
// Séquence chronologique sans rupture & Immutabilité fiscale
// ==============================================================================

import { create } from 'zustand';
import { Invoice, InvoiceItem, InvoiceStatus, Booking, Client } from '../types/models';
import { supabase } from '../services/supabase';
import { localStorage } from '../services/storage';
import { numberingService } from '../services/numberingService';
import { LEGAL_CONSTANTS } from '../constants/legal';

interface InvoiceState {
  invoices: Invoice[];
  invoiceItemsMap: Record<string, InvoiceItem[]>;
  isLoading: boolean;
  isCreating: boolean;
  loadInvoices: (userId: string) => Promise<void>;
  createInvoiceFromBooking: (
    userId: string,
    booking: Booking,
    client: Client,
    supplements?: { description: string; price: number }[]
  ) => Promise<{ invoice: Invoice; items: InvoiceItem[] }>;
  createCreditNote: (
    userId: string,
    originalInvoice: Invoice,
    reason: string
  ) => Promise<{ creditNote: Invoice; items: InvoiceItem[] }>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<boolean>;
  getInvoiceById: (id: string) => Invoice | undefined;
  getItemsForInvoice: (invoiceId: string) => InvoiceItem[];
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  invoiceItemsMap: {},
  isLoading: false,
  isCreating: false,

  loadInvoices: async (userId: string) => {
    set({ isLoading: true });

    // 1. Cache local
    const cached = (await localStorage.getItem<Invoice[]>(localStorage.keys.INVOICES)) || [];
    const cachedItems =
      (await localStorage.getItem<Record<string, InvoiceItem[]>>('@mon_vtc_invoice_items')) || {};

    if (cached.length > 0) {
      set({ invoices: cached, invoiceItemsMap: cachedItems, isLoading: false });
    }

    // 2. Synchronisation Supabase
    try {
      const { data: invs, error } = await supabase
        .from('invoices')
        .select('*, client:clients(*), items:invoice_items(*)')
        .eq('user_id', userId)
        .order('invoice_date', { ascending: false });

      if (!error && invs) {
        const itemsMap: Record<string, InvoiceItem[]> = {};
        const cleanInvoices: Invoice[] = invs.map((inv: any) => {
          itemsMap[inv.id] = inv.items || [];
          return inv as Invoice;
        });

        set({ invoices: cleanInvoices, invoiceItemsMap: itemsMap, isLoading: false });
        await localStorage.setItem(localStorage.keys.INVOICES, cleanInvoices);
        await localStorage.setItem('@mon_vtc_invoice_items', itemsMap);
      }
    } catch {
      set({ isLoading: false });
    }
  },

  createInvoiceFromBooking: async (userId, booking, client, supplements = []) => {
    set({ isCreating: true });

    // 1. Numéro séquentiel continu garanti (ex: FAC-2026-0001)
    const invoiceNumber = await numberingService.getNextNumber(userId, 'invoice');

    // 2. Préparation des lignes
    const pickupDateStr = new Date(booking.pickup_datetime).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const mainDescription = `Prestation VTC du ${pickupDateStr} : ${booking.pickup_address} ➔ ${booking.dropoff_address}`;

    const items: InvoiceItem[] = [
      {
        id: 'item_' + Date.now() + '_1',
        description: mainDescription,
        quantity: 1,
        unit_price: Number(booking.agreed_price),
        total_price: Number(booking.agreed_price),
      },
    ];

    // Ajout des suppléments éventuels (ex: péage, attente)
    let totalSupplements = 0;
    supplements.forEach((supp, idx) => {
      const suppPrice = Number(supp.price);
      totalSupplements += suppPrice;
      items.push({
        id: 'item_' + Date.now() + '_' + (idx + 2),
        description: supp.description,
        quantity: 1,
        unit_price: suppPrice,
        total_price: suppPrice,
      });
    });

    const totalAmount = Number(booking.agreed_price) + totalSupplements;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);

    const isEnterprise = client.type === 'entreprise';

    const newInvoice: Invoice = {
      id: 'local_inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      client_id: client.id,
      booking_id: booking.id,
      invoice_number: invoiceNumber,
      invoice_date: todayDate,
      due_date: todayDate,
      is_credit_note: false,
      total_ht: totalAmount,
      total_tva: 0.0,
      total_ttc: totalAmount,
      tva_mention: LEGAL_CONSTANTS.TVA_FRANCHISE_MENTION,
      late_penalty_mention: isEnterprise ? LEGAL_CONSTANTS.LATE_PENALTIES : undefined,
      recovery_fee_mention: isEnterprise ? 'Indemnité forfaitaire de recouvrement de 40 €' : undefined,
      payment_terms: client.payment_terms || 'Règlement à réception',
      status: 'finalized', // Scellée dès son émission
      finalized_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      client,
    };

    // Mise à jour de l'état local
    const updatedInvoices = [newInvoice, ...get().invoices];
    const updatedItemsMap = { ...get().invoiceItemsMap, [newInvoice.id]: items };

    set({ invoices: updatedInvoices, invoiceItemsMap: updatedItemsMap });
    await localStorage.setItem(localStorage.keys.INVOICES, updatedInvoices);
    await localStorage.setItem('@mon_vtc_invoice_items', updatedItemsMap);

    // Synchronisation Supabase
    try {
      const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          client_id: newInvoice.client_id,
          booking_id: newInvoice.booking_id,
          invoice_number: newInvoice.invoice_number,
          invoice_date: newInvoice.invoice_date,
          due_date: newInvoice.due_date,
          is_credit_note: false,
          total_ht: newInvoice.total_ht,
          total_tva: newInvoice.total_tva,
          total_ttc: newInvoice.total_ttc,
          tva_mention: newInvoice.tva_mention,
          late_penalty_mention: newInvoice.late_penalty_mention,
          recovery_fee_mention: newInvoice.recovery_fee_mention,
          payment_terms: newInvoice.payment_terms,
          status: newInvoice.status,
          finalized_at: newInvoice.finalized_at,
        })
        .select()
        .single();

      if (!invError && invData) {
        // Insertion des lignes
        const dbItems = items.map((it) => ({
          invoice_id: invData.id,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
        }));
        await supabase.from('invoice_items').insert(dbItems);

        // Remplacement de l'identifiant local
        const syncedInvoices = get().invoices.map((inv) =>
          inv.id === newInvoice.id ? { ...(invData as Invoice), client } : inv
        );
        const syncedItemsMap = { ...get().invoiceItemsMap };
        syncedItemsMap[invData.id] = items;
        delete syncedItemsMap[newInvoice.id];

        set({ invoices: syncedInvoices, invoiceItemsMap: syncedItemsMap, isCreating: false });
        await localStorage.setItem(localStorage.keys.INVOICES, syncedInvoices);
        await localStorage.setItem('@mon_vtc_invoice_items', syncedItemsMap);

        return { invoice: { ...(invData as Invoice), client }, items };
      }
    } catch {
      // Ignorer si offline
    }

    set({ isCreating: false });
    return { invoice: newInvoice, items };
  },

  createCreditNote: async (userId, originalInvoice, reason) => {
    set({ isCreating: true });

    // Numérotation continue des avoirs (ex: AV-2026-0001)
    const creditNumber = await numberingService.getNextNumber(userId, 'credit_note');
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);

    const items: InvoiceItem[] = [
      {
        id: 'item_av_' + Date.now(),
        description: `Annulation de la facture N° ${originalInvoice.invoice_number} - Motif : ${reason}`,
        quantity: 1,
        unit_price: originalInvoice.total_ttc,
        total_price: originalInvoice.total_ttc,
      },
    ];

    const creditNote: Invoice = {
      id: 'local_av_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      client_id: originalInvoice.client_id,
      booking_id: originalInvoice.booking_id,
      invoice_number: creditNumber,
      invoice_date: todayDate,
      due_date: todayDate,
      is_credit_note: true,
      original_invoice_id: originalInvoice.id,
      total_ht: originalInvoice.total_ht,
      total_tva: 0.0,
      total_ttc: originalInvoice.total_ttc,
      tva_mention: originalInvoice.tva_mention,
      status: 'finalized',
      finalized_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      client: originalInvoice.client,
    };

    // Marquer l'originale comme annulée
    const updatedInvoices = get().invoices.map((inv) =>
      inv.id === originalInvoice.id ? { ...inv, status: 'cancelled' as InvoiceStatus } : inv
    );
    const withCreditNote = [creditNote, ...updatedInvoices];
    const updatedItemsMap = { ...get().invoiceItemsMap, [creditNote.id]: items };

    set({ invoices: withCreditNote, invoiceItemsMap: updatedItemsMap, isCreating: false });
    await localStorage.setItem(localStorage.keys.INVOICES, withCreditNote);
    await localStorage.setItem('@mon_vtc_invoice_items', updatedItemsMap);

    // Synchronisation Supabase
    try {
      await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', originalInvoice.id);

      await supabase.from('invoices').insert({
        user_id: userId,
        client_id: creditNote.client_id,
        invoice_number: creditNote.invoice_number,
        invoice_date: creditNote.invoice_date,
        due_date: creditNote.due_date,
        is_credit_note: true,
        original_invoice_id: originalInvoice.id,
        total_ht: creditNote.total_ht,
        total_tva: 0.0,
        total_ttc: creditNote.total_ttc,
        tva_mention: creditNote.tva_mention,
        status: 'finalized',
      });
    } catch {
      // Ignorer si offline
    }

    return { creditNote, items };
  },

  updateInvoiceStatus: async (id, status) => {
    const updated = get().invoices.map((inv) =>
      inv.id === id ? { ...inv, status, updated_at: new Date().toISOString() } : inv
    );
    set({ invoices: updated });
    await localStorage.setItem(localStorage.keys.INVOICES, updated);

    try {
      await supabase.from('invoices').update({ status }).eq('id', id);
    } catch {
      // Offline
    }
    return true;
  },

  getInvoiceById: (id) => {
    return get().invoices.find((i) => i.id === id);
  },

  getItemsForInvoice: (invoiceId) => {
    return get().invoiceItemsMap[invoiceId] || [];
  },
}));
