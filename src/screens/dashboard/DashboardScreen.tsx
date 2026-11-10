// ==============================================================================
// TABLEAU DE BORD COMMERCIAL & SUIVI FINANCIER VTC
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useProfileStore } from '../../stores/useProfileStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { localStorage } from '../../services/storage';
import { Booking, Invoice, Payment, Client, ReceiptBookEntry } from '../../types/models';
import { alertsService, SystemAlert } from '../../services/alertsService';

interface DashboardScreenProps {
  onNavigateToBookingForm: () => void;
  onNavigateToSettings: () => void;
  onNavigateToInvoices?: () => void;
  onNavigateToClients?: () => void;
  onNavigateToReceiptBook?: () => void;
  onSelectBooking?: (booking: Booking) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateToBookingForm,
  onNavigateToSettings,
  onNavigateToInvoices,
  onNavigateToClients,
  onNavigateToReceiptBook,
  onSelectBooking,
}) => {
  const { user, signOut } = useAuthStore();
  const { profile, loadProfile, getLegalHeader } = useProfileStore();

  const [refreshing, setRefreshing] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [yearlyRevenue, setYearlyRevenue] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [unpaidInvoicesCount, setUnpaidInvoicesCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await loadProfile(user.id);

    // Charger les réservations en cache local
    const bookings = (await localStorage.getItem<Booking[]>(localStorage.keys.BOOKINGS)) || [];
    const invoices = (await localStorage.getItem<Invoice[]>(localStorage.keys.INVOICES)) || [];
    const payments = (await localStorage.getItem<Payment[]>(localStorage.keys.PAYMENTS)) || [];
    const receipts =
      (await localStorage.getItem<ReceiptBookEntry[]>('@mon_vtc_receipt_book')) || [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Calcul des encaissements réels (Livre des recettes)
    let mRev = 0;
    let yRev = 0;
    for (const p of payments) {
      const pDate = new Date(p.payment_date);
      if (pDate.getFullYear() === currentYear) {
        yRev += Number(p.amount);
        if (pDate.getMonth() === currentMonth) {
          mRev += Number(p.amount);
        }
      }
    }
    setMonthlyRevenue(mRev);
    setYearlyRevenue(yRev);

    // Calcul des alertes intelligentes
    const currentAlerts = alertsService.getAlerts(invoices, bookings, receipts);
    setAlerts(currentAlerts);

    // Calcul des courses
    let upcoming = 0;
    let completed = 0;
    for (const b of bookings) {
      if (b.status === 'confirmed') upcoming++;
      if (b.status === 'completed') completed++;
    }
    setUpcomingCount(upcoming);
    setCompletedCount(completed);
    setRecentBookings(bookings.slice(0, 3));

    // Factures impayées
    let unpaid = 0;
    let pending = 0;
    for (const inv of invoices) {
      if (inv.status === 'finalized' && !inv.is_credit_note) {
        unpaid++;
        pending += Number(inv.total_ttc);
      }
    }
    setUnpaidInvoicesCount(unpaid);
    setPendingAmount(pending);

    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  return (
    <View style={styles.container}>
      {/* HEADER SUPÉRIEUR */}
      <View style={styles.topBar}>
        <View style={styles.profileBadge}>
          <Text style={styles.profileName}>{getLegalHeader()}</Text>
          <Text style={styles.revtcText}>
            REVTC : {profile?.revtc_number || 'Non renseigné'}
          </Text>
        </View>
        <TouchableOpacity onPress={onNavigateToSettings} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadDashboardData}
            tintColor={colors.primary}
          />
        }
      >
        {/* BANDEAU D'ALERTES INTELLIGENTES */}
        {alerts.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            {alerts.map((al) => (
              <TouchableOpacity
                key={al.id}
                activeOpacity={0.8}
                onPress={() => {
                  if (al.actionRoute === 'invoices_list' && onNavigateToInvoices) {
                    onNavigateToInvoices();
                  }
                }}
                style={[
                  styles.alertCard,
                  al.type === 'danger'
                    ? styles.alertDanger
                    : al.type === 'warning'
                    ? styles.alertWarning
                    : styles.alertInfo,
                ]}
              >
                <Text style={styles.alertIcon}>
                  {al.type === 'danger' ? '⚠️' : al.type === 'warning' ? '🔔' : 'ℹ️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{al.title}</Text>
                  <Text style={styles.alertDesc}>{al.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CARTOUCHE CHIFFRE D'AFFAIRES ENCAISSÉ (RÈGLE MICRO-ENTREPRISE) */}
        <Card
          style={styles.revenueCard}
          variant="goldBorder"
          onPress={onNavigateToReceiptBook}
        >
          <View style={styles.revenueHeader}>
            <Text style={styles.revenueTitle}>CHIFFRE D'AFFAIRES ENCAISSÉ (MOIS)</Text>
            <Badge label="Livre des recettes ➔" variant="warning" />
          </View>
          <Text style={styles.revenueAmount}>
            {monthlyRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </Text>
          <View style={styles.revenueFooter}>
            <Text style={styles.yearRevenueText}>
              Cumul annuel :{' '}
              <Text style={styles.yearRevenueHighlight}>
                {yearlyRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </Text>
            </Text>
            <Text style={styles.taxExemptBadge}>Franchise TVA Art. 293 B</Text>
          </View>
        </Card>

        {/* RACCOURCIS D'ACTION RAPIDE (ACCESSIBILITÉ UNE MAIN) */}
        <Text style={styles.sectionTitle}>Actions Rapides</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={onNavigateToBookingForm}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>⚡</Text>
            <Text style={styles.actionLabel}>Bon express</Text>
            <Text style={styles.actionSub}>&lt; 30 secondes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={onNavigateToInvoices}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionLabel}>Factures</Text>
            <Text style={styles.actionSub}>Paiements & Avoirs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={onNavigateToClients}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionLabel}>Clients</Text>
            <Text style={styles.actionSub}>Répertoire</Text>
          </TouchableOpacity>
        </View>

        {/* INDICATEURS D'ACTIVITÉ */}
        <Text style={styles.sectionTitle}>Activité & Facturation</Text>
        <View style={styles.grid2}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Réservations à venir</Text>
            <Text style={styles.statNumber}>{upcomingCount}</Text>
            <Text style={styles.statHelp}>Courses planifiées</Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Courses effectuées</Text>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {completedCount}
            </Text>
            <Text style={styles.statHelp}>Clôturées avec succès</Text>
          </Card>
        </View>

        <View style={styles.grid2}>
          <Card style={styles.statCard} onPress={onNavigateToInvoices}>
            <Text style={styles.statLabel}>Factures impayées</Text>
            <Text style={[styles.statNumber, { color: unpaidInvoicesCount > 0 ? colors.danger : colors.text }]}>
              {unpaidInvoicesCount}
            </Text>
            <Text style={styles.statHelp}>
              {pendingAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € en attente
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Seuil TVA Prestation</Text>
            <Text style={[styles.statNumber, { color: colors.gold }]}>
              {Math.max(0, 36800 - yearlyRevenue).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
            </Text>
            <Text style={styles.statHelp}>Marge avant seuil</Text>
          </Card>
        </View>

        {/* DERNIÈRES RÉSERVATIONS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Dernières réservations</Text>
          <TouchableOpacity onPress={onNavigateToBookingForm}>
            <Text style={styles.seeAllText}>+ Créer</Text>
          </TouchableOpacity>
        </View>

        {recentBookings.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Aucune course en attente</Text>
            <Text style={styles.emptyDesc}>
              Créez votre premier bon de commande réglementaire en moins de 30 secondes.
            </Text>
            <Button
              title="Créer un bon de commande"
              onPress={onNavigateToBookingForm}
              size="sm"
              style={styles.emptyBtn}
            />
          </Card>
        ) : (
          recentBookings.map((b) => (
            <Card
              key={b.id}
              style={styles.bookingItem}
              onPress={() => (onSelectBooking ? onSelectBooking(b) : onNavigateToBookingForm())}
            >
              <View style={styles.bookingRow}>
                <View>
                  <Text style={styles.bookingNumber}>{b.booking_number}</Text>
                  <Text style={styles.bookingDate}>
                    {new Date(b.pickup_datetime).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Badge
                  label={b.status === 'confirmed' ? 'Confirmée' : 'Terminée'}
                  variant={b.status === 'confirmed' ? 'confirmed' : 'completed'}
                />
              </View>
              <Text style={styles.bookingAddress} numberOfLines={1}>
                📍 {b.pickup_address} → {b.dropoff_address}
              </Text>
              <View style={styles.bookingFooter}>
                <Text style={styles.bookingPrice}>{Number(b.agreed_price).toFixed(2)} €</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  profileBadge: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  revtcText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingsBtn: {
    padding: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
  },
  settingsIcon: {
    fontSize: 18,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  alertDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: colors.danger,
  },
  alertWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: colors.warning,
  },
  alertInfo: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderColor: colors.primary,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  alertDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  revenueCard: {
    marginBottom: spacing.lg,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  revenueTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  revenueAmount: {
    ...typography.amountLarge,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  revenueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  yearRevenueText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  yearRevenueHighlight: {
    color: colors.gold,
    fontWeight: '700',
  },
  taxExemptBadge: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionSecondary: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  actionSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  grid2: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginVertical: 4,
  },
  statHelp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xs,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  emptyBtn: {
    marginTop: spacing.xs,
  },
  bookingItem: {
    marginBottom: spacing.sm,
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bookingNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bookingDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bookingAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bookingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gold,
  },
});
