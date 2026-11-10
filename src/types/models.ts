// ==============================================================================
// TYPES ET MODÈLES MÉTIER - MON VTC GESTION
// ==============================================================================

export type VatRegime = 'franchise' | 'reel';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  is_ei: boolean; // Obligation légale : mention EI / Entrepreneur Individuel
  commercial_name?: string;
  siren: string; // 9 chiffres
  siret: string; // 14 chiffres
  revtc_number: string; // Registre VTC (ex: EVTC075190001)
  address: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  rib_iban?: string;
  rib_bic?: string;
  bank_name?: string;
  tva_regime: VatRegime;
  tva_mention: string;
  payment_terms: string;
  late_penalty_rate: string;
  recovery_fee: number;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export type ClientType = 'particulier' | 'entreprise';

export interface Client {
  id: string;
  user_id: string;
  type: ClientType;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  contact_name?: string;
  siren_siret?: string;
  phone: string;
  email?: string;
  billing_address?: string;
  payment_terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  user_id: string;
  client_id: string;
  booking_number: string;
  reservation_datetime: string; // Horodatage immuable de réservation
  pickup_datetime: string; // Date et heure de prise en charge
  pickup_address: string;
  dropoff_address: string;
  agreed_price: number;
  passenger_count: number;
  flight_train_number?: string;
  notes?: string;
  status: BookingStatus;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Relations utiles pour l'UI
  client?: Client;
}

export type InvoiceStatus = 'draft' | 'finalized' | 'paid' | 'cancelled';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  booking_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  is_credit_note: boolean;
  original_invoice_id?: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  tva_mention: string;
  late_penalty_mention?: string;
  recovery_fee_mention?: string;
  payment_terms?: string;
  status: InvoiceStatus;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  client?: Client;
}

export type PaymentMethod = 'especes' | 'cb' | 'virement' | 'lien' | 'autre';

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
  created_at: string;
}

export interface ReceiptBookEntry {
  id: string;
  user_id: string;
  payment_id: string;
  entry_number: number;
  entry_date: string;
  client_name: string;
  invoice_number: string;
  service_nature: string;
  amount: number;
  payment_method: string;
  created_at: string;
}

export interface DashboardStats {
  monthlyRevenue: number;
  yearlyRevenue: number;
  completedRidesCount: number;
  upcomingBookingsCount: number;
  paidInvoicesCount: number;
  unpaidInvoicesCount: number;
  pendingPaymentsAmount: number;
}
