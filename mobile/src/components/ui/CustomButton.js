import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, theme } from '../../theme';

const CustomButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary', // primary, secondary, outlined, ghost, danger
  size = 'medium', // small, medium, large
  fullWidth = false,
  icon = null,
  iconPosition = 'left', // left, right
  style = {},
  textStyle = {},
  leftComponent = null,
  rightComponent = null,
  ...props
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.baseButton, styles[size], styles[variant]];
    
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }
    
    if (style) {
      baseStyle.push(style);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.baseText, styles[`${size}Text`], styles[`${variant}Text`]];
    
    if (disabled || loading) {
      baseStyle.push(styles.disabledText);
    }
    
    if (textStyle) {
      baseStyle.push(textStyle);
    }
    
    return baseStyle;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' ? colors.surface : colors.primary}
            style={styles.loader}
          />
          <Text style={getTextStyle()}>Cargando...</Text>
        </View>
      );
    }

    return (
      <>
        {leftComponent}
        {icon && iconPosition === 'left' && (
          <Icon 
            name={icon} 
            size={getIconSize()} 
            color={getIconColor()} 
            style={styles.iconLeft}
          />
        )}
        <Text style={getTextStyle()}>{title}</Text>
        {icon && iconPosition === 'right' && (
          <Icon 
            name={icon} 
            size={getIconSize()} 
            color={getIconColor()} 
            style={styles.iconRight}
          />
        )}
        {rightComponent}
      </>
    );
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const getIconColor = () => {
    if (disabled || loading) {
      return colors.textLight;
    }
    
    switch (variant) {
      case 'primary':
        return colors.surface;
      case 'secondary':
        return colors.surface;
      case 'outlined':
        return colors.primary;
      case 'ghost':
        return colors.primary;
      case 'danger':
        return colors.surface;
      default:
        return colors.surface;
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.small,
  },
  small: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  medium: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  large: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },
  disabled: {
    backgroundColor: colors.textLight + '40',
    borderColor: colors.textLight + '40',
  },
  fullWidth: {
    width: '100%',
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  primaryText: {
    color: colors.surface,
  },
  secondaryText: {
    color: colors.surface,
  },
  outlinedText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.surface,
  },
  disabledText: {
    color: colors.textLight,
  },
  iconLeft: {
    marginRight: theme.spacing.sm,
  },
  iconRight: {
    marginLeft: theme.spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loader: {
    marginRight: theme.spacing.sm,
  },
});

export default CustomButton;