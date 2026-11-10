// ==============================================================================
// CONVERSION EXPRESS : BON DE COMMANDE ➔ FACTURE EN 1 CLIC
// Ajout rapide de suppléments (attente, péage) et émission instantanée
// ==============================================================================

import React, { useState } from 'react';
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
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Booking, Client, Invoice, InvoiceItem } from '../../types/models';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useInvoiceStore } from '../../stores/useInvoiceStore';

interface ConvertBookingToInvoiceScreenProps {
  booking: Booking;
  client: Client;
  onBack: () => void;
  onInvoiceCreated: (invoice: Invoice, items: InvoiceItem[]) => void;
}

export const ConvertBookingToInvoiceScreen: React.FC<ConvertBookingToInvoiceScreenProps> = ({
  booking,
  client,
  onBack,
  onInvoiceCreated,
}) => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { createInvoiceFromBooking, isCreating } = useInvoiceStore();

  const [supplements, setSupplements] = useState<{ description: string; price: number }[]>([]);
  const [customDesc, setCustomDesc] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const basePrice = Number(booking.agreed_price);
  const totalSupplements = supplements.reduce((acc, s) => acc + s.price, 0);
  const totalTtc = basePrice + totalSupplements;

  // Raccourcis de suppléments fréquents
  const addPresetSupplement = (description: string, price: number) => {
    setSupplements([...supplements, { description, price }]);
  };

  const addCustomSupplement = () => {
    const p = parseFloat(customPrice.replace(',', '.'));
    if (!customDesc.trim() || isNaN(p) || p <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une description et un montant valide.');
      return;
    }
    setSupplements([...supplements, { description: customDesc.trim(), price: p }]);
    setCustomDesc('');
    setCustomPrice('');
  };

  const removeSupplement = (index: number) => {
    setSupplements(supplements.filter((_, i) => i !== index));
  };

  const handleEmitInvoice = async () => {
    if (!profile?.siret || !profile?.revtc_number) {
      Alert.alert(
        'Paramètres incomplets',
        'Veuillez renseigner votre SIRET et REVTC dans les Paramètres avant d’émettre une facture légale.'
      );
      return;
    }

    const userId = user?.id || 'demo-user-1';

    try {
      const { invoice, items } = await createInvoiceFromBooking(
        userId,
        booking,
        client,
        supplements
      );
      onInvoiceCreated(invoice, items);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de générer la facture.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Facturation en 1 clic"
        subtitle={`Issu du Bon de commande ${booking.booking_number}`}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* CARTOUCHE TRAJET & CLIENT */}
        <Card style={styles.card} variant="highlight">
          <Text style={styles.clientTitle}>
            {client.type === 'entreprise' ? `🏢 ${client.company_name}` : `👤 ${client.last_name} ${client.first_name || ''}`}
          </Text>
          <Text style={styles.tripText}>
            📍 {booking.pickup_address} ➔ {booking.dropoff_address}
          </Text>
          <View style={styles.basePriceRow}>
            <Text style={styles.basePriceLabel}>Forfait course convenu :</Text>
            <Text style={styles.basePriceValue}>{basePrice.toFixed(2)} €</Text>
          </View>
        </Card>

        {/* AJOUT DE SUPPLÉMENTS */}
        <Text style={styles.sectionTitle}>Suppléments éventuels (1 tap)</Text>
        <View style={styles.presetChipsRow}>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => addPresetSupplement('Attente passager (15 min)', 15)}
          >
            <Text style={styles.presetChipText}>+ Attente 15 min (15 €)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => addPresetSupplement('Frais de péage autoroute', 10)}
          >
            <Text style={styles.presetChipText}>+ Péage (10 €)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => addPresetSupplement('Bagage hors gabarit', 8)}
          >
            <Text style={styles.presetChipText}>+ Bagage sup. (8 €)</Text>
          </TouchableOpacity>
        </View>

        {/* LISTE DES SUPPLÉMENTS AJOUTÉS */}
        {supplements.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.subHeader}>Suppléments enregistrés :</Text>
            {supplements.map((s, idx) => (
              <View key={idx} style={styles.supplementItem}>
                <Text style={styles.supplementDesc}>• {s.description}</Text>
                <View style={styles.supplementRight}>
                  <Text style={styles.supplementPrice}>+{s.price.toFixed(2)} €</Text>
                  <TouchableOpacity onPress={() => removeSupplement(idx)}>
                    <Text style={styles.deleteCross}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* AJOUT PERSONNALISÉ */}
        <Card style={styles.card}>
          <Text style={styles.subHeader}>Autre supplément :</Text>
          <View style={styles.row}>
            <Input
              label=""
              value={customDesc}
              onChangeText={setCustomDesc}
              placeholder="Ex : Détour supplémentaire..."
              containerStyle={{ flex: 2, marginBottom: 0 }}
            />
            <Input
              label=""
              value={customPrice}
              onChangeText={setCustomPrice}
              placeholder="Montant €"
              keyboardType="numeric"
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
          </View>
          <Button
            title="+ Ajouter"
            size="sm"
            variant="outline"
            onPress={addCustomSupplement}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        {/* RÉCAPITULATIF FISCAL */}
        <Card style={styles.card} variant="goldBorder">
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Net (HT) :</Text>
            <Text style={styles.summaryValue}>{totalTtc.toFixed(2)} €</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>TVA (Franchise Art. 293 B) :</Text>
            <Text style={styles.summaryValue}>0,00 €</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>TOTAL À FACTURER :</Text>
            <Text style={styles.summaryTotalValue}>{totalTtc.toFixed(2)} €</Text>
          </View>
          <Text style={styles.legalNotice}>
            Mention automatique : « TVA non applicable, art. 293 B du CGI »
          </Text>
        </Card>

        {/* VALIDATION FACTURE */}
        <Button
          title="⚡ Émettre la Facture Définitive"
          onPress={handleEmitInvoice}
          loading={isCreating}
          variant="gold"
          size="lg"
          style={styles.emitBtn}
        />
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
  card: {
    marginBottom: spacing.md,
  },
  clientTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tripText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  basePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  basePriceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  basePriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  subHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  supplementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  supplementDesc: {
    fontSize: 13,
    color: colors.text,
  },
  supplementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  supplementPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  deleteCross: {
    fontSize: 14,
    color: colors.danger,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  summaryTotalValue: {
    ...typography.title2,
    color: colors.gold,
  },
  legalNotice: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emitBtn: {
    marginTop: spacing.md,
  },
});
