// ==============================================================================
// GESTIONNAIRE D'ÉTAT DES RÉSERVATIONS & BONS DE COMMANDE - ZUSTAND
// Horodatage immuable et numérotation réglementaire (Arrêté du 6 août 2025)
// ==============================================================================

import { create } from 'zustand';
import { Booking, BookingStatus } from '../types/models';
import { supabase } from '../services/supabase';
import { localStorage } from '../services/storage';
import { numberingService } from '../services/numberingService';

interface BookingState {
  bookings: Booking[];
  isLoading: boolean;
  isCreating: boolean;
  loadBookings: (userId: string) => Promise<void>;
  createBooking: (
    userId: string,
    bookingData: {
      client_id: string;
      pickup_datetime: string;
      pickup_address: string;
      dropoff_address: string;
      agreed_price: number;
      passenger_count?: number;
      flight_train_number?: string;
      notes?: string;
      status?: BookingStatus;
    }
  ) => Promise<Booking>;
  updateBookingStatus: (id: string, status: BookingStatus) => Promise<boolean>;
  getBookingById: (id: string) => Booking | undefined;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  isLoading: false,
  isCreating: false,

  loadBookings: async (userId: string) => {
    set({ isLoading: true });

    // 1. Cache local immédiat
    const cached = (await localStorage.getItem<Booking[]>(localStorage.keys.BOOKINGS)) || [];
    if (cached.length > 0) {
      set({ bookings: cached, isLoading: false });
    }

    // 2. Synchronisation Supabase avec jointure client
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, client:clients(*)')
        .eq('user_id', userId)
        .order('pickup_datetime', { ascending: false });

      if (!error && data) {
        set({ bookings: data as Booking[], isLoading: false });
        await localStorage.setItem(localStorage.keys.BOOKINGS, data);
      }
    } catch {
      set({ isLoading: false });
    }
  },

  createBooking: async (userId, data) => {
    set({ isCreating: true });

    // Horodatage réel et immuable de réservation (Interdiction légale d'antidater)
    const nowIso = new Date().toISOString();

    // Numérotation séquentielle continue (ex: BC-2026-0001)
    const bookingNumber = await numberingService.getNextNumber(userId, 'booking');

    const newBooking: Booking = {
      id: 'local_res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      client_id: data.client_id,
      booking_number: bookingNumber,
      reservation_datetime: nowIso,
      pickup_datetime: data.pickup_datetime,
      pickup_address: data.pickup_address,
      dropoff_address: data.dropoff_address,
      agreed_price: data.agreed_price,
      passenger_count: data.passenger_count || 1,
      flight_train_number: data.flight_train_number || '',
      notes: data.notes || '',
      status: data.status || 'confirmed',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const updatedList = [newBooking, ...get().bookings];
    set({ bookings: updatedList });
    await localStorage.setItem(localStorage.keys.BOOKINGS, updatedList);

    // Synchronisation Supabase
    try {
      const { data: inserted, error } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          client_id: newBooking.client_id,
          booking_number: newBooking.booking_number,
          reservation_datetime: newBooking.reservation_datetime,
          pickup_datetime: newBooking.pickup_datetime,
          pickup_address: newBooking.pickup_address,
          dropoff_address: newBooking.dropoff_address,
          agreed_price: newBooking.agreed_price,
          passenger_count: newBooking.passenger_count,
          flight_train_number: newBooking.flight_train_number,
          notes: newBooking.notes,
          status: newBooking.status,
        })
        .select('*, client:clients(*)')
        .single();

      if (!error && inserted) {
        const synced = get().bookings.map((b) => (b.id === newBooking.id ? (inserted as Booking) : b));
        set({ bookings: synced, isCreating: false });
        await localStorage.setItem(localStorage.keys.BOOKINGS, synced);
        return inserted as Booking;
      }
    } catch {
      // Conserver la version locale
    }

    set({ isCreating: false });
    return newBooking;
  },

  updateBookingStatus: async (id, status) => {
    const isCompleted = status === 'completed';
    const nowIso = new Date().toISOString();

    const updatedList = get().bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            status,
            completed_at: isCompleted ? nowIso : b.completed_at,
            updated_at: nowIso,
          }
        : b
    );

    set({ bookings: updatedList });
    await localStorage.setItem(localStorage.keys.BOOKINGS, updatedList);

    try {
      await supabase
        .from('bookings')
        .update({
          status,
          completed_at: isCompleted ? nowIso : null,
          updated_at: nowIso,
        })
        .eq('id', id);
    } catch {
      // Ignorer si offline
    }

    return true;
  },

  getBookingById: (id: string) => {
    return get().bookings.find((b) => b.id === id);
  },
}));
