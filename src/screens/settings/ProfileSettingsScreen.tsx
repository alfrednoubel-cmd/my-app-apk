// ==============================================================================
// ÉCRAN DE CONFIGURATION DU PROFIL ENTREPRISE VTC
// Enregistrement unique de toutes les mentions légales obligatoires
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { LEGAL_CONSTANTS } from '../../constants/legal';
import { Header } from '../../components/ui/Header';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useProfileStore } from '../../stores/useProfileStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface ProfileSettingsScreenProps {
  onBack?: () => void;
}

export const ProfileSettingsScreen: React.FC<ProfileSettingsScreenProps> = ({
  onBack,
}) => {
  const { user } = useAuthStore();
  const { profile, saveProfile, isSaving, loadProfile } = useProfileStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isEi, setIsEi] = useState(true);
  const [commercialName, setCommercialName] = useState('');
  const [siren, setSiren] = useState('');
  const [siret, setSiret] = useState('');
  const [revtcNumber, setRevtcNumber] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [bankName, setBankName] = useState('');
  const [tvaRegime, setTvaRegime] = useState<'franchise' | 'reel'>('franchise');
  const [tvaMention, setTvaMention] = useState(LEGAL_CONSTANTS.TVA_FRANCHISE_MENTION);
  const [paymentTerms, setPaymentTerms] = useState('Règlement à réception');

  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setIsEi(profile.is_ei ?? true);
      setCommercialName(profile.commercial_name || '');
      setSiren(profile.siren || '');
      setSiret(profile.siret || '');
      setRevtcNumber(profile.revtc_number || '');
      setAddress(profile.address || '');
      setPostalCode(profile.postal_code || '');
      setCity(profile.city || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || user?.email || '');
      setIban(profile.rib_iban || '');
      setBic(profile.rib_bic || '');
      setBankName(profile.bank_name || '');
      setTvaRegime(profile.tva_regime || 'franchise');
      setTvaMention(profile.tva_mention || LEGAL_CONSTANTS.TVA_FRANCHISE_MENTION);
      setPaymentTerms(profile.payment_terms || 'Règlement à réception');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner votre nom et prénom.');
      return;
    }
    if (!siret.trim() || siret.replace(/\s/g, '').length !== 14) {
      Alert.alert('Erreur', 'Le numéro SIRET doit contenir exactement 14 chiffres.');
      return;
    }
    if (!revtcNumber.trim()) {
      Alert.alert('Erreur', 'Le numéro REVTC (inscription registre VTC) est obligatoire.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone professionnel est obligatoire.');
      return;
    }

    const cleanSiren = siren.trim() || siret.replace(/\s/g, '').substring(0, 9);
    const userId = user?.id || 'demo-user-1';

    const success = await saveProfile(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        is_ei: isEi,
        commercial_name: commercialName.trim(),
        siren: cleanSiren,
        siret: siret.replace(/\s/g, ''),
        revtc_number: revtcNumber.trim(),
        address: address.trim(),
        postal_code: postalCode.trim(),
        city: city.trim(),
        phone: phone.trim(),
        email: email.trim(),
        rib_iban: iban.trim().toUpperCase(),
        rib_bic: bic.trim().toUpperCase(),
        bank_name: bankName.trim(),
        tva_regime: tvaRegime,
        tva_mention: tvaMention,
        payment_terms: paymentTerms.trim(),
      },
      userId
    );

    if (success) {
      Alert.alert('Succès', 'Paramètres de l’entreprise enregistrés avec succès.');
      if (onBack) onBack();
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Paramètres de l'entreprise"
        subtitle="Renseigné une seule fois pour tous vos documents"
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* CARTOUCHE D'AVERTISSEMENT LÉGAL */}
        <Card style={styles.legalBanner} variant="highlight">
          <Text style={styles.bannerTitle}>⚖️ Respect des obligations légales VTC</Text>
          <Text style={styles.bannerText}>
            Ces informations sont automatiquement injectées dans vos bons de commande,
            justificatifs de réservation préalable (Arrêté du 6 août 2025) et factures conformes.
          </Text>
        </Card>

        {/* SECTION 1 : IDENTITÉ DU CHAUFFEUR & STATUT */}
        <Text style={styles.sectionTitle}>1. Identité & Statut Professionnel</Text>
        <Card style={styles.card}>
          <Input
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ex : Jean"
            required
          />
          <Input
            label="Nom de famille"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Ex : Dupont"
            required
          />

          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Mention EI (Entrepreneur Individuel)</Text>
              <Text style={styles.switchDesc}>
                Obligatoire sur tous les documents officiels depuis le 15 mai 2022
              </Text>
            </View>
            <Switch
              value={isEi}
              onValueChange={setIsEi}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <Input
            label="Nom Commercial (facultatif)"
            value={commercialName}
            onChangeText={setCommercialName}
            placeholder="Ex : Élite VTC Paris"
          />
        </Card>

        {/* SECTION 2 : IMMATRICULATION & REGISTRE VTC */}
        <Text style={styles.sectionTitle}>2. Immatriculation & Registre VTC</Text>
        <Card style={styles.card}>
          <Input
            label="Numéro REVTC (Registre des exploitants VTC)"
            value={revtcNumber}
            onChangeText={setRevtcNumber}
            placeholder="Ex : EVTC075210089"
            required
            hint="Requis sur le justificatif de réservation"
          />
          <Input
            label="Numéro SIRET (14 chiffres)"
            value={siret}
            onChangeText={(val) => {
              setSiret(val);
              if (val.length >= 9) setSiren(val.substring(0, 9));
            }}
            placeholder="Ex : 90123456700012"
            keyboardType="numeric"
            maxLength={14}
            required
          />
          <Input
            label="Numéro SIREN (9 chiffres)"
            value={siren}
            onChangeText={setSiren}
            placeholder="Ex : 901234567"
            keyboardType="numeric"
            maxLength={9}
          />
        </Card>

        {/* SECTION 3 : COORDONNÉES */}
        <Text style={styles.sectionTitle}>3. Coordonnées professionnelles</Text>
        <Card style={styles.card}>
          <Input
            label="Adresse professionnelle"
            value={address}
            onChangeText={setAddress}
            placeholder="Ex : 12 rue de la Paix"
            required
          />
          <View style={styles.row}>
            <Input
              label="Code Postal"
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="75001"
              keyboardType="numeric"
              containerStyle={styles.halfInput}
              required
            />
            <Input
              label="Ville"
              value={city}
              onChangeText={setCity}
              placeholder="Paris"
              containerStyle={styles.halfInput}
              required
            />
          </View>
          <Input
            label="Téléphone professionnel"
            value={phone}
            onChangeText={setPhone}
            placeholder="06 12 34 56 78"
            keyboardType="phone-pad"
            required
          />
          <Input
            label="E-mail professionnel"
            value={email}
            onChangeText={setEmail}
            placeholder="contact@elite-vtc.fr"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Card>

        {/* SECTION 4 : FISCALITÉ & TVA */}
        <Text style={styles.sectionTitle}>4. Fiscalité & Régime de TVA</Text>
        <Card style={styles.card}>
          <View style={styles.badgeRow}>
            <Text style={styles.tvaStatusText}>Régime configuré par défaut :</Text>
            <Text style={styles.tvaBadge}>Micro-Entrepreneur (Art. 293 B)</Text>
          </View>
          <Input
            label="Mention légale sur factures"
            value={tvaMention}
            onChangeText={setTvaMention}
            editable={false}
            hint="Verrouillé pour conformité CGI"
          />
          <Input
            label="Conditions de règlement par défaut"
            value={paymentTerms}
            onChangeText={setPaymentTerms}
            placeholder="Ex : Règlement à réception"
          />
        </Card>

        {/* SECTION 5 : COORDONNÉES BANCAIRES */}
        <Text style={styles.sectionTitle}>5. Coordonnées Bancaires (Virements)</Text>
        <Card style={styles.card}>
          <Input
            label="Nom de la banque"
            value={bankName}
            onChangeText={setBankName}
            placeholder="Ex : Qonto / BoursoBank"
          />
          <Input
            label="IBAN"
            value={iban}
            onChangeText={setIban}
            placeholder="FR76 3000 4000 0000 ..."
            autoCapitalize="characters"
          />
          <Input
            label="BIC / SWIFT"
            value={bic}
            onChangeText={setBic}
            placeholder="QNTOFR22"
            autoCapitalize="characters"
          />
        </Card>

        {/* BOUTON D'ENREGISTREMENT */}
        <Button
          title="Enregistrer les paramètres"
          onPress={handleSave}
          loading={isSaving}
          size="lg"
          style={styles.saveBtn}
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
  legalBanner: {
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: colors.primary,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  bannerText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  switchTextCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  switchDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  tvaStatusText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tvaBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
    backgroundColor: colors.goldMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  saveBtn: {
    marginTop: spacing.lg,
  },
});
