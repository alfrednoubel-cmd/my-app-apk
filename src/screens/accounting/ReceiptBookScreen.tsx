// ==============================================================================
// ÉCRAN DU LIVRE DES RECETTES MICRO-ENTREPRENEUR & DÉCLARATION URSSAF
// Conforme à l'obligation légale de tenue au jour le jour des encaissements
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { usePaymentStore } from '../../stores/usePaymentStore';
import { receiptBookExportService } from '../../services/receiptBookExportService';
import { ReceiptBookEntry } from '../../types/models';

interface ReceiptBookScreenProps {
  onBack: () => void;
}

type PeriodFilter = 'month' | 'quarter' | 'year';

export const ReceiptBookScreen: React.FC<ReceiptBookScreenProps> = ({ onBack }) => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { receiptBookEntries, loadPayments } = usePaymentStore();

  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [isExporting, setIsExporting] = useState(false);

  const userId = user?.id || 'demo-user-1';

  useEffect(() => {
    loadPayments(userId);
  }, [userId]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  // Filtrer les entrées selon la période sélectionnée
  const filteredEntries = receiptBookEntries.filter((entry) => {
    const d = new Date(entry.entry_date);
    if (d.getFullYear() !== currentYear) return false;

    if (period === 'month') {
      return d.getMonth() === currentMonth;
    }
    if (period === 'quarter') {
      const q = Math.floor(d.getMonth() / 3) + 1;
      return q === currentQuarter;
    }
    return true; // Année complète
  });

  // Calcul du Chiffre d'Affaires encaissé
  const totalRevenue = filteredEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  // Taux de cotisations sociales micro-entrepreneur prestation de services VTC (~21.2 %)
  const estimatedUrssafCotisations = totalRevenue * 0.212;

  const getPeriodLabel = () => {
    if (period === 'month') {
      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
      ];
      return `${monthNames[currentMonth]} ${currentYear}`;
    }
    if (period === 'quarter') {
      return `Trimestre T${currentQuarter} ${currentYear}`;
    }
    return `Année ${currentYear}`;
  };

  const handleExportCsv = async () => {
    if (!profile) return;
    setIsExporting(true);
    try {
      await receiptBookExportService.exportAndShareCsv(
        filteredEntries,
        profile,
        getPeriodLabel()
      );
    } catch (err: any) {
      Alert.alert('Erreur Export CSV', err.message || 'Impossible d’exporter le fichier.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!profile) return;
    setIsExporting(true);
    try {
      await receiptBookExportService.exportAndSharePdf(
        filteredEntries,
        profile,
        getPeriodLabel()
      );
    } catch (err: any) {
      Alert.alert('Erreur Export PDF', err.message || 'Impossible d’exporter le document.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Livre des Recettes"
        subtitle="Conformité fiscale & déclaration URSSAF"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* SELECTEUR DE PÉRIODE */}
        <View style={styles.periodTabs}>
          <TouchableOpacity
            style={[styles.periodTab, period === 'month' && styles.periodTabActive]}
            onPress={() => setPeriod('month')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'month' && styles.periodTabTextActive,
              ]}
            >
              Mois en cours
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'quarter' && styles.periodTabActive]}
            onPress={() => setPeriod('quarter')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'quarter' && styles.periodTabTextActive,
              ]}
            >
              Trimestre (T{currentQuarter})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodTab, period === 'year' && styles.periodTabActive]}
            onPress={() => setPeriod('year')}
          >
            <Text
              style={[
                styles.periodTabText,
                period === 'year' && styles.periodTabTextActive,
              ]}
            >
              Année {currentYear}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CARTOUCHE CHIFFRE D'AFFAIRES & URSSAF */}
        <Card style={styles.revenueCard} variant="goldBorder">
          <View style={styles.revenueHeader}>
            <Text style={styles.revenueTitle}>CA ENCAISSÉ À DÉCLARER ({getPeriodLabel()})</Text>
            <Badge label="Base URSSAF" variant="warning" />
          </View>
          <Text style={styles.revenueAmount}>
            {totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </Text>

          <View style={styles.urssafEstimateRow}>
            <View>
              <Text style={styles.urssafLabel}>Cotisations sociales estimées (21,2%) :</Text>
              <Text style={styles.urssafSub}>À régler à l'URSSAF sur cette période</Text>
            </View>
            <Text style={styles.urssafAmount}>
              ~ {estimatedUrssafCotisations.toFixed(2)} €
            </Text>
          </View>
        </Card>

        {/* ACTIONS D'EXPORTATION LÉGALE */}
        <Text style={styles.sectionTitle}>Exports Comptables Officiels</Text>
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, styles.pdfBtn]}
            onPress={handleExportPdf}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            <Text style={styles.exportBtnIcon}>📄</Text>
            <Text style={styles.exportBtnText}>Export PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, styles.csvBtn]}
            onPress={handleExportCsv}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            <Text style={styles.exportBtnIcon}>📊</Text>
            <Text style={styles.exportBtnText}>Export Excel / CSV</Text>
          </TouchableOpacity>
        </View>

        {/* ÉCRITURES DU LIVRE DES RECETTES */}
        <Text style={styles.sectionTitle}>
          Écritures chronologiques ({filteredEntries.length})
        </Text>

        {filteredEntries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyTitle}>Aucun encaissement sur cette période</Text>
            <Text style={styles.emptySub}>
              Chaque paiement enregistré sur une facture alimente immédiatement et
              chronologiquement ce livre des recettes.
            </Text>
          </Card>
        ) : (
          filteredEntries.map((e) => (
            <Card key={e.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View>
                  <Text style={styles.entryOrder}>
                    N° {e.entry_number} • {new Date(e.entry_date).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.entryInvoice}>Facture {e.invoice_number}</Text>
                </View>
                <Text style={styles.entryAmount}>
                  +{Number(e.amount).toFixed(2)} €
                </Text>
              </View>

              <View style={styles.entryFooter}>
                <Text style={styles.entryClient}>{e.client_name}</Text>
                <Text style={styles.entryMethod}>{e.payment_method.toUpperCase()}</Text>
              </View>
            </Card>
          ))
        )}

        {/* MENTION LÉGALE COMPTABILITÉ */}
        <Text style={styles.accountingNotice}>
          Tenue obligatoire du livre des recettes en application de l'article L. 123-28 du Code
          de commerce. Les montants déclarés à l'URSSAF et aux impôts doivent correspondre
          strictement aux recettes effectivement encaissées.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  periodTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: spacing.xs + 3,
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
  },
  periodTabActive: {
    backgroundColor: colors.primary,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTabTextActive: {
    color: colors.white,
  },
  revenueCard: {
    marginBottom: spacing.md,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  urssafEstimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  urssafLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urssafSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  urssafAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.gold,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  pdfBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  csvBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  exportBtnIcon: {
    fontSize: 18,
  },
  exportBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
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
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  entryCard: {
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryOrder: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  entryInvoice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.xs,
  },
  entryClient: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  entryMethod: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  accountingNotice: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'justify',
    marginTop: spacing.lg,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
