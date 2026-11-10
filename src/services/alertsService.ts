// ==============================================================================
// SYSTÈME D'ALERTES FISCALES, COMPTABLES & COMMERCIALES VTC
// Détection des retards de paiement, réservations à venir et seuils réglementaires
// ==============================================================================

import { Invoice, Booking, ReceiptBookEntry } from '../types/models';
import { LEGAL_CONSTANTS } from '../constants/legal';

export interface SystemAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  actionText?: string;
  actionRoute?: string;
}

export const alertsService = {
  getAlerts(
    invoices: Invoice[],
    bookings: Booking[],
    receipts: ReceiptBookEntry[]
  ): SystemAlert[] {
    const alerts: SystemAlert[] = [];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const currentYear = today.getFullYear();

    // 1. FACTURES ÉCHUES EN RETARD
    const overdueInvoices = invoices.filter(
      (inv) =>
        inv.status === 'finalized' &&
        !inv.is_credit_note &&
        inv.due_date < todayStr
    );

    if (overdueInvoices.length > 0) {
      const overdueTotal = overdueInvoices.reduce(
        (sum, inv) => sum + Number(inv.total_ttc),
        0
      );
      alerts.push({
        id: 'alert_overdue',
        type: 'danger',
        title: `${overdueInvoices.length} facture(s) en retard de paiement`,
        description: `Montant impayé : ${overdueTotal.toFixed(2)} €. Des pénalités de retard et 40 € de recouvrement sont applicables aux entreprises.`,
        actionText: 'Voir les factures',
        actionRoute: 'invoices_list',
      });
    }

    // 2. RÉSERVATIONS PRÉVUES AUJOURD'HUI
    const todayBookings = bookings.filter((b) => {
      if (b.status !== 'confirmed') return false;
      const bDate = b.pickup_datetime.slice(0, 10);
      return bDate === todayStr;
    });

    if (todayBookings.length > 0) {
      alerts.push({
        id: 'alert_today_rides',
        type: 'info',
        title: `${todayBookings.length} course(s) prévue(s) aujourd'hui`,
        description: `Consultez vos justificatifs préalables prêts pour contrôle en cas de besoin.`,
        actionText: 'Voir les courses',
      });
    }

    // 3. VÉRIFICATION DES SEUILS FISCAUX (FRANCHISE TVA & MICRO-ENTREPRISE)
    // Calcul du CA annuel encaissé réel
    const currentYearReceipts = receipts.filter((r) => {
      const year = new Date(r.entry_date).getFullYear();
      return year === currentYear;
    });

    const yearlyRevenue = currentYearReceipts.reduce(
      (sum, r) => sum + Number(r.amount),
      0
    );

    // Seuil Franchise de TVA (36 800 €)
    const tvaThreshold = LEGAL_CONSTANTS.VAT_FRANCHISE_THRESHOLD_SERVICES;
    if (yearlyRevenue >= tvaThreshold * 0.85) {
      const remainingBeforeTva = Math.max(0, tvaThreshold - yearlyRevenue);
      alerts.push({
        id: 'alert_tva_threshold',
        type: 'warning',
        title: 'Seuil Franchise de TVA proche',
        description: `CA encaissé : ${yearlyRevenue.toFixed(0)} € / ${tvaThreshold} €. Il vous reste ${remainingBeforeTva.toFixed(0)} € avant d'atteindre le seuil de franchise en base (Art. 293 B).`,
      });
    }

    // Seuil Régime Micro-Entrepreneur (77 700 €)
    const microThreshold = LEGAL_CONSTANTS.MICRO_SERVICE_THRESHOLD_2026;
    if (yearlyRevenue >= microThreshold * 0.85) {
      alerts.push({
        id: 'alert_micro_threshold',
        type: 'danger',
        title: 'Plafond Micro-Entreprise atteint ou proche',
        description: `CA encaissé : ${yearlyRevenue.toFixed(0)} € / ${microThreshold} €. Préparez la transition vers un régime réel avec votre expert-comptable.`,
      });
    }

    return alerts;
  },
};
