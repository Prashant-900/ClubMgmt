import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius } from '../theme';

/**
 * Rectangular profile banner with an animated three-ribbon wave — the RN twin of
 * the web `.profile-wave` (solid Google-blue card, drifting green/red/yellow
 * crests, white initials). No SVG: each ribbon is a row of overlapping circles
 * ("crests") sitting on a solid color base, translated horizontally on a loop so
 * the waves drift. Front-to-back order matches web: yellow lowest/front, red
 * mid, green highest/back.
 */

const CREST = 60; // crest circle diameter
const SPACING = CREST * 0.62; // center-to-center (overlap for a continuous crest line)
const COUNT = 16; // enough crests to cover ~2x width for a seamless loop

interface RibbonProps {
  color: string;
  /** height (px from banner bottom) of the crest center line */
  baseline: number;
  duration: number;
}

function Ribbon({ color, baseline, duration }: RibbonProps) {
  const tx = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shift = SPACING * (COUNT / 2);
    const loop = Animated.loop(
      Animated.timing(tx, {
        toValue: -shift,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [tx, duration]);

  const crests = Array.from({ length: COUNT });

  return (
    <View
      pointerEvents="none"
      style={[styles.ribbonWrap, { height: baseline + CREST / 2 }]}>
      {/* Solid base fills from the crest center line down to the banner bottom */}
      <View style={[styles.base, { height: baseline, backgroundColor: color }]} />
      {/* Scalloped crest line — circle centers sit on the base's top edge */}
      <Animated.View style={[styles.crestRow, { transform: [{ translateX: tx }] }]}>
        {crests.map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: i * SPACING,
              bottom: baseline - CREST / 2,
              width: CREST,
              height: CREST,
              borderRadius: CREST / 2,
              backgroundColor: color,
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

interface ProfileWaveBannerProps {
  initials: string;
  onPress?: () => void;
  height?: number;
}

export function ProfileWaveBanner({
  initials,
  onPress,
  height = 112,
}: ProfileWaveBannerProps) {
  const body = (
    <View style={[styles.banner, { height }]}>
      {/* back → front: green (highest), red (mid), yellow (lowest) */}
      <Ribbon color="#34a853" baseline={38} duration={14000} />
      <Ribbon color="#ea4335" baseline={26} duration={11000} />
      <Ribbon color="#fbbc05" baseline={14} duration={9000} />
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="View your profile"
        style={styles.pressable}>
        {body}
      </Pressable>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  banner: {
    borderRadius: radius.xl,
    backgroundColor: '#4285f4', // solid Google blue
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  ribbonWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  base: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  crestRow: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    top: 0,
    right: 0,
  },
  initials: {
    zIndex: 10,
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
