import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TabParamList } from './types';
import { colors } from '../theme';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ContributionsScreen } from '../screens/contributions/ContributionsScreen';
import { MembersScreen } from '../screens/members/MembersScreen';
import { LeaderboardScreen } from '../screens/leaderboard/LeaderboardScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Profile glyph drawn from plain Views (circle head + rounded shoulders) so we
 * get a real icon — no emoji, and no react-native-svg dependency. Mirrors the
 * classic "person" silhouette used across the web.
 */
function ProfileGlyph({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Head */}
      <View
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: (size * 0.34) / 2,
          backgroundColor: color,
        }}
      />
      {/* Shoulders / torso */}
      <View
        style={{
          marginTop: size * 0.07,
          width: size * 0.78,
          height: size * 0.34,
          borderTopLeftRadius: size * 0.34,
          borderTopRightRadius: size * 0.34,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/**
 * Google-style floating tab bar. A white pill (rounded, shadowed) hovers above
 * the content with breathing room on all sides instead of a full-width strip.
 * A single circular indicator slides horizontally between tabs on switch; its
 * hue cycles green/red/yellow/blue per tab position (echoing the web app's
 * colored underlines). The active label is Google blue; inactive tabs are
 * muted grey. Icons are flat glyphs / View-composed shapes — no emoji, no SVG
 * dependency.
 */
const INDICATOR_BG = [
  '#34a853', // green  (Home)
  '#ea4335', // red    (Contributions)
  '#fbbc05', // yellow (Members)
  '#4285f4', // blue   (Leaderboard)
  '#34a853', // green  (Profile — cycles back)
] as const;

const TABS: {
  name: keyof TabParamList;
  label: string;
  glyph?: string; // monochrome symbol (flat, not a color emoji)
  custom?: 'profile'; // View-composed icon
}[] = [
  { name: 'Home', label: 'Home', glyph: '⌂' },
  { name: 'Contributions', label: 'Logs', glyph: '✎' },
  { name: 'Members', label: 'Members', glyph: '⧉' },
  { name: 'Leaderboard', label: 'Rank', glyph: '☆' },
  { name: 'Profile', label: 'Profile', custom: 'profile' },
];

const BAR_HEIGHT = 62;
const CHIP = 34; // circular indicator diameter

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // One shared progress value (0..N-1) drives the sliding indicator.
  const progress = useRef(new Animated.Value(0)).current;

  // Center positions (in bar coordinates) for each item, measured on layout.
  const itemCenters = useRef<number[]>([]);
  const [layoutVersion, setLayoutVersion] = React.useState(0);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: state.index,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  }, [state.index, progress]);

  const chipTranslate = useMemo(() => {
    const inputRange = state.routes.map((_, i) => i);
    const outputRange = state.routes.map((_, i) => {
      const center = itemCenters.current[i] ?? 0;
      return center - CHIP / 2;
    });
    return progress.interpolate({
      inputRange,
      outputRange,
      extrapolate: 'clamp',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.routes.length, layoutVersion]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {/* Circular sliding indicator */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.chip,
            {
              backgroundColor: INDICATOR_BG[state.index],
              transform: [{ translateX: chipTranslate }],
            },
          ]}
        />

        {state.routes.map((route, index) => {
          const tab = TABS[index];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={tab.label}
              onPress={onPress}
              onLongPress={onLongPress}
              hitSlop={6}
              style={styles.item}
              onLayout={(e) => {
                itemCenters.current[index] =
                  e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2;
                setLayoutVersion((v) => v + 1);
              }}>
              {/* Icon — white on the colored chip when active (dark on yellow
                  so it stays visible), muted grey otherwise. */}
              <View style={styles.iconWrap}>
                {tab.custom === 'profile' ? (
                  <ProfileGlyph
                    color={
                      isFocused
                        ? index === 2
                          ? '#202124'
                          : '#ffffff'
                        : colors.textSubtle
                    }
                    size={17}
                  />
                ) : (
                  <Text
                    style={[
                      styles.glyph,
                      {
                        color: isFocused
                          ? index === 2
                            ? '#202124'
                            : '#ffffff'
                          : colors.textSubtle,
                      },
                    ]}>
                    {tab.glyph}
                  </Text>
                )}
              </View>
              {/* Label */}
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  isFocused
                    ? { color: colors.accentEmphasis, fontWeight: '700' }
                    : { color: colors.textMuted, fontWeight: '600' },
                ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Role-agnostic bottom tab bar. Screen content is role-gated internally, but
 * the bar itself is stable so navigation never shifts under the user. */
export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      // Keep every tab screen mounted once visited so switching tabs swaps only
      // the content instantly — no full-screen re-mount / re-fetch flash (which
      // read like the whole page reloading). Screens still lazy-mount on first
      // visit, then stay alive in the background.
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        lazy: true,
        sceneStyle: { paddingBottom: BAR_HEIGHT + 28 },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Contributions" component={ContributionsScreen} />
      <Tab.Screen name="Members" component={MembersScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    borderRadius: 31,
    backgroundColor: colors.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderMuted,
    paddingHorizontal: 6,
    shadowColor: '#202124',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 14,
  },
  chip: {
    position: 'absolute',
    top: 4,
    left: 0,
    width: CHIP,
    height: CHIP,
    borderRadius: CHIP / 2,
    // Solid brand color (no translucency — Google vibe).
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    width: CHIP,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  label: {
    fontSize: 11,
  },
});
