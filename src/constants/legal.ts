// ==============================================================================
// MENTIONS LÉGALES ET RÉGLEMENTATION VTC / MICRO-ENTREPRISE (FRANCE)
// ==============================================================================

export const LEGAL_CONSTANTS = {
  // Statut Entrepreneur Individuel (Loi du 14 février 2022)
  EI_PREFIX: 'Entrepreneur individuel',
  EI_SUFFIX: 'EI',

  // Franchise en base de TVA (Art. 293 B du Code Général des Impôts)
  TVA_FRANCHISE_MENTION: 'TVA non applicable, art. 293 B du CGI',

  // Mentions B2B obligatoires (Code de Commerce)
  LATE_PENALTIES:
    'En cas de retard de paiement, pénalité de 3 fois le taux d’intérêt légal ainsi qu’une indemnité forfaitaire de 40 € pour frais de recouvrement (art. L. 441-10 et D. 441-5 du C. com.).',
  RECOVERY_FEE_AMOUNT: 40.0,

  // Délais de conservation légale
  ACCOUNTING_STORAGE_YEARS: 10, // Art. L. 123-22 du C. com.
  VTC_JUSTIFICATIF_STORAGE_YEARS: 1, // Arrêté relatif à la réservation préalable VTC

  // Titre officiel du justificatif VTC
  VTC_JUSTIFICATIF_TITLE: 'JUSTIFICATIF DE RÉSERVATION PRÉALABLE VTC',
  VTC_ORDER_FORM_TITLE: 'BON DE COMMANDE VTC',
  VTC_INVOICE_TITLE: 'FACTURE',
  VTC_CREDIT_NOTE_TITLE: 'FACTURE D’AVOIR',

  // Seuils indicatifs Micro-Entrepreneur France (Prestation de services BNC/BIC)
  MICRO_SERVICE_THRESHOLD_2026: 77700, // Seuil franchise de TVA prestations ~36 800 € / plafond micro ~77 700 €
  VAT_FRANCHISE_THRESHOLD_SERVICES: 36800,
  VAT_FRANCHISE_THRESHOLD_TOLERANCE: 39100,
};
