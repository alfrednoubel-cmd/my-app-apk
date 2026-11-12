// ==============================================================================
// GESTIONNAIRE D'ÉTAT AUTHENTIFICATION - ZUSTAND
// ==============================================================================

import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { localStorage } from '../services/storage';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      set({ isLoading: true });
      // Vérification du token Supabase
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const u: User = {
          id: data.session.user.id,
          email: data.session.user.email || '',
        };
        set({ user: u, isAuthenticated: true, isLoading: false });
      } else {
        // Connexion automatique directe pour le chauffeur indépendant
        const defaultUser: User = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'chauffeur.vtc@mon-vtc.fr',
        };
        const cachedUser = (await localStorage.getItem<User>(localStorage.keys.AUTH_TOKEN)) || defaultUser;
        set({ user: cachedUser, isAuthenticated: true, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user) {
      localStorage.setItem(localStorage.keys.AUTH_TOKEN, user);
    } else {
      localStorage.removeItem(localStorage.keys.AUTH_TOKEN);
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignorer si offline
    }
    await localStorage.removeItem(localStorage.keys.AUTH_TOKEN);
    set({ user: null, isAuthenticated: false });
  },
}));
