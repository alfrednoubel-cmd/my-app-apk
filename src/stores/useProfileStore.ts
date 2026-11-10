// ==============================================================================
// GESTIONNAIRE D'ÉTAT DU PROFIL ENTREPRISE VTC
// ==============================================================================

import { create } from 'zustand';
import { Profile } from '../types/models';
import { supabase } from '../services/supabase';
import { localStorage } from '../services/storage';
import { LEGAL_CONSTANTS } from '../constants/legal';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadProfile: (userId: string) => Promise<void>;
  saveProfile: (profileData: Partial<Profile>, userId: string) => Promise<boolean>;
  getLegalHeader: () => string;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadProfile: async (userId: string) => {
    set({ isLoading: true, error: null });

    // 1. Charger immédiatement le cache local (Local-First)
    const cached = await localStorage.getItem<Profile>(localStorage.keys.PROFILE);
    if (cached) {
      set({ profile: cached, isLoading: false });
    }

    // 2. Synchroniser avec Supabase en arrière-plan
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        set({ profile: data as Profile, isLoading: false });
        await localStorage.setItem(localStorage.keys.PROFILE, data);
      }
    } catch {
      // Si hors-ligne, le cache local suffit
      set({ isLoading: false });
    }
  },

  saveProfile: async (profileData: Partial<Profile>, userId: string) => {
    set({ isSaving: true, error: null });
    try {
      const fullProfile: Profile = {
        id: userId,
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        is_ei: profileData.is_ei ?? true,
        commercial_name: profileData.commercial_name || '',
        siren: profileData.siren || '',
        siret: profileData.siret || '',
        revtc_number: profileData.revtc_number || '',
        address: profileData.address || '',
        postal_code: profileData.postal_code || '',
        city: profileData.city || '',
        phone: profileData.phone || '',
        email: profileData.email || '',
        rib_iban: profileData.rib_iban || '',
        rib_bic: profileData.rib_bic || '',
        bank_name: profileData.bank_name || '',
        tva_regime: profileData.tva_regime || 'franchise',
        tva_mention: profileData.tva_mention || LEGAL_CONSTANTS.TVA_FRANCHISE_MENTION,
        payment_terms: profileData.payment_terms || 'Règlement à réception',
        late_penalty_rate: profileData.late_penalty_rate || LEGAL_CONSTANTS.LATE_PENALTIES,
        recovery_fee: profileData.recovery_fee || LEGAL_CONSTANTS.RECOVERY_FEE_AMOUNT,
        logo_url: profileData.logo_url,
        created_at: profileData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Sauvegarder dans le cache local
      await localStorage.setItem(localStorage.keys.PROFILE, fullProfile);
      set({ profile: fullProfile });

      // 2. Sauvegarder sur Supabase
      const { error } = await supabase.from('profiles').upsert(fullProfile);
      if (error) {
        console.warn('Sauvegarde distante en attente (mode hors-ligne):', error.message);
      }

      set({ isSaving: false });
      return true;
    } catch (err: any) {
      set({ isSaving: false, error: err.message || 'Erreur lors de la sauvegarde' });
      return false;
    }
  },

  getLegalHeader: () => {
    const p = get().profile;
    if (!p) return 'Chauffeur VTC Indépendant';
    const ei = p.is_ei ? ' EI' : '';
    const name = `${p.first_name} ${p.last_name}${ei}`;
    const comm = p.commercial_name ? ` (${p.commercial_name})` : '';
    return `${name}${comm}`;
  },
}));
