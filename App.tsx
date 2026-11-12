// ==============================================================================
// APPLICATION PRINCIPALE - MON VTC GESTION
// Routeur réactif & Navigation fluide Local-First
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import { colors } from './src/constants/theme';
import { useAuthStore } from './src/stores/useAuthStore';
import { useProfileStore } from './src/stores/useProfileStore';
import { useBookingStore } from './src/stores/useBookingStore';
import { useClientStore } from './src/stores/useClientStore';
import { useInvoiceStore } from './src/stores/useInvoiceStore';
import { usePaymentStore } from './src/stores/usePaymentStore';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { DashboardScreen } from './src/screens/dashboard/DashboardScreen';
import { ProfileSettingsScreen } from './src/screens/settings/ProfileSettingsScreen';
import { QuickBookingScreen } from './src/screens/bookings/QuickBookingScreen';
import { BookingDetailScreen } from './src/screens/bookings/BookingDetailScreen';
import { ClientsListScreen } from './src/screens/clients/ClientsListScreen';
import { ConvertBookingToInvoiceScreen } from './src/screens/invoices/ConvertBookingToInvoiceScreen';
import { InvoiceDetailScreen } from './src/screens/invoices/InvoiceDetailScreen';
import { InvoicesListScreen } from './src/screens/invoices/InvoicesListScreen';
import { ReceiptBookScreen } from './src/screens/accounting/ReceiptBookScreen';
import { Booking, Client, Invoice, InvoiceItem } from './src/types/models';

type Screen =
  | 'dashboard'
  | 'settings'
  | 'quick_booking'
  | 'edit_booking'
  | 'booking_detail'
  | 'convert_booking_to_invoice'
  | 'invoice_detail'
  | 'invoices_list'
  | 'receipt_book'
  | 'clients_list';

export default function App() {
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore();
  const { loadProfile } = useProfileStore();
  const { loadBookings } = useBookingStore();
  const { loadClients, getClientById } = useClientStore();
  const { loadInvoices } = useInvoiceStore();
  const { loadPayments } = usePaymentStore();

  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  const userId = user?.id || 'demo-user-1';

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile(userId);
      loadBookings(userId);
      loadClients(userId);
      loadInvoices(userId);
      loadPayments(userId);
    }
  }, [isAuthenticated, userId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Navigation après création ou modification d'un bon de commande
  const handleBookingCreated = (booking: Booking, client: Client) => {
    setSelectedBooking(booking);
    setBookingToEdit(null);
    setSelectedClient(client);
    setCurrentScreen('booking_detail');
  };

  // Modification d'un bon de commande
  const handleEditBooking = (booking: Booking, client: Client) => {
    setBookingToEdit(booking);
    setSelectedClient(client);
    setCurrentScreen('edit_booking');
  };

  // Sélection d'une réservation depuis le tableau de bord
  const handleSelectBookingFromDashboard = (booking: Booking) => {
    const client = getClientById(booking.client_id) || {
      id: booking.client_id,
      user_id: booking.user_id,
      type: 'particulier',
      first_name: 'Client',
      last_name: '',
      phone: '06 00 00 00 00',
      created_at: '',
      updated_at: '',
    };
    setSelectedBooking(booking);
    setSelectedClient(client);
    setCurrentScreen('booking_detail');
  };

  // Navigation vers la conversion en facture
  const handleStartInvoiceConversion = (booking: Booking, client: Client) => {
    setSelectedBooking(booking);
    setSelectedClient(client);
    setCurrentScreen('convert_booking_to_invoice');
  };

  // Navigation après émission de la facture
  const handleInvoiceCreated = (invoice: Invoice, items: InvoiceItem[]) => {
    setSelectedInvoice(invoice);
    setCurrentScreen('invoice_detail');
  };

  // Sélection d'une facture depuis la liste des factures
  const handleSelectInvoice = (invoice: Invoice, client: Client) => {
    setSelectedInvoice(invoice);
    setSelectedClient(client);
    setCurrentScreen('invoice_detail');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {!isAuthenticated ? (
        <LoginScreen onSuccess={() => setCurrentScreen('dashboard')} />
      ) : (
        <View style={styles.container}>
          {currentScreen === 'dashboard' && (
            <DashboardScreen
              onNavigateToBookingForm={() => setCurrentScreen('quick_booking')}
              onNavigateToSettings={() => setCurrentScreen('settings')}
              onNavigateToClients={() => setCurrentScreen('clients_list')}
              onNavigateToInvoices={() => setCurrentScreen('invoices_list')}
              onNavigateToReceiptBook={() => setCurrentScreen('receipt_book')}
              onSelectBooking={handleSelectBookingFromDashboard}
            />
          )}

          {currentScreen === 'settings' && (
            <ProfileSettingsScreen onBack={() => setCurrentScreen('dashboard')} />
          )}

          {currentScreen === 'quick_booking' && (
            <QuickBookingScreen
              onBack={() => setCurrentScreen('dashboard')}
              onBookingCreated={handleBookingCreated}
            />
          )}

          {currentScreen === 'edit_booking' && bookingToEdit && (
            <QuickBookingScreen
              bookingToEdit={bookingToEdit}
              clientToEdit={selectedClient || undefined}
              onBack={() => setCurrentScreen('booking_detail')}
              onBookingCreated={handleBookingCreated}
            />
          )}

          {currentScreen === 'booking_detail' && selectedBooking && selectedClient && (
            <BookingDetailScreen
              booking={selectedBooking}
              client={selectedClient}
              onBack={() => setCurrentScreen('dashboard')}
              onEditBooking={handleEditBooking}
              onConvertToInvoice={handleStartInvoiceConversion}
            />
          )}

          {currentScreen === 'convert_booking_to_invoice' && selectedBooking && selectedClient && (
            <ConvertBookingToInvoiceScreen
              booking={selectedBooking}
              client={selectedClient}
              onBack={() => setCurrentScreen('booking_detail')}
              onInvoiceCreated={handleInvoiceCreated}
            />
          )}

          {currentScreen === 'invoice_detail' && selectedInvoice && selectedClient && (
            <InvoiceDetailScreen
              invoice={selectedInvoice}
              client={selectedClient}
              onBack={() => setCurrentScreen('invoices_list')}
              onInvoiceUpdated={() => {
                if (user?.id) {
                  loadInvoices(user.id);
                  loadPayments(user.id);
                }
              }}
            />
          )}

          {currentScreen === 'invoices_list' && (
            <InvoicesListScreen
              onBack={() => setCurrentScreen('dashboard')}
              onSelectInvoice={handleSelectInvoice}
            />
          )}

          {currentScreen === 'receipt_book' && (
            <ReceiptBookScreen onBack={() => setCurrentScreen('dashboard')} />
          )}

          {currentScreen === 'clients_list' && (
            <ClientsListScreen onBack={() => setCurrentScreen('dashboard')} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
