// ==============================================================================
// COMPOSANT BADGE STATUT
// ==============================================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

export type BadgeVariant =
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'draft'
  | 'paid'
  | 'warning'
  | 'danger';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'confirmed',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'completed':
      case 'paid':
        return { bg: colors.successMuted, text: colors.success };
      case 'cancelled':
      case 'danger':
        return { bg: colors.dangerMuted, text: colors.danger };
      case 'warning':
        return { bg: colors.goldMuted, text: colors.gold };
      case 'draft':
        return { bg: colors.surfaceHighlight, text: colors.textSecondary };
      case 'confirmed':
      default:
        return { bg: colors.primaryMuted, text: colors.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
