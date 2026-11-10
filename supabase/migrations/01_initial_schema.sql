-- ==============================================================================
-- MON VTC GESTION - SCHÉMA DE BASE DE DONNÉES PROFESSIONNEL (FRANCE)
-- Conforme :
--   - Arrêté du 6 août 2025 relatif au justificatif de réservation préalable VTC
--   - Code des transports (art. L. 3122-1 et suivants)
--   - Régime Micro-Entrepreneur & Franchise en base de TVA (Art. 293 B du CGI)
--   - Loi n° 2022-172 du 14 février 2022 (Statut Entrepreneur Individuel - mention EI)
--   - Obligation d'inaltérabilité et de conservation des pièces comptables
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLE DES PROFILS / PARAMÈTRES EXPLOITANT VTC
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    is_ei BOOLEAN NOT NULL DEFAULT TRUE, -- Obligation légale : mention EI / Entrepreneur Individuel
    commercial_name TEXT,
    siren VARCHAR(9) NOT NULL,
    siret VARCHAR(14) NOT NULL,
    revtc_number VARCHAR(30) NOT NULL, -- Numéro d'inscription au registre des VTC (REVTC)
    address TEXT NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    city TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email TEXT NOT NULL,
    rib_iban VARCHAR(34),
    rib_bic VARCHAR(11),
    bank_name TEXT,
    tva_regime TEXT NOT NULL DEFAULT 'franchise', -- 'franchise' ou 'reel'
    tva_mention TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293 B du CGI',
    payment_terms TEXT NOT NULL DEFAULT 'Règlement à réception de facture',
    late_penalty_rate TEXT NOT NULL DEFAULT 'Taux d''intérêt légal en vigueur majoré de 10 points',
    recovery_fee DECIMAL(10, 2) NOT NULL DEFAULT 40.00, -- Indemnité forfaitaire légale de recouvrement (art. D. 441-5 C. com.)
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLE DES CLIENTS (PARTICULIERS & ENTREPRISES)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('particulier', 'entreprise')),
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    contact_name TEXT,
    siren_siret VARCHAR(14),
    phone VARCHAR(20) NOT NULL,
    email TEXT,
    billing_address TEXT,
    payment_terms TEXT DEFAULT 'Immédiat',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);

-- 4. TABLE DES RÉSERVATIONS ET JUSTIFICATIFS PRÉALABLES VTC
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    booking_number TEXT NOT NULL, -- Ex: RES-2026-0001
    reservation_datetime TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- Date et heure réelles de la réservation (immuable)
    pickup_datetime TIMESTAMPTZ NOT NULL, -- Date et heure souhaitées de prise en charge
    pickup_address TEXT NOT NULL,
    dropoff_address TEXT NOT NULL,
    agreed_price DECIMAL(10, 2) NOT NULL,
    passenger_count INT NOT NULL DEFAULT 1,
    flight_train_number TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_booking_number UNIQUE (user_id, booking_number)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_datetime ON public.bookings(pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- 5. TABLE DES FACTURES ET AVOIRS (IMMUTABILITÉ ET SÉQUENCE SANS TROU)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL, -- Ex: FAC-2026-0001 ou AV-2026-0001
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_credit_note BOOLEAN NOT NULL DEFAULT FALSE,
    original_invoice_id UUID REFERENCES public.invoices(id),
    total_ht DECIMAL(10, 2) NOT NULL,
    total_tva DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_ttc DECIMAL(10, 2) NOT NULL,
    tva_mention TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293 B du CGI',
    late_penalty_mention TEXT,
    recovery_fee_mention TEXT,
    payment_terms TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'paid', 'cancelled')),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_invoice_number UNIQUE (user_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date);

-- 6. LIGNES DE FACTURES
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLE DES PAIEMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('especes', 'cb', 'virement', 'lien', 'autre')),
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- 8. TABLE DU LIVRE DES RECETTES (OBLIGATION LÉGALE MICRO-ENTREPRISE ART. L. 123-28 C. COM)
CREATE TABLE IF NOT EXISTS public.receipt_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    entry_number INT NOT NULL,
    entry_date DATE NOT NULL,
    client_name TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    service_nature TEXT NOT NULL DEFAULT 'Transport de personnes VTC',
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_receipt_entry UNIQUE (user_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_receipt_book_user_id ON public.receipt_book(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_book_date ON public.receipt_book(entry_date);

-- 9. COMPTEURS SÉQUENTIELS ATOMIQUES (GARANTIE D'ABSENCE DE TROU CHRONOLOGIQUE)
CREATE TABLE IF NOT EXISTS public.document_counters (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL, -- 'booking', 'invoice', 'credit_note', 'receipt'
    year INT NOT NULL,
    current_number INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, doc_type, year)
);
