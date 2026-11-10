// ==============================================================================
// FICHE DÉTAILLÉE DE FACTURE & ENREGISTREMENT DES PAIEMENTS
// Gestion des paiements partiels/complets et émission d'avoirs conformes
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Invoice, InvoiceItem, Client, PaymentMethod } from '../../types/models';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useInvoiceStore } from '../../stores/useInvoiceStore';
import { usePaymentStore } from '../../stores/usePaymentStore';
import { invoicePdfService } from '../../services/invoicePdfService';
import { einvoicingService } from '../../services/einvoicingService';

interface InvoiceDetailScreenProps {
  invoice: Invoice;
  client: Client;
  onBack: () => void;
  onInvoiceUpdated?: () => void;
}

export const InvoiceDetailScreen: React.FC<InvoiceDetailScreenProps> = ({
  invoice: initialInvoice,
  client,
  onBack,
  onInvoiceUpdated,
}) => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { getItemsForInvoice, createCreditNote } = useInvoiceStore();
  const {
    payments,
    loadPayments,
    recordPayment,
    getPaymentsForInvoice,
    getTotalPaidForInvoice,
    isRecording,
  } = usePaymentStore();

  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // MODAL PAIEMENT
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cb');
  const [paymentRef, setPaymentRef] = useState('');

  // MODAL AVOIR
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditReason, setCreditReason] = useState('');

  const userId = user?.id || 'demo-user-1';

  useEffect(() => {
    loadPayments(userId);
    const invoiceItems = getItemsForInvoice(invoice.id);
    setItems(invoiceItems);
  }, [invoice.id]);

  const invoicePayments = getPaymentsForInvoice(invoice.id);
  const totalPaid = getTotalPaidForInvoice(invoice.id);
  const remainingBalance = Math.max(0, Number(invoice.total_ttc) - totalPaid);

  const isFullyPaid = invoice.status === 'paid' || remainingBalance <= 0.01;

  // Action : Partager le PDF de facture
  const handleSharePdf = async () => {
    if (!profile) return;
    try {
      const pdfUri = await invoicePdfService.createInvoicePdfFile(
        invoice,
        profile,
        client,
        items
      );
      await invoicePdfService.shareInvoicePdf(pdfUri, invoice.invoice_number);
    } catch (err: any) {
      Alert.alert('Erreur PDF', err.message || 'Impossible de générer la facture.');
    }
  };

  // Action : Exporter Factur-X XML (Réforme Facturation Électronique)
  const handleExportFacturX = async () => {
    if (!profile) return;
    try {
      await einvoicingService.exportFacturXXml(invoice, profile, client, items);
    } catch (err: any) {
      Alert.alert('Erreur Factur-X', err.message || 'Impossible d’exporter le fichier XML.');
    }
  };

  // Action : Ouvrir le modal paiement pré-rempli avec le solde restant
  const openPaymentModal = () => {
    setPaymentAmount(remainingBalance.toFixed(2));
    setPaymentMethod('cb');
    setPaymentRef('');
    setShowPaymentModal(true);
  };

  // Action : Enregistrer un paiement (intégral ou partiel)
  const handleSavePayment = async () => {
    const amt = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant supérieur à zéro.');
      return;
    }

    try {
      await recordPayment(userId, invoice, amt, paymentMethod, paymentRef || undefined);

      setShowPaymentModal(false);
      Alert.alert('Paiement enregistré', 'Le paiement a été inscrit au Livre des Recettes.');

      if (amt >= remainingBalance) {
        setInvoice({ ...invoice, status: 'paid' });
      }
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’enregistrer le paiement.');
    }
  };

  // Action : Émettre un avoir pour annuler/rectifier la facture
  const handleCreateCreditNote = async () => {
    if (!creditReason.trim()) {
      Alert.alert('Motif requis', 'Veuillez indiquer le motif d’émission de l’avoir.');
      return;
    }

    try {
      const { creditNote } = await createCreditNote(userId, invoice, creditReason.trim());
      setShowCreditModal(false);
      Alert.alert(
        'Avoir émis',
        `L’avoir ${creditNote.invoice_number} a été généré conformément aux règles fiscales.`
      );
      setInvoice({ ...invoice, status: 'cancelled' });
      if (onInvoiceUpdated) onInvoiceUpdated();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de générer l’avoir.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={`${invoice.is_credit_note ? 'Avoir' : 'Facture'} ${invoice.invoice_number}`}
        subtitle={`Émise le ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}`}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* CARTOUCHE STATUT & PAIEMENT */}
        <Card
          style={styles.card}
          variant={isFullyPaid ? 'default' : 'goldBorder'}
        >
          <View style={styles.statusRow}>
            <Text style={styles.statusTitle}>STATUT COMPTABLE</Text>
            <Badge
              label={
                invoice.is_credit_note
                  ? 'Avoir émis'
                  : invoice.status === 'cancelled'
                  ? 'Annulée par avoir'
                  : isFullyPaid
                  ? 'Payée / Soldée'
                  : 'En attente de paiement'
              }
              variant={
                isFullyPaid
                  ? 'completed'
                  : invoice.status === 'cancelled'
                  ? 'cancelled'
                  : 'warning'
              }
            />
          </View>

          <View style={styles.amountsRow}>
            <View>
              <Text style={styles.amountLabel}>Total Net TTC</Text>
              <Text style={styles.totalAmount}>
                {Number(invoice.total_ttc).toFixed(2)} €
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amountLabel}>Reste à recouvrer</Text>
              <Text
                style={[
                  styles.remainingAmount,
                  { color: remainingBalance > 0 ? colors.danger : colors.success },
                ]}
              >
                {remainingBalance.toFixed(2)} €
              </Text>
            </View>
          </View>
        </Card>

        {/* ACTIONS SUR LE DOCUMENT */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.pdfBtn]}
            onPress={handleSharePdf}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnIcon}>📄</Text>
            <Text style={styles.actionBtnText}>Partager Facture PDF</Text>
          </TouchableOpacity>

          {!isFullyPaid && !invoice.is_credit_note && invoice.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.payBtn]}
              onPress={openPaymentModal}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnIcon}>💶</Text>
              <Text style={styles.actionBtnText}>Enregistrer Paiement</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DÉTAIL CLIENT */}
        <Text style={styles.sectionTitle}>Client Facturé</Text>
        <Card style={styles.card}>
          <Text style={styles.clientName}>
            {client.type === 'entreprise'
              ? `🏢 ${client.company_name}`
              : `👤 ${client.last_name} ${client.first_name || ''}`}
          </Text>
          <Text style={styles.clientDetail}>📞 {client.phone}</Text>
          {client.email ? <Text style={styles.clientDetail}>✉️ {client.email}</Text> : null}
          {client.siren_siret ? (
            <Text style={styles.clientDetail}>SIREN/SIRET : {client.siren_siret}</Text>
          ) : null}
          {client.billing_address ? (
            <Text style={styles.clientDetail}>📍 {client.billing_address}</Text>
          ) : null}
        </Card>

        {/* LIGNES DE FACTURE */}
        <Text style={styles.sectionTitle}>Prestations Facturées</Text>
        <Card style={styles.card}>
          {items.map((it, idx) => (
            <View key={it.id || idx} style={styles.itemRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <Text style={styles.itemDesc}>{it.description}</Text>
                <Text style={styles.itemQty}>Qté : {Number(it.quantity).toFixed(0)}</Text>
              </View>
              <Text style={styles.itemPrice}>{Number(it.total_price).toFixed(2)} €</Text>
            </View>
          ))}
          <View style={styles.taxNoticeRow}>
            <Text style={styles.taxNoticeText}>{invoice.tva_mention}</Text>
          </View>
        </Card>

        {/* HISTORIQUE DES PAIEMENTS REÇUS */}
        <Text style={styles.sectionTitle}>Paiements reçus (Livre des Recettes)</Text>
        <Card style={styles.card}>
          {invoicePayments.length === 0 ? (
            <Text style={styles.noPaymentsText}>Aucun paiement enregistré pour l'instant.</Text>
          ) : (
            invoicePayments.map((p) => (
              <View key={p.id} style={styles.paymentItem}>
                <View>
                  <Text style={styles.paymentMethodText}>
                    {p.payment_method.toUpperCase()} •{' '}
                    {new Date(p.payment_date).toLocaleDateString('fr-FR')}
                  </Text>
                  {p.transaction_reference ? (
                    <Text style={styles.paymentRefText}>Réf : {p.transaction_reference}</Text>
                  ) : null}
                </View>
                <Text style={styles.paymentAmountValue}>
                  +{Number(p.amount).toFixed(2)} €
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* FACTURATION ÉLECTRONIQUE (RÉFORME FRANCE) */}
        <TouchableOpacity
          style={styles.einvoiceTrigger}
          onPress={handleExportFacturX}
        >
          <Text style={styles.einvoiceTriggerText}>
            ⚡ Exporter le fichier Factur-X XML (Réforme 2026/2027)
          </Text>
        </TouchableOpacity>

        {/* BOUTON D'ÉMISSION D'AVOIR SI NÉCESSAIRE */}
        {!invoice.is_credit_note && invoice.status !== 'cancelled' && (
          <TouchableOpacity
            style={styles.creditNoteTrigger}
            onPress={() => setShowCreditModal(true)}
          >
            <Text style={styles.creditNoteTriggerText}>
              🔄 Rectifier ou annuler par une Facture d'Avoir
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* MODAL ENREGISTRER UN PAIEMENT */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enregistrer un Règlement</Text>

            <Input
              label="Montant encaissé (€)"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              required
              prefix="💶"
            />

            <Text style={styles.modalLabel}>Mode de règlement :</Text>
            <View style={styles.methodSelector}>
              {(['cb', 'especes', 'virement', 'lien'] as PaymentMethod[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodBtn,
                    paymentMethod === m && styles.methodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === m && styles.methodBtnTextActive,
                    ]}
                  >
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Référence transaction (Optionnel)"
              value={paymentRef}
              onChangeText={setPaymentRef}
              placeholder="Ex : N° CB 8821 ou Virement ref..."
            />

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setShowPaymentModal(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Valider l'encaissement"
                onPress={handleSavePayment}
                loading={isRecording}
                variant="gold"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ÉMISSION FACTURE D'AVOIR */}
      <Modal visible={showCreditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Émettre un Avoir</Text>
            <Text style={styles.modalSub}>
              Conformément à la législation fiscale française, une facture validée ne peut pas être
              supprimée. L'émission d'un avoir est la seule procédure légale.
            </Text>

            <Input
              label="Motif de l'annulation ou rectification"
              value={creditReason}
              onChangeText={setCreditReason}
              placeholder="Ex : Annulation de la course par le client..."
              required
            />

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setShowCreditModal(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Créer l'Avoir"
                onPress={handleCreateCreditNote}
                variant="danger"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  totalAmount: {
    ...typography.title1,
    color: colors.text,
    marginTop: 2,
  },
  remainingAmount: {
    ...typography.title1,
    fontWeight: '800',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  pdfBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  payBtn: {
    backgroundColor: colors.gold,
  },
  actionBtnIcon: {
    fontSize: 16,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  clientDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  itemQty: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
  },
  taxNoticeRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  taxNoticeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  noPaymentsText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  paymentRefText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  paymentAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  einvoiceTrigger: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  einvoiceTriggerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  creditNoteTrigger: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  creditNoteTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalTitle: {
    ...typography.title2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  modalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  methodBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  methodBtnTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});
