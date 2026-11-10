// ==============================================================================
// GESTION DU RÉPERTOIRE CLIENTS (PARTICULIERS & ENTREPRISES)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useClientStore } from '../../stores/useClientStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Client, ClientType } from '../../types/models';

interface ClientsListScreenProps {
  onBack: () => void;
  onSelectClient?: (client: Client) => void;
}

export const ClientsListScreen: React.FC<ClientsListScreenProps> = ({
  onBack,
  onSelectClient,
}) => {
  const { user } = useAuthStore();
  const { clients, loadClients, addClient, updateClient, deleteClient, searchClients } =
    useClientStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'particulier' | 'entreprise'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Formulaire client
  const [type, setType] = useState<ClientType>('particulier');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [sirenSiret, setSirenSiret] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Immédiat');
  const [notes, setNotes] = useState('');

  const userId = user?.id || 'demo-user-1';

  useEffect(() => {
    loadClients(userId);
  }, [userId]);

  const openAddModal = () => {
    setEditingClient(null);
    setType('particulier');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setContactName('');
    setSirenSiret('');
    setPhone('');
    setEmail('');
    setBillingAddress('');
    setPaymentTerms('Immédiat');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (c: Client) => {
    setEditingClient(c);
    setType(c.type);
    setFirstName(c.first_name || '');
    setLastName(c.last_name || '');
    setCompanyName(c.company_name || '');
    setContactName(c.contact_name || '');
    setSirenSiret(c.siren_siret || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setBillingAddress(c.billing_address || '');
    setPaymentTerms(c.payment_terms || 'Immédiat');
    setNotes(c.notes || '');
    setShowModal(true);
  };

  const handleSaveClient = async () => {
    if (!phone.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone est obligatoire.');
      return;
    }

    if (type === 'particulier' && !lastName.trim() && !firstName.trim()) {
      Alert.alert('Erreur', 'Le nom du client particulier est requis.');
      return;
    }

    if (type === 'entreprise' && !companyName.trim()) {
      Alert.alert('Erreur', 'La raison sociale de l’entreprise est requise.');
      return;
    }

    if (editingClient) {
      await updateClient(editingClient.id, {
        type,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        siren_siret: sirenSiret.trim(),
        phone: phone.trim(),
        email: email.trim(),
        billing_address: billingAddress.trim(),
        payment_terms: paymentTerms.trim(),
        notes: notes.trim(),
      });
    } else {
      await addClient(userId, {
        type,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        siren_siret: sirenSiret.trim(),
        phone: phone.trim(),
        email: email.trim(),
        billing_address: billingAddress.trim(),
        payment_terms: paymentTerms.trim(),
        notes: notes.trim(),
      });
    }

    setShowModal(false);
  };

  const handleDelete = (c: Client) => {
    Alert.alert(
      'Suppression',
      `Confirmez-vous la suppression de ${c.company_name || c.last_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteClient(c.id),
        },
      ]
    );
  };

  const filtered = searchClients(search).filter((c) => {
    if (filterType === 'all') return true;
    return c.type === filterType;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Répertoire Clients"
        subtitle={`${clients.length} contact(s) enregistrés`}
        onBack={onBack}
        rightAction={
          <Button title="+ Nouveau" size="sm" onPress={openAddModal} />
        }
      />

      <View style={styles.searchBarContainer}>
        <Input
          label=""
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher par nom, téléphone, société..."
          prefix="🔍"
          containerStyle={styles.searchInput}
        />

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === 'all' && styles.filterTabTextActive,
              ]}
            >
              Tous ({clients.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === 'particulier' && styles.filterTabActive,
            ]}
            onPress={() => setFilterType('particulier')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === 'particulier' && styles.filterTabTextActive,
              ]}
            >
              Particuliers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === 'entreprise' && styles.filterTabActive,
            ]}
            onPress={() => setFilterType('entreprise')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === 'entreprise' && styles.filterTabTextActive,
              ]}
            >
              Entreprises
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filtered.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Aucun client trouvé</Text>
            <Text style={styles.emptySub}>
              Ajoutez vos clients pour accélérer la création des bons de commande.
            </Text>
            <Button
              title="Ajouter un client"
              size="sm"
              onPress={openAddModal}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          filtered.map((c) => (
            <Card
              key={c.id}
              style={styles.clientCard}
              onPress={() => (onSelectClient ? onSelectClient(c) : openEditModal(c))}
            >
              <View style={styles.clientHeader}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientDisplayName}>
                    {c.type === 'entreprise'
                      ? c.company_name
                      : `${c.first_name || ''} ${c.last_name}`}
                  </Text>
                  {c.type === 'entreprise' && c.contact_name ? (
                    <Text style={styles.contactName}>Contact : {c.contact_name}</Text>
                  ) : null}
                </View>
                <Badge
                  label={c.type === 'entreprise' ? 'Entreprise' : 'Particulier'}
                  variant={c.type === 'entreprise' ? 'warning' : 'confirmed'}
                />
              </View>

              <View style={styles.clientDetails}>
                <Text style={styles.clientDetailItem}>📞 {c.phone}</Text>
                {c.email ? <Text style={styles.clientDetailItem}>✉️ {c.email}</Text> : null}
                {c.billing_address ? (
                  <Text style={styles.clientDetailItem} numberOfLines={1}>
                    📍 {c.billing_address}
                  </Text>
                ) : null}
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => openEditModal(c)}
                  style={styles.actionLink}
                >
                  <Text style={styles.actionLinkText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(c)}
                  style={styles.actionLink}
                >
                  <Text style={[styles.actionLinkText, { color: colors.danger }]}>
                    Supprimer
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* MODAL CRÉATION / ÉDITION CLIENT */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingClient ? 'Modifier le Client' : 'Nouveau Client'}
            </Text>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'particulier' && styles.typeBtnActive]}
                onPress={() => setType('particulier')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'particulier' && styles.typeBtnTextActive,
                  ]}
                >
                  Particulier
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'entreprise' && styles.typeBtnActive]}
                onPress={() => setType('entreprise')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'entreprise' && styles.typeBtnTextActive,
                  ]}
                >
                  Entreprise
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {type === 'particulier' ? (
                <>
                  <Input
                    label="Prénom"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Jean"
                  />
                  <Input
                    label="Nom"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Dupont"
                    required
                  />
                  <Input
                    label="Téléphone"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="06 12 34 56 78"
                    keyboardType="phone-pad"
                    required
                  />
                  <Input
                    label="E-mail"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="jean.dupont@email.fr"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Input
                    label="Adresse"
                    value={billingAddress}
                    onChangeText={setBillingAddress}
                    placeholder="12 rue de Rivoli, Paris"
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Raison Sociale"
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Cabinet Alpha SAS"
                    required
                  />
                  <Input
                    label="Nom du contact"
                    value={contactName}
                    onChangeText={setContactName}
                    placeholder="Mme Claire Legrand"
                  />
                  <Input
                    label="SIREN / SIRET"
                    value={sirenSiret}
                    onChangeText={setSirenSiret}
                    placeholder="123 456 789 00012"
                    keyboardType="numeric"
                  />
                  <Input
                    label="Téléphone"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="01 40 00 00 00"
                    keyboardType="phone-pad"
                    required
                  />
                  <Input
                    label="E-mail comptabilité / facturation"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="compta@cabinet-alpha.fr"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Input
                    label="Adresse du siège / Facturation"
                    value={billingAddress}
                    onChangeText={setBillingAddress}
                    placeholder="80 Boulevard Haussmann, Paris"
                  />
                  <Input
                    label="Conditions de règlement"
                    value={paymentTerms}
                    onChangeText={setPaymentTerms}
                    placeholder="30 jours fin de mois"
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setShowModal(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Enregistrer"
                onPress={handleSaveClient}
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
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLight,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
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
  clientCard: {
    marginBottom: spacing.md,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  clientInfo: {
    flex: 1,
  },
  clientDisplayName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  contactName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clientDetails: {
    marginVertical: spacing.xs,
    gap: 3,
  },
  clientDetailItem: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  actionLink: {
    paddingVertical: 2,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
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
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
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
