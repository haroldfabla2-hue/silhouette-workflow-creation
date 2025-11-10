import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Animated } from 'react-native';
import { useDispatch } from 'react-redux';
import { colors, theme } from '../theme';
import { setAppInitialized } from '../store/slices/uiSlice';

const SplashScreen = () => {
  const dispatch = useDispatch();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));

  useEffect(() => {
    // Animaciones de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Simular inicialización
    const timer = setTimeout(() => {
      dispatch(setAppInitialized(true));
    }, 2000);

    return () => clearTimeout(timer);
  }, [dispatch, fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo placeholder - reemplazar con logo real */}
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        
        <Text style={styles.appName}>Silhouette Workflow</Text>
        <Text style={styles.tagline}>
          Automatización inteligente de workflows
        </Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size="large" 
          color={colors.primary}
          style={styles.loader}
        />
        <Text style={styles.loadingText}>Inicializando aplicación...</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Versión 1.0.0</Text>
        <Text style={styles.copyright}>
          © 2025 Silhouette Workflow. Todos los derechos reservados.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.surface,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  loader: {
    marginBottom: theme.spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: theme.spacing.sm,
  },
  copyright: {
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default SplashScreen;