// ==============================================================================
// COMPOSANT CARD SURFACE
// ==============================================================================

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'highlight' | 'goldBorder';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'highlight':
        return styles.highlight;
      case 'goldBorder':
        return styles.goldBorder;
      default:
        return styles.default;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.base, getVariantStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, getVariantStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  default: {},
  highlight: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  goldBorder: {
    borderColor: colors.gold,
  },
});
