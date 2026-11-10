// ==============================================================================
// ÉCRAN DE CONNEXION SÉCURISÉE & AUTHENTIFICATION
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/useAuthStore';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre e-mail et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data?.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
          Alert.alert('Compte créé', 'Votre compte chauffeur a été créé avec succès.');
          if (onSuccess) onSuccess();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data?.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur de connexion', err.message || 'Impossible de vous connecter.');
    } finally {
      setLoading(false);
    }
  };

  // Accès rapide de démonstration / travail hors-ligne
  const handleQuickDemo = () => {
    setUser({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'chauffeur.vtc@mon-vtc.fr',
    });
    if (onSuccess) onSuccess();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* LOGO & EN-TÊTE */}
        <View style={styles.header}>
          <View style={styles.badgeVTC}>
            <Text style={styles.badgeText}>APPLICATION VTC FRANCE</Text>
          </View>
          <Text style={styles.title}>MON VTC GESTION</Text>
          <Text style={styles.subtitle}>
            Logiciel professionnel de gestion, facturation et conformité VTC
          </Text>
        </View>

        {/* FORMULAIRE D'ACCÈS */}
        <Card style={styles.formCard}>
          <Input
            label="Adresse e-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="votre.email@vtc.fr"
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />
          <Input
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••••••"
            secureTextEntry
            required
          />

          <Button
            title={isRegisterMode ? 'Créer mon compte VTC' : 'Se connecter'}
            onPress={handleAuth}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <TouchableOpacity
            onPress={() => setIsRegisterMode(!isRegisterMode)}
            style={styles.toggleModeBtn}
          >
            <Text style={styles.toggleModeText}>
              {isRegisterMode
                ? 'Déjà inscrit ? Connectez-vous'
                : 'Nouveau chauffeur ? Créer un compte'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* MODE DÉMONSTRATION DIRECT */}
        <TouchableOpacity onPress={handleQuickDemo} style={styles.demoBtn}>
          <Text style={styles.demoBtnText}>🚀 Tester directement l'application</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  badgeVTC: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    ...typography.titleHero,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 320,
  },
  formCard: {
    padding: spacing.xl,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  toggleModeBtn: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleModeText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  demoBtn: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    padding: spacing.md,
  },
  demoBtnText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '700',
  },
});
