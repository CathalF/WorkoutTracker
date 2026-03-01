import { useRef, useState, useMemo, useEffect } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeControl, ThemeColors } from '../theme';
import { GradientBackground, GlassCard, GlassButton } from '../components/glass';
import { spacing, radii, typography } from '../theme/tokens';

const TOTAL_PAGES = 4;

const FEATURES = [
  {
    icon: 'fitness-outline' as const,
    title: 'Log Workouts',
    description: 'Structured sets, reps, and weight tracking with minimal taps',
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Track Progress',
    description: 'Charts and personal records that show your strength gains',
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Build Routine',
    description: 'Save templates and programs for your training splits',
  },
];

interface OnboardingScreenProps {
  onComplete: (initialRoute?: string) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useThemeControl();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Animation refs — track which pages have been animated
  const animatedPages = useRef<Set<number>>(new Set());

  // Page 0 (Welcome) animations
  const welcomeFade = useRef(new Animated.Value(0)).current;
  const welcomeSlide = useRef(new Animated.Value(30)).current;

  // Page 1 (Features) card animations — staggered
  const featureAnims = useRef(
    FEATURES.map(() => ({
      fade: new Animated.Value(0),
      slide: new Animated.Value(30),
    }))
  ).current;

  // Trigger entrance animations per page
  useEffect(() => {
    if (animatedPages.current.has(currentPage)) return;
    animatedPages.current.add(currentPage);

    if (currentPage === 0) {
      Animated.parallel([
        Animated.timing(welcomeFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (currentPage === 1) {
      const anims = featureAnims.flatMap((anim, index) => [
        Animated.timing(anim.fade, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.slide, {
          toValue: 0,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ]);
      Animated.parallel(anims).start();
    }
  }, [currentPage, welcomeFade, welcomeSlide, featureAnims]);

  // Trigger page 0 animation on mount
  useEffect(() => {
    animatedPages.current.add(0);
    Animated.parallel([
      Animated.timing(welcomeFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(welcomeSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [welcomeFade, welcomeSlide]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / screenWidth);
    if (page !== currentPage && page >= 0 && page < TOTAL_PAGES) {
      setCurrentPage(page);
    }
  };

  const handleNext = () => {
    if (currentPage < TOTAL_PAGES - 1) {
      scrollRef.current?.scrollTo({ x: (currentPage + 1) * screenWidth, animated: true });
    }
  };

  const handleSkip = () => {
    // Skip to the setup page (page index 2), not past it
    scrollRef.current?.scrollTo({ x: 2 * screenWidth, animated: true });
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
        >
          {/* Page 1: Welcome */}
          <View style={[styles.page, { width: screenWidth }]}>
            <Animated.View
              style={[
                styles.welcomeContent,
                { opacity: welcomeFade, transform: [{ translateY: welcomeSlide }] },
              ]}
            >
              <View style={styles.iconBackdrop}>
                <Ionicons name="barbell-outline" size={80} color={colors.primary} />
              </View>
              <Text style={styles.welcomeTitle}>Workout Tracker</Text>
              <Text style={styles.welcomeTagline}>
                Track your lifts. See your progress.
              </Text>
            </Animated.View>
          </View>

          {/* Page 2: Features */}
          <View style={[styles.page, { width: screenWidth }]}>
            <View style={styles.featuresContent}>
              <Text style={styles.sectionTitle}>Everything you need</Text>
              {FEATURES.map((feature, index) => (
                <Animated.View
                  key={feature.title}
                  style={{
                    opacity: featureAnims[index].fade,
                    transform: [{ translateY: featureAnims[index].slide }],
                  }}
                >
                  <GlassCard style={styles.featureCard}>
                    <View style={styles.featureRow}>
                      <View style={styles.featureIconCircle}>
                        <Ionicons name={feature.icon} size={22} color="#FFFFFF" />
                      </View>
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureDescription}>
                          {feature.description}
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Page 3: Setup */}
          <View style={[styles.page, { width: screenWidth }]}>
            <Text style={styles.pagePlaceholder}>Setup</Text>
          </View>

          {/* Page 4: Ready */}
          <View style={[styles.page, { width: screenWidth }]}>
            <Text style={styles.pagePlaceholder}>Ready</Text>
          </View>
        </ScrollView>

        {/* Bottom controls: page dots + buttons */}
        <View style={styles.controls}>
          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.dot, currentPage === i && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.buttons}>
            {currentPage < TOTAL_PAGES - 1 ? (
              <>
                <Pressable onPress={handleSkip} hitSlop={8}>
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
                <GlassButton title="Next" onPress={handleNext} icon="arrow-forward" />
              </>
            ) : null}
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 56,
    },
    page: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    pagePlaceholder: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Welcome page
    welcomeContent: {
      alignItems: 'center',
    },
    iconBackdrop: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.glassSurface,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing['2xl'],
    },
    welcomeTitle: {
      fontSize: typography.size['3xl'],
      fontWeight: typography.weight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    welcomeTagline: {
      fontSize: typography.size.md,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // Features page
    featuresContent: {
      flex: 1,
      justifyContent: 'center',
      width: '100%',
      gap: spacing.base,
    },
    sectionTitle: {
      fontSize: typography.size.xl,
      fontWeight: typography.weight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    featureCard: {
      marginBottom: 0,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.base,
    },
    featureIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureTextContainer: {
      flex: 1,
    },
    featureTitle: {
      fontSize: typography.size.base,
      fontWeight: typography.weight.semibold,
      color: colors.text,
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: typography.size.sm,
      color: colors.textSecondary,
      lineHeight: typography.size.sm * typography.lineHeight.normal,
    },

    // Controls
    controls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: 48,
      paddingHorizontal: spacing.xl,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.glassBorder,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    buttons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    skipText: {
      fontSize: typography.size.base,
      fontWeight: typography.weight.medium,
      color: colors.textSecondary,
    },
  });
