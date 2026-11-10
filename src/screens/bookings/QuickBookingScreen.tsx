// ==============================================================================
// FORMULAIRE EXPRESS : BON DE COMMANDE EN MOINS DE 30 SECONDES
// Optimisé pour un chauffeur au volant ou entre deux courses
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
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/useAuthStore';
import { useClientStore } from '../../stores/useClientStore';
import { useBookingStore } from '../../stores/useBookingStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { Client, Booking } from '../../types/models';

interface QuickBookingScreenProps {
  onBack: () => void;
  onBookingCreated: (booking: Booking, client: Client) => void;
}

// Modèles de trajets fréquents VTC en 1 clic
const FREQUENT_ROUTES = [
  {
    name: 'Paris ➔ CDG',
    pickup: 'Paris centre',
    dropoff: 'Aéroport Paris-Charles de Gaulle (CDG)',
    price: 65,
  },
  {
    name: 'Paris ➔ Orly',
    pickup: 'Paris centre',
    dropoff: 'Aéroport de Paris-Orly (ORY)',
    price: 39,
  },
  {
    name: 'Paris ➔ Gare Lyon',
    pickup: 'Paris centre',
    dropoff: 'Gare de Lyon, Paris',
    price: 25,
  },
  {
    name: 'Paris ➔ Disney',
    pickup: 'Paris centre',
    dropoff: 'Disneyland Paris, Chessy',
    price: 85,
  },
];

export const QuickBookingScreen: React.FC<QuickBookingScreenProps> = ({
  onBack,
  onBookingCreated,
}) => {
  const { user } = useAuthStore();
  const { profile } = useProfileStore();
  const { clients, loadClients, addClient } = useClientStore();
  const { createBooking, isCreating } = useBookingStore();

  // ÉTAT DU FORMULAIRE EXPRESS
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);

  // NOUVEAU CLIENT RAPIDE (SI NON EXISTANT)
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickType, setQuickType] = useState<'particulier' | 'entreprise'>('particulier');

  // TRAJET
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15); // +15 min par défaut
    return d.toISOString().slice(0, 10);
  });
  const [pickupTime, setPickupTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  });

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [flightTrainNumber, setFlightTrainNumber] = useState('');
  const [notes, setNotes] = useState('');

  const userId = user?.id || 'demo-user-1';

  useEffect(() => {
    loadClients(userId);
  }, [userId]);

  // Appliquer un modèle fréquent en 1 tap
  const applyPreset = (preset: (typeof FREQUENT_ROUTES)[0]) => {
    setPickupAddress(preset.pickup);
    setDropoffAddress(preset.dropoff);
    setAgreedPrice(preset.price.toString());
  };

  // Création rapide du client
  const handleCreateQuickClient = async () => {
    if (!quickName.trim() || !quickPhone.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir au moins le nom et le téléphone.');
      return;
    }

    const created = await addClient(userId, {
      type: quickType,
      first_name: quickType === 'particulier' ? quickName.trim() : undefined,
      last_name: quickType === 'particulier' ? '' : undefined,
      company_name: quickType === 'entreprise' ? quickName.trim() : undefined,
      phone: quickPhone.trim(),
    });

    setSelectedClient(created);
    setShowClientModal(false);
    setQuickName('');
    setQuickPhone('');
  };

  // Validation finale du Bon de Commande VTC
  const handleValidateBooking = async () => {
    if (!profile?.revtc_number || !profile?.siret) {
      Alert.alert(
        'Paramètres incomplets',
        'Veuillez renseigner votre SIRET et n° REVTC dans les Paramètres avant de créer un justificatif légal.'
      );
      return;
    }

    if (!selectedClient) {
      Alert.alert('Client requis', 'Veuillez sélectionner ou créer rapidement un client.');
      return;
    }

    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      Alert.alert('Adresses requises', 'Veuillez préciser le départ et l’arrivée.');
      return;
    }

    const priceNum = parseFloat(agreedPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Prix invalide', 'Veuillez indiquer le montant convenu de la course.');
      return;
    }

    // Combiner date et heure
    const [hours, minutes] = pickupTime.split(':').map((v) => parseInt(v, 10) || 0);
    const pickupDateTimeObj = new Date(pickupDate);
    pickupDateTimeObj.setHours(hours, minutes, 0, 0);

    try {
      const created = await createBooking(userId, {
        client_id: selectedClient.id,
        pickup_datetime: pickupDateTimeObj.toISOString(),
        pickup_address: pickupAddress.trim(),
        dropoff_address: dropoffAddress.trim(),
        agreed_price: priceNum,
        passenger_count: parseInt(passengers, 10) || 1,
        flight_train_number: flightTrainNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        status: 'confirmed',
      });

      onBookingCreated(created, selectedClient);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer la réservation.');
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    const display =
      c.type === 'entreprise'
        ? c.company_name || ''
        : `${c.first_name || ''} ${c.last_name || ''}`;
    return display.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <View style={styles.container}>
      <Header
        title="Nouveau Bon de Commande"
        subtitle="Création express & justificatif réglementaire"
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* MODÈLES EN 1 CLIC */}
        <Text style={styles.sectionTitle}>Modèles de trajets fréquents (1 tap)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsScroll}
          contentContainerStyle={styles.presetsContent}
        >
          {FREQUENT_ROUTES.map((route, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.presetChip}
              onPress={() => applyPreset(route)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetTitle}>{route.name}</Text>
              <Text style={styles.presetPrice}>{route.price} €</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SECTION 1 : SÉLECTION DU CLIENT */}
        <Text style={styles.sectionTitle}>1. Client / Donneur d'ordre</Text>
        <Card style={styles.card}>
          {selectedClient ? (
            <View style={styles.clientSelectedRow}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>
                  {selectedClient.type === 'entreprise'
                    ? `🏢 ${selectedClient.company_name}`
                    : `👤 ${selectedClient.first_name} ${selectedClient.last_name}`}
                </Text>
                <Text style={styles.clientPhone}>📞 {selectedClient.phone}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedClient(null)}
                style={styles.changeClientBtn}
              >
                <Text style={styles.changeClientText}>Changer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Input
                label="Rechercher un client (Nom ou Téléphone)"
                value={clientSearch}
                onChangeText={setClientSearch}
                placeholder="Ex : Martin ou 06..."
              />

              {clientSearch.trim().length > 0 && (
                <View style={styles.clientDropdown}>
                  {filteredClients.slice(0, 3).map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.clientDropdownItem}
                      onPress={() => {
                        setSelectedClient(c);
                        setClientSearch('');
                      }}
                    >
                      <Text style={styles.dropdownName}>
                        {c.type === 'entreprise'
                          ? `🏢 ${c.company_name}`
                          : `👤 ${c.first_name} ${c.last_name}`}
                      </Text>
                      <Text style={styles.dropdownPhone}>{c.phone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Button
                title="+ Nouveau Client Express"
                variant="outline"
                size="sm"
                onPress={() => setShowClientModal(true)}
                style={styles.addClientBtn}
              />
            </View>
          )}
        </Card>

        {/* SECTION 2 : DATE & HEURE DE PRISE EN CHARGE */}
        <Text style={styles.sectionTitle}>2. Prise en charge souhaitée</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Input
              label="Date (AAAA-MM-JJ)"
              value={pickupDate}
              onChangeText={setPickupDate}
              containerStyle={styles.halfInput}
              required
            />
            <Input
              label="Heure (HH:MM)"
              value={pickupTime}
              onChangeText={setPickupTime}
              containerStyle={styles.halfInput}
              required
            />
          </View>
        </Card>

        {/* SECTION 3 : ADRESSES */}
        <Text style={styles.sectionTitle}>3. Itinéraire de la course</Text>
        <Card style={styles.card}>
          <Input
            label="Adresse de départ (Prise en charge)"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Ex : 15 Avenue Montaigne, Paris"
            required
            prefix="🟢"
          />
          <Input
            label="Adresse d'arrivée (Dépose)"
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            placeholder="Ex : Aéroport Paris-CDG Terminal 2E"
            required
            prefix="🔴"
          />
        </Card>

        {/* SECTION 4 : PRIX & PASSAGERS */}
        <Text style={styles.sectionTitle}>4. Prix & Détails</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Input
              label="Prix convenu (€ TTC)"
              value={agreedPrice}
              onChangeText={setAgreedPrice}
              placeholder="Ex : 65"
              keyboardType="numeric"
              containerStyle={styles.halfInput}
              required
              prefix="💶"
            />
            <Input
              label="Passagers"
              value={passengers}
              onChangeText={setPassengers}
              keyboardType="numeric"
              containerStyle={styles.halfInput}
              prefix="👥"
            />
          </View>
          <Input
            label="N° Vol / Train (Optionnel)"
            value={flightTrainNumber}
            onChangeText={setFlightTrainNumber}
            placeholder="Ex : AF1234 ou TGV 6601"
          />
          <Input
            label="Instructions particulières (Optionnel)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex : Siège bébé demandé, bagage volumineux..."
          />
        </Card>

        {/* BOUTON DE VALIDATION INSTANTANÉ */}
        <Button
          title="⚡ Générer le Justificatif VTC"
          onPress={handleValidateBooking}
          loading={isCreating}
          size="lg"
          variant="gold"
          style={styles.submitBtn}
        />
      </ScrollView>

      {/* MODAL CRÉATION RAPIDE CLIENT */}
      <Modal visible={showClientModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Création Rapide de Client</Text>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  quickType === 'particulier' && styles.typeBtnActive,
                ]}
                onPress={() => setQuickType('particulier')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    quickType === 'particulier' && styles.typeBtnTextActive,
                  ]}
                >
                  Particulier
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  quickType === 'entreprise' && styles.typeBtnActive,
                ]}
                onPress={() => setQuickType('entreprise')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    quickType === 'entreprise' && styles.typeBtnTextActive,
                  ]}
                >
                  Entreprise
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              label={quickType === 'particulier' ? 'Nom et Prénom' : 'Raison Sociale'}
              value={quickName}
              onChangeText={setQuickName}
              placeholder={quickType === 'particulier' ? 'Jean Dupont' : 'Cabinet Alpha SAS'}
              required
            />
            <Input
              label="Téléphone"
              value={quickPhone}
              onChangeText={setQuickPhone}
              placeholder="06 12 34 56 78"
              keyboardType="phone-pad"
              required
            />

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setShowClientModal(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Enregistrer"
                onPress={handleCreateQuickClient}
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
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  presetsScroll: {
    marginBottom: spacing.md,
  },
  presetsContent: {
    gap: spacing.sm,
  },
  presetChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  presetPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
    marginTop: 2,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  clientSelectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  clientPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeClientBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.sm,
  },
  changeClientText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  clientDropdown: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientDropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dropdownPhone: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addClientBtn: {
    marginTop: spacing.xs,
  },
  submitBtn: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.xl,
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
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
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
