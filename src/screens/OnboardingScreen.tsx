import { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useThemeControl, ThemeColors } from '../theme';
import { GradientBackground, GlassButton } from '../components/glass';
import { spacing, radii } from '../theme/tokens';

const TOTAL_PAGES = 4;

interface OnboardingScreenProps {
  onComplete: (initialRoute?: string) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useThemeControl();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

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
    // Skip to the setup page (page 2), not past it
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
            <Text style={styles.pagePlaceholder}>Welcome</Text>
          </View>

          {/* Page 2: Features */}
          <View style={[styles.page, { width: screenWidth }]}>
            <Text style={styles.pagePlaceholder}>Features</Text>
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
      fontSize: 16,
      fontWeight: '500',
      color: colors.textSecondary,
    },
  });
