// ==============================================================================
// GESTIONNAIRE D'ÉTAT DES CLIENTS - ZUSTAND (PARTICULIERS & ENTREPRISES)
// ==============================================================================

import { create } from 'zustand';
import { Client, ClientType } from '../types/models';
import { supabase } from '../services/supabase';
import { localStorage } from '../services/storage';

interface ClientState {
  clients: Client[];
  isLoading: boolean;
  loadClients: (userId: string) => Promise<void>;
  addClient: (
    userId: string,
    clientData: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  searchClients: (query: string) => Client[];
  getClientById: (id: string) => Client | undefined;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  isLoading: false,

  loadClients: async (userId: string) => {
    set({ isLoading: true });

    // 1. Chargement immédiat du cache local (Local-First)
    const cached = (await localStorage.getItem<Client[]>(localStorage.keys.CLIENTS)) || [];
    if (cached.length > 0) {
      set({ clients: cached, isLoading: false });
    }

    // 2. Synchronisation Supabase en arrière-plan
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ clients: data as Client[], isLoading: false });
        await localStorage.setItem(localStorage.keys.CLIENTS, data);
      }
    } catch {
      // Mode hors-ligne : données du cache déjà actives
      set({ isLoading: false });
    }
  },

  addClient: async (userId, clientData) => {
    const newClient: Client = {
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      type: clientData.type,
      first_name: clientData.first_name || '',
      last_name: clientData.last_name || '',
      company_name: clientData.company_name || '',
      contact_name: clientData.contact_name || '',
      siren_siret: clientData.siren_siret || '',
      phone: clientData.phone,
      email: clientData.email || '',
      billing_address: clientData.billing_address || '',
      payment_terms: clientData.payment_terms || 'Immédiat',
      notes: clientData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedList = [newClient, ...get().clients];
    set({ clients: updatedList });
    await localStorage.setItem(localStorage.keys.CLIENTS, updatedList);

    // Synchronisation Supabase si connectée
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          type: newClient.type,
          first_name: newClient.first_name,
          last_name: newClient.last_name,
          company_name: newClient.company_name,
          contact_name: newClient.contact_name,
          siren_siret: newClient.siren_siret,
          phone: newClient.phone,
          email: newClient.email,
          billing_address: newClient.billing_address,
          payment_terms: newClient.payment_terms,
          notes: newClient.notes,
        })
        .select()
        .single();

      if (!error && data) {
        // Remplacer l'id local par le véritable UUID Supabase
        const syncedList = get().clients.map((c) => (c.id === newClient.id ? (data as Client) : c));
        set({ clients: syncedList });
        await localStorage.setItem(localStorage.keys.CLIENTS, syncedList);
        return data as Client;
      }
    } catch {
      // Sauvegarde locale conservée pour la sync ultérieure
    }

    return newClient;
  },

  updateClient: async (id, updates) => {
    const updatedList = get().clients.map((c) =>
      c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    );
    set({ clients: updatedList });
    await localStorage.setItem(localStorage.keys.CLIENTS, updatedList);

    try {
      await supabase.from('clients').update(updates).eq('id', id);
    } catch {
      // Mis à jour en local
    }
    return true;
  },

  deleteClient: async (id) => {
    const filtered = get().clients.filter((c) => c.id !== id);
    set({ clients: filtered });
    await localStorage.setItem(localStorage.keys.CLIENTS, filtered);

    try {
      await supabase.from('clients').delete().eq('id', id);
    } catch {
      // Supprimé en local
    }
    return true;
  },

  searchClients: (query: string) => {
    if (!query || query.trim().length === 0) return get().clients;
    const q = query.toLowerCase().trim();

    return get().clients.filter((c) => {
      const phone = c.phone ? c.phone.toLowerCase() : '';
      const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      const company = c.company_name ? c.company_name.toLowerCase() : '';
      const email = c.email ? c.email.toLowerCase() : '';

      return phone.includes(q) || name.includes(q) || company.includes(q) || email.includes(q);
    });
  },

  getClientById: (id: string) => {
    return get().clients.find((c) => c.id === id);
  },
}));
