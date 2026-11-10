-- ==============================================================================
-- MON VTC GESTION - SÉCURITÉ & ROW LEVEL SECURITY (RLS)
-- Isolation stricte des données de chaque chauffeur VTC
-- ==============================================================================

-- 1. ACTIVER LE RLS SUR TOUTES LES TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

-- 2. POLITIQUES SUR PROFILES
CREATE POLICY "Les chauffeurs gèrent leur propre profil"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 3. POLITIQUES SUR CLIENTS
CREATE POLICY "Les chauffeurs gèrent leurs propres clients"
    ON public.clients
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. POLITIQUES SUR BOOKINGS (RÉSERVATIONS / BONS DE COMMANDE)
CREATE POLICY "Les chauffeurs gèrent leurs propres réservations"
    ON public.bookings
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 5. POLITIQUES SUR INVOICES (FACTURES)
CREATE POLICY "Les chauffeurs gèrent leurs propres factures"
    ON public.invoices
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 6. POLITIQUES SUR INVOICE_ITEMS
CREATE POLICY "Les chauffeurs gèrent les lignes de leurs factures"
    ON public.invoice_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE invoices.id = invoice_items.invoice_id
              AND invoices.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE invoices.id = invoice_items.invoice_id
              AND invoices.user_id = auth.uid()
        )
    );

-- 7. POLITIQUES SUR PAYMENTS
CREATE POLICY "Les chauffeurs gèrent leurs propres paiements"
    ON public.payments
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 8. POLITIQUES SUR RECEIPT_BOOK (LIVRE DES RECETTES)
CREATE POLICY "Les chauffeurs gèrent leur livre des recettes"
    ON public.receipt_book
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 9. POLITIQUES SUR DOCUMENT_COUNTERS
CREATE POLICY "Les chauffeurs gèrent leurs propres compteurs"
    ON public.document_counters
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
