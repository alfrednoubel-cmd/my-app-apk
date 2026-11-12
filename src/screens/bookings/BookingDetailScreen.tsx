// ==============================================================================
// FICHE DÉTAILLÉE DU JUSTIFICATIF VTC & ACTIONS RAPIDES
// Accessible instantanément hors-ligne en cas de contrôle de police / DREAL
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Booking, Client } from '../../types/models';
import { useProfileStore } from '../../stores/useProfileStore';
import { useBookingStore } from '../../stores/useBookingStore';
import { pdfService } from '../../services/pdfService';
import { shareService } from '../../services/shareService';

interface BookingDetailScreenProps {
  booking: Booking;
  client: Client;
  onBack: () => void;
  onEditBooking?: (booking: Booking, client: Client) => void;
  onConvertToInvoice?: (booking: Booking, client: Client) => void;
}

export const BookingDetailScreen: React.FC<BookingDetailScreenProps> = ({
  booking: initialBooking,
  client,
  onBack,
  onEditBooking,
  onConvertToInvoice,
}) => {
  const { profile } = useProfileStore();
  const { updateBookingStatus, deleteBooking } = useBookingStore();
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const reservationDateFormatted = new Date(booking.reservation_datetime).toLocaleString(
    'fr-FR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  const pickupDateFormatted = new Date(booking.pickup_datetime).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Action : Afficher directement le PDF plein écran
  const handlePreviewPdf = async () => {
    if (!profile) return;
    try {
      await pdfService.previewBookingPdf(booking, profile, client);
    } catch (err: any) {
      Alert.alert('Erreur affichage PDF', err.message || 'Impossible d’afficher le PDF.');
    }
  };

  // Action : Supprimer le bon de commande
  const handleDeleteBooking = () => {
    Alert.alert(
      'Supprimer le bon de commande',
      `Êtes-vous sûr de vouloir supprimer définitivement le bon de commande ${booking.booking_number} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteBooking(booking.id);
            Alert.alert('Supprimé', 'Le bon de commande a été supprimé.');
            onBack();
          },
        },
      ]
    );
  };

  // Action : Générer et Partager le PDF
  const handleSharePdf = async () => {
    if (!profile) return;
    setIsGeneratingPdf(true);
    try {
      const pdfUri = await pdfService.createBookingPdfFile(booking, profile, client);
      await pdfService.sharePdf(pdfUri);
    } catch (err: any) {
      Alert.alert('Erreur PDF', err.message || 'Impossible de générer le PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Action : Partager sur WhatsApp
  const handleWhatsApp = async () => {
    if (!profile) return;
    try {
      let pdfUri: string | undefined;
      try {
        pdfUri = await pdfService.createBookingPdfFile(booking, profile, client);
      } catch {
        // Ignorer en mode secours
      }
      await shareService.shareViaWhatsApp(booking, client, profile, pdfUri);
    } catch (err: any) {
      Alert.alert('Erreur WhatsApp', err.message || 'Impossible d’ouvrir WhatsApp.');
    }
  };

  // Action : Terminer la course
  const handleCompleteRide = async () => {
    await updateBookingStatus(booking.id, 'completed');
    setBooking({ ...booking, status: 'completed' });
    Alert.alert('Course terminée', 'La prestation a été marquée comme effectuée avec succès.');
  };

  return (
    <View style={styles.container}>
      <Header
        title={`Justificatif ${booking.booking_number}`}
        subtitle="Conforme Arrêté du 6 août 2025"
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* BANDEAU DE CONTRÔLE POLICE / DREAL */}
        <Card style={styles.controlBanner} variant="highlight">
          <View style={styles.controlHeader}>
            <Text style={styles.controlBadge}>RÉSERVATION PRÉALABLE VTC OBLIGATOIRE</Text>
            <Badge
              label={
                booking.status === 'completed'
                  ? 'Effectuée'
                  : booking.status === 'confirmed'
                  ? 'Confirmée'
                  : 'Annulée'
              }
              variant={
                booking.status === 'completed'
                  ? 'completed'
                  : booking.status === 'confirmed'
                  ? 'confirmed'
                  : 'cancelled'
              }
            />
          </View>
          <Text style={styles.controlDocNumber}>{booking.booking_number}</Text>
          <Text style={styles.controlSub}>
            Présentable immédiatement à toute réquisition des forces de l'ordre
          </Text>
        </Card>

        {/* BOUTON D'AFFICHAGE DIRECT DU BON DE COMMANDE EN PDF */}
        <Button
          title="👁️ Afficher le Bon de Commande en PDF"
          onPress={handlePreviewPdf}
          variant="gold"
          size="lg"
          style={{ marginBottom: spacing.md }}
        />

        {/* ACTIONS DE PARTAGE DIRECT */}
        <View style={styles.shareRow}>
          <TouchableOpacity
            style={[styles.shareBtn, styles.whatsappBtn]}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <Text style={styles.shareBtnIcon}>💬</Text>
            <Text style={styles.shareBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareBtn, styles.pdfBtn]}
            onPress={handleSharePdf}
            activeOpacity={0.8}
          >
            <Text style={styles.shareBtnIcon}>📄</Text>
            <Text style={styles.shareBtnText}>Partager PDF</Text>
          </TouchableOpacity>
        </View>

        {/* 1. HORODATAGES RÉGLEMENTAIRES */}
        <Text style={styles.sectionTitle}>1. Horodatages Réglementaires</Text>
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date et heure réelle de réservation :</Text>
            <Text style={styles.infoValueHighlight}>{reservationDateFormatted}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prise en charge souhaitée :</Text>
            <Text style={[styles.infoValueHighlight, { color: colors.primary }]}>
              {pickupDateFormatted}
            </Text>
          </View>
          {booking.flight_train_number ? (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vol / Train :</Text>
                <Text style={styles.infoValue}>{booking.flight_train_number}</Text>
              </View>
            </>
          ) : null}
        </Card>

        {/* 2. ITINÉRAIRE */}
        <Text style={styles.sectionTitle}>2. Itinéraire de la Prestation</Text>
        <Card style={styles.card}>
          <View style={styles.tripPoint}>
            <Text style={styles.tripPointIcon}>🟢</Text>
            <View style={styles.tripPointTextCol}>
              <Text style={styles.tripPointLabel}>LIEU DE PRISE EN CHARGE</Text>
              <Text style={styles.tripPointAddress}>{booking.pickup_address}</Text>
            </View>
          </View>

          <View style={styles.tripDashedLine} />

          <View style={styles.tripPoint}>
            <Text style={styles.tripPointIcon}>🔴</Text>
            <View style={styles.tripPointTextCol}>
              <Text style={styles.tripPointLabel}>LIEU DE DÉPOSE</Text>
              <Text style={styles.tripPointAddress}>{booking.dropoff_address}</Text>
            </View>
          </View>
        </Card>

        {/* 3. DONNEUR D'ORDRE / CLIENT */}
        <Text style={styles.sectionTitle}>3. Client / Donneur d'Ordre</Text>
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client :</Text>
            <Text style={styles.infoValue}>
              {client.type === 'entreprise'
                ? `🏢 ${client.company_name}`
                : `👤 ${client.first_name} ${client.last_name}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Téléphone :</Text>
            <Text style={styles.infoValue}>{client.phone}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre de passagers :</Text>
            <Text style={styles.infoValue}>{booking.passenger_count} passager(s)</Text>
          </View>
        </Card>

        {/* 4. EXPLOITANT VTC */}
        <Text style={styles.sectionTitle}>4. Exploitant VTC</Text>
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chauffeur / Entreprise :</Text>
            <Text style={styles.infoValue}>
              {profile?.first_name} {profile?.last_name}
              {profile?.is_ei ? ' EI' : ''}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>N° Inscription REVTC :</Text>
            <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
              {profile?.revtc_number || 'Non renseigné'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SIRET :</Text>
            <Text style={styles.infoValue}>{profile?.siret}</Text>
          </View>
        </Card>

        {/* 5. TARIF CONVENU */}
        <Card style={styles.priceCard} variant="goldBorder">
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>PRIX CONVENU</Text>
              <Text style={styles.priceSub}>{profile?.tva_mention}</Text>
            </View>
            <Text style={styles.priceAmount}>{Number(booking.agreed_price).toFixed(2)} €</Text>
          </View>
        </Card>

        {/* BOUTON D'ACTION SELON STATUT */}
        {booking.status === 'confirmed' && (
          <Button
            title="🏁 Marquer la course comme effectuée"
            onPress={handleCompleteRide}
            variant="primary"
            size="lg"
            style={styles.actionBtn}
          />
        )}

        {/* CONVERSION EN FACTURE (PRÉPARÉ POUR PHASE 3) */}
        {booking.status === 'completed' && onConvertToInvoice && (
          <Button
            title="💳 Convertir en Facture (1 clic)"
            onPress={() => onConvertToInvoice(booking, client)}
            variant="gold"
            size="lg"
            style={styles.actionBtn}
          />
        )}
        {/* BOUTONS DE MODIFICATION ET SUPPRESSION */}
        <View style={styles.editDeleteRow}>
          {onEditBooking && (
            <Button
              title="✏️ Modifier"
              onPress={() => onEditBooking(booking, client)}
              variant="outline"
              size="md"
              style={styles.halfBtn}
            />
          )}
          <Button
            title="🗑️ Supprimer"
            onPress={handleDeleteBooking}
            variant="danger"
            size="md"
            style={styles.halfBtn}
          />
        </View>
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
  controlBanner: {
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  controlBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  controlDocNumber: {
    ...typography.title1,
    color: colors.text,
    letterSpacing: -0.5,
  },
  controlSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  shareRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  whatsappBtn: {
    backgroundColor: '#15803d',
  },
  pdfBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  shareBtnIcon: {
    fontSize: 18,
  },
  shareBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  infoValueHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  tripPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tripPointIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  tripPointTextCol: {
    flex: 1,
  },
  tripPointLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tripPointAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  tripDashedLine: {
    height: 20,
    width: 2,
    borderLeftWidth: 2,
    borderLeftColor: colors.textMuted,
    borderStyle: 'dashed',
    marginLeft: 8,
    marginVertical: 4,
  },
  priceCard: {
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  priceSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceAmount: {
    ...typography.title1,
    color: colors.gold,
  },
  actionBtn: {
    marginBottom: spacing.md,
  },
  editDeleteRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  halfBtn: {
    flex: 1,
  },
});
