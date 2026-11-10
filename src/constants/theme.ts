// ==============================================================================
// THÈME DESIGN SYSTEM - MON VTC GESTION
// Style haut de gamme type Qonto / Revolut Pro pour chauffeur VTC
// ==============================================================================

export const colors = {
  // Fonds
  background: '#0B0F19', // Bleu nuit ultra sombre
  surface: '#151C2C',    // Carte / Surface surélevée
  surfaceLight: '#1E293B',// Éléments secondaires / inputs
  surfaceHighlight: '#26334D',
  
  // Accents VTC Prestige
  primary: '#2563EB',     // Bleu électrique signature
  primaryHover: '#1D4ED8',
  primaryMuted: 'rgba(37, 99, 235, 0.15)',
  
  gold: '#F59E0B',        // Ambre / Doré luxe
  goldMuted: 'rgba(245, 158, 11, 0.15)',

  // Statuts
  success: '#10B981',     // Vert émeraude validation / payé
  successMuted: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',     // Orange en attente
  danger: '#EF4444',      // Rouge alerte / impayé
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',

  // Textes
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#243049',
  borderLight: '#334155',
  
  // Neutral
  white: '#FFFFFF',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const typography = {
  titleHero: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
  },
  title2: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  amountLarge: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
};
