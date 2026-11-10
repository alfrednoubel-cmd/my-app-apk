// ==============================================================================
// GESTION DU REGISTRE DES FACTURES & AVOIRS
// Suivi de l'encaissement et des créances clients VTC
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
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Invoice, Client } from '../../types/models';
import { useAuthStore } from '../../stores/useAuthStore';
import { useInvoiceStore } from '../../stores/useInvoiceStore';
import { useClientStore } from '../../stores/useClientStore';
import { usePaymentStore } from '../../stores/usePaymentStore';

interface InvoicesListScreenProps {
  onBack: () => void;
  onSelectInvoice: (invoice: Invoice, client: Client) => void;
}

export const InvoicesListScreen: React.FC<InvoicesListScreenProps> = ({
  onBack,
  onSelectInvoice,
}) => {
  const { user } = useAuthStore();
  const { invoices, loadInvoices, isLoading } = useInvoiceStore();
  const { getClientById, loadClients } = useClientStore();
  const { getTotalPaidForInvoice, loadPayments } = usePaymentStore();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid' | 'credit'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id || 'demo-user-1';

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([
      loadInvoices(userId),
      loadClients(userId),
      loadPayments(userId),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
  }, [userId]);

  // Calcul des statistiques globales
  const totalBilled = invoices
    .filter((i) => !i.is_credit_note && i.status !== 'cancelled')
    .reduce((sum, i) => sum + Number(i.total_ttc), 0);

  const totalPaidGlobal = invoices
    .filter((i) => !i.is_credit_note && i.status !== 'cancelled')
    .reduce((sum, i) => sum + getTotalPaidForInvoice(i.id), 0);

  const totalPending = Math.max(0, totalBilled - totalPaidGlobal);

  // Filtrage
  const filteredInvoices = invoices.filter((inv) => {
    // Filtre onglet
    if (activeTab === 'credit' && !inv.is_credit_note) return false;
    if (activeTab !== 'credit' && inv.is_credit_note) return false;

    const paid = getTotalPaidForInvoice(inv.id);
    const isPaid = inv.status === 'paid' || paid >= Number(inv.total_ttc);

    if (activeTab === 'pending' && (isPaid || inv.status === 'cancelled')) return false;
    if (activeTab === 'paid' && !isPaid) return false;

    // Filtre recherche
    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      const numMatch = inv.invoice_number.toLowerCase().includes(q);
      const client = getClientById(inv.client_id);
      const clientName = client
        ? client.type === 'entreprise'
          ? client.company_name || ''
          : `${client.last_name} ${client.first_name || ''}`
        : '';
      return numMatch || clientName.toLowerCase().includes(q);
    }

    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Factures & Avoirs"
        subtitle={`${invoices.length} document(s) émis`}
        onBack={onBack}
      />

      {/* BANDEAU STATISTIQUES FACTURATION */}
      <View style={styles.statsBar}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Total Facturé</Text>
          <Text style={styles.statValue}>{totalBilled.toFixed(0)} €</Text>
        </View>
        <View style={[styles.statCol, styles.statBorder]}>
          <Text style={styles.statLabel}>Encaissé</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {totalPaidGlobal.toFixed(0)} €
          </Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>En attente</Text>
          <Text
            style={[
              styles.statValue,
              { color: totalPending > 0 ? colors.danger : colors.text },
            ]}
          >
            {totalPending.toFixed(0)} €
          </Text>
        </View>
      </View>

      {/* RECHERCHE ET ONGLETS */}
      <View style={styles.searchContainer}>
        <Input
          label=""
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher par N° facture ou nom client..."
          prefix="🔍"
          containerStyle={{ marginBottom: spacing.sm }}
        />

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'all' && styles.tabBtnTextActive]}
            >
              Toutes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'pending' && styles.tabBtnTextActive,
              ]}
            >
              En attente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'paid' && styles.tabBtnActive]}
            onPress={() => setActiveTab('paid')}
          >
            <Text
              style={[styles.tabBtnText, activeTab === 'paid' && styles.tabBtnTextActive]}
            >
              Payées
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'credit' && styles.tabBtnActive]}
            onPress={() => setActiveTab('credit')}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'credit' && styles.tabBtnTextActive,
              ]}
            >
              Avoirs
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LISTE DES FACTURES */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={colors.primary}
          />
        }
      >
        {filteredInvoices.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📑</Text>
            <Text style={styles.emptyTitle}>Aucune facture trouvée</Text>
            <Text style={styles.emptySub}>
              Convertissez vos réservations terminées en factures en un seul clic.
            </Text>
          </Card>
        ) : (
          filteredInvoices.map((inv) => {
            const client = getClientById(inv.client_id) || {
              id: inv.client_id,
              user_id: inv.user_id,
              type: 'particulier',
              last_name: 'Client',
              phone: '',
              created_at: '',
              updated_at: '',
            };

            const paid = getTotalPaidForInvoice(inv.id);
            const isFullyPaid = inv.status === 'paid' || paid >= Number(inv.total_ttc);
            const clientDisplayName =
              client.type === 'entreprise'
                ? client.company_name
                : `${client.last_name} ${client.first_name || ''}`;

            return (
              <Card
                key={inv.id}
                style={styles.invoiceCard}
                onPress={() => onSelectInvoice(inv, client)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.invoiceNumber}>{inv.invoice_number}</Text>
                    <Text style={styles.invoiceDate}>
                      {new Date(inv.invoice_date).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <Badge
                    label={
                      inv.is_credit_note
                        ? 'Avoir'
                        : inv.status === 'cancelled'
                        ? 'Annulée'
                        : isFullyPaid
                        ? 'Payée'
                        : 'En attente'
                    }
                    variant={
                      isFullyPaid
                        ? 'completed'
                        : inv.status === 'cancelled'
                        ? 'cancelled'
                        : 'warning'
                    }
                  />
                </View>

                <Text style={styles.clientText} numberOfLines={1}>
                  {client.type === 'entreprise' ? '🏢' : '👤'} {clientDisplayName}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.tvaNotice}>TVA : 0 € (Art. 293 B)</Text>
                  <Text style={styles.amountTotal}>
                    {Number(inv.total_ttc).toFixed(2)} €
                  </Text>
                </View>
              </Card>
            );
          })
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderLight,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  invoiceCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  invoiceDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  clientText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginVertical: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tvaNotice: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  amountTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.gold,
  },
});
