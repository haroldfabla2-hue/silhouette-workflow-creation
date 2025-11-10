import { DefaultTheme } from 'react-native-paper';

// Colores principales
export const colors = {
  primary: '#6366F1',
  primaryLight: '#A5B4FC',
  primaryDark: '#4338CA',
  secondary: '#10B981',
  secondaryLight: '#6EE7B7',
  secondaryDark: '#047857',
  accent: '#F59E0B',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Tema de la aplicación
export const theme = {
  ...DefaultTheme,
  roundness: 12,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryLight,
    onPrimary: '#FFFFFF',
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryLight,
    onSecondary: '#FFFFFF',
    surface: colors.surface,
    background: colors.background,
    onSurface: colors.text,
    error: colors.error,
    onError: '#FFFFFF',
    warning: colors.warning,
    success: colors.success,
    info: colors.info,
    disabled: colors.textLight,
    backdrop: colors.overlay,
    elevation: {
      level0: 'transparent',
      level1: colors.shadow,
      level2: colors.shadow,
      level3: colors.shadow,
      level4: colors.shadow,
      level5: colors.shadow,
    },
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  shadows: {
    small: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// Utilidades de estilo
export const createShadow = (level = 'medium') => theme.shadows[level];

export const getContrastColor = (backgroundColor) => {
  // Simple contraste para colores claros/oscuros
  const r = parseInt(backgroundColor.slice(1, 3), 16);
  const g = parseInt(backgroundColor.slice(3, 5), 16);
  const b = parseInt(backgroundColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? colors.text : colors.surface;
};

// Responsive utilities
export const getScreenDimensions = () => {
  const { width, height } = require('react-native').Dimensions.get('window');
  return { width, height };
};

export const isSmallScreen = () => {
  const { width } = getScreenDimensions();
  return width < 375;
};

export const isTablet = () => {
  const { width } = getScreenDimensions();
  return width > 768;
};