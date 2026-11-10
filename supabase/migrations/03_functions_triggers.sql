-- ==============================================================================
-- MON VTC GESTION - FONCTIONS ET TRIGGERS D'INTÉGRITÉ COMPTABLE & VTC
-- ==============================================================================

-- 1. FONCTION ATOMIQUE DE GÉNÉRATION DU NUMÉRO SÉQUENTIEL SANS RUPTURE
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_user_id UUID,
    p_doc_type TEXT,
    p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_val INT;
    v_prefix TEXT;
    v_result TEXT;
BEGIN
    -- Préfixes normalisés
    IF p_doc_type = 'booking' THEN
        v_prefix := 'BC';
    ELSIF p_doc_type = 'invoice' THEN
        v_prefix := 'FAC';
    ELSIF p_doc_type = 'credit_note' THEN
        v_prefix := 'AV';
    ELSIF p_doc_type = 'receipt' THEN
        v_prefix := 'REC';
    ELSE
        RAISE EXCEPTION 'Type de document inconnu: %', p_doc_type;
    END IF;

    -- Incrément atomique avec verrouillage de ligne (anti-concurrence)
    INSERT INTO public.document_counters (user_id, doc_type, year, current_number)
    VALUES (p_user_id, p_doc_type, p_year, 1)
    ON CONFLICT (user_id, doc_type, year)
    DO UPDATE SET current_number = public.document_counters.current_number + 1
    RETURNING current_number INTO v_next_val;

    -- Formatage standard: TYPE-ANNEE-NUMERO (ex: FAC-2026-0001)
    v_result := v_prefix || '-' || p_year::TEXT || '-' || LPAD(v_next_val::TEXT, 4, '0');
    RETURN v_result;
END;
$$;

-- 2. VÉRIFICATION D'IMMUTABILITÉ DES FACTURES VALIDÉES (RÈGLE FISCALE FRANÇAISE)
CREATE OR REPLACE FUNCTION public.check_invoice_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Interdire la suppression d'une facture finalisée ou payée
    IF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('finalized', 'paid') THEN
            RAISE EXCEPTION 'Suppression interdite : la facture % est finalisée et scellée conformément à la législation fiscale française. Vous devez émettre une facture d''avoir.', OLD.invoice_number;
        END IF;
        RETURN OLD;
    END IF;

    -- Interdire la modification des données clés d'une facture déjà finalisée
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('finalized', 'paid') THEN
            IF NEW.invoice_number <> OLD.invoice_number
               OR NEW.total_ttc <> OLD.total_ttc
               OR NEW.total_ht <> OLD.total_ht
               OR NEW.invoice_date <> OLD.invoice_date
               OR NEW.client_id <> OLD.client_id THEN
                RAISE EXCEPTION 'Modification interdite : les éléments comptables de la facture % ne peuvent plus être modifiés après finalisation.', OLD.invoice_number;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_immutability ON public.invoices;
CREATE TRIGGER trg_invoice_immutability
BEFORE UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.check_invoice_immutability();

-- 3. ALIMENTATION AUTOMATIQUE DU LIVRE DES RECETTES LORS DE L'ENCAISSEMENT
CREATE OR REPLACE FUNCTION public.sync_payment_to_receipt_book()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_client RECORD;
    v_entry_num INT;
    v_client_display TEXT;
BEGIN
    -- Récupération de la facture associée
    SELECT * INTO v_invoice FROM public.invoices WHERE id = NEW.invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Facture associée non trouvée pour le paiement %', NEW.id;
    END IF;

    -- Récupération des informations client
    SELECT * INTO v_client FROM public.clients WHERE id = v_invoice.client_id;
    IF v_client.type = 'entreprise' THEN
        v_client_display := COALESCE(v_client.company_name, 'Entreprise');
    ELSE
        v_client_display := COALESCE(v_client.last_name || ' ' || COALESCE(v_client.first_name, ''), 'Particulier');
    END IF;

    -- Obtention du numéro séquentiel du livre des recettes pour l'année
    INSERT INTO public.document_counters (user_id, doc_type, year, current_number)
    VALUES (NEW.user_id, 'receipt', EXTRACT(YEAR FROM NEW.payment_date)::INT, 1)
    ON CONFLICT (user_id, doc_type, year)
    DO UPDATE SET current_number = public.document_counters.current_number + 1
    RETURNING current_number INTO v_entry_num;

    -- Insertion chronologique dans le livre des recettes
    INSERT INTO public.receipt_book (
        user_id,
        payment_id,
        entry_number,
        entry_date,
        client_name,
        invoice_number,
        service_nature,
        amount,
        payment_method
    ) VALUES (
        NEW.user_id,
        NEW.id,
        v_entry_num,
        NEW.payment_date,
        v_client_display,
        v_invoice.invoice_number,
        'Transport de personnes VTC',
        NEW.amount,
        NEW.payment_method
    );

    -- Mise à jour automatique du statut de la facture si payée en totalité
    UPDATE public.invoices
    SET status = 'paid', updated_at = now()
    WHERE id = NEW.invoice_id
      AND (
          SELECT COALESCE(SUM(amount), 0)
          FROM public.payments
          WHERE invoice_id = NEW.invoice_id
      ) >= total_ttc;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_to_receipt_book ON public.payments;
CREATE TRIGGER trg_payment_to_receipt_book
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_to_receipt_book();
