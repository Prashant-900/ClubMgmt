import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';

/**
 * GDSC 7-dot morphing loader — React Native port of the web loader
 * (frontend .dsc-loader / @keyframes dsc-dot*). Seven Google-colored dots run a
 * single ~6s morph sequence on a shared looping driver (0..1). Each dot maps the
 * CSS keyframe stops to Animated interpolations: opacity, scale, width, left
 * (translateX) and rotation. No CSS, no SVG — pure RN Animated so it works in
 * the bare workflow without new native deps.
 *
 * The web art board is 225x150 with 40px dots that grow to 100px. We keep those
 * exact numbers so the motion reads identically, then scale the whole board with
 * the `size` prop.
 */

const BOARD_W = 225;
const BOARD_H = 150;
const DOT = 40; // base dot size
const GROWN = 100; // grown bar width

const BLUE = '#4285f4';
const RED = '#ea4335';
const GREEN = '#34a853';
const YELLOW = '#fbbc05';

// Shared 6s timeline. Progress runs 0..1; keyframe percents map to that range.
const p = (pct: number) => pct / 100;

interface DotSpec {
  /** static left offset (px on the 225-wide board) */
  left: number;
  /** static top OR bottom anchor */
  top?: number;
  bottom?: number;
  color: string;
  /** rotate around the left edge (dot1/dot5/dot7 grow into rotating bars) */
  pivotLeft?: boolean;
  zIndex?: number;
  opacity: { in: number[]; out: number[] };
  scale: { in: number[]; out: number[] };
  width?: { in: number[]; out: number[] };
  translateX?: { in: number[]; out: number[] };
  rotate?: { in: number[]; out: string[] };
  /** color shift over time (dot2 red→yellow) */
  colorShift?: { in: number[]; out: string[] };
}

// Faithful transcription of the CSS @keyframes (see globals.css dsc-dot1..7).
const DOTS: DotSpec[] = [
  {
    // dot1 — blue, grows right + rotates ±30, settles at +30
    left: 0,
    top: 55,
    color: BLUE,
    pivotLeft: true,
    zIndex: 2,
    opacity: { in: [0, p(5), 1], out: [0, 1, 1] },
    scale: { in: [0, p(5), 1], out: [0, 1, 1] },
    width: {
      in: [0, p(25), p(30), 1],
      out: [DOT, DOT, GROWN, GROWN],
    },
    rotate: {
      in: [0, p(30), p(35), p(45), p(50), 1],
      out: ['0deg', '0deg', '-30deg', '30deg', '30deg', '30deg'],
    },
  },
  {
    // dot2 — red→yellow, slides right, pops, reappears rotated -30
    left: 62.5,
    top: 55,
    color: RED,
    opacity: {
      in: [0, p(5), p(10), 1],
      out: [0, 0, 1, 1],
    },
    scale: {
      in: [0, p(10), p(20), p(25), p(40), 1],
      out: [0, 0, 1, 0, 0, 0],
    },
    // NOTE: dot2 does two things — a first shrink, then re-grows as a rotated
    // bar. We approximate its "reappear" via the colorShift + rotate below and
    // keep it visible at the end as the yellow bar.
    width: {
      in: [0, p(20), p(40), 1],
      out: [DOT, GROWN, GROWN, GROWN],
    },
    translateX: {
      in: [0, p(15), p(20), p(40), 1],
      out: [0, 0, 62.5, 62.5, 62.5],
    },
    rotate: {
      in: [0, p(40), 1],
      out: ['0deg', '-30deg', '-30deg'],
    },
    colorShift: {
      in: [0, p(30), p(36), 1],
      out: [RED, RED, YELLOW, YELLOW],
    },
  },
  {
    // dot3 — green pulse (grows then pops out)
    left: 62.5,
    bottom: 0,
    color: GREEN,
    opacity: { in: [0, p(10), p(15), 1], out: [0, 0, 1, 1] },
    scale: {
      in: [0, p(15), p(25), p(30), 1],
      out: [0, 1, 1, 0, 0],
    },
    width: {
      in: [0, p(20), p(25), 1],
      out: [DOT, GROWN, DOT, DOT],
    },
    translateX: {
      in: [0, p(20), p(25), 1],
      out: [0, 0, 60, 60],
    },
  },
  {
    // dot4 — green pulse, offset a touch later than dot3
    left: 62.5,
    top: 55,
    color: GREEN,
    opacity: { in: [0, p(15), p(20), 1], out: [0, 0, 1, 1] },
    scale: {
      in: [0, p(20), p(30), p(35), 1],
      out: [0, 1, 1, 0, 0],
    },
    width: {
      in: [0, p(25), p(30), 1],
      out: [DOT, GROWN, DOT, DOT],
    },
    translateX: {
      in: [0, p(25), p(30), 1],
      out: [0, 0, 60, 60],
    },
  },
  {
    // dot5 — green, grows right + rotates ±30, settles at +30 (mirrors dot1)
    left: 62.5,
    top: 55,
    color: GREEN,
    pivotLeft: true,
    opacity: { in: [0, p(10), p(15), 1], out: [0, 0, 1, 1] },
    scale: { in: [0, p(15), 1], out: [0, 1, 1] },
    width: {
      in: [0, p(15), p(20), 1],
      out: [DOT, DOT, GROWN, GROWN],
    },
    translateX: {
      in: [0, p(15), p(20), 1],
      out: [0, 0, 62.5, 62.5],
    },
    rotate: {
      in: [0, p(30), p(35), p(45), p(50), 1],
      out: ['0deg', '0deg', '-30deg', '30deg', '30deg', '30deg'],
    },
  },
  {
    // dot6 — yellow pulse
    left: 62.5,
    bottom: 0,
    color: YELLOW,
    opacity: { in: [0, p(15), p(20), 1], out: [0, 0, 1, 1] },
    scale: {
      in: [0, p(20), p(27.5), p(32.5), 1],
      out: [0, 1, 1, 0, 0],
    },
    width: {
      in: [0, p(22.5), p(27.5), 1],
      out: [DOT, GROWN, DOT, DOT],
    },
    translateX: {
      in: [0, p(22.5), p(27.5), 1],
      out: [0, 0, 60, 60],
    },
  },
  {
    // dot7 — red, appears late as a rotated bar behind dot1
    left: 0,
    top: 55,
    color: RED,
    pivotLeft: true,
    zIndex: 1,
    opacity: { in: [0, p(35), 1], out: [0, 1, 1] },
    scale: {
      in: [0, p(35), p(36), 1],
      out: [0, 0, 1, 1],
    },
    width: {
      in: [0, p(36), 1],
      out: [DOT, GROWN, GROWN],
    },
    rotate: {
      in: [0, p(36), 1],
      out: ['0deg', '-30deg', '-30deg'],
    },
  },
];

function Dot({ spec, driver }: { spec: DotSpec; driver: Animated.Value }) {
  const opacity = driver.interpolate({
    inputRange: spec.opacity.in,
    outputRange: spec.opacity.out,
    extrapolate: 'clamp',
  });
  const scale = driver.interpolate({
    inputRange: spec.scale.in,
    outputRange: spec.scale.out,
    extrapolate: 'clamp',
  });
  const width = spec.width
    ? driver.interpolate({
        inputRange: spec.width.in,
        outputRange: spec.width.out,
        extrapolate: 'clamp',
      })
    : DOT;
  const translateX = spec.translateX
    ? driver.interpolate({
        inputRange: spec.translateX.in,
        outputRange: spec.translateX.out,
        extrapolate: 'clamp',
      })
    : 0;
  const rotate = spec.rotate
    ? driver.interpolate({
        inputRange: spec.rotate.in,
        outputRange: spec.rotate.out,
        extrapolate: 'clamp',
      })
    : '0deg';
  const backgroundColor = spec.colorShift
    ? driver.interpolate({
        inputRange: spec.colorShift.in,
        outputRange: spec.colorShift.out,
        extrapolate: 'clamp',
      })
    : spec.color;

  const positional: ViewStyle = {
    left: spec.left,
    ...(spec.top !== undefined ? { top: spec.top } : {}),
    ...(spec.bottom !== undefined ? { bottom: spec.bottom } : {}),
    zIndex: spec.zIndex ?? 0,
  };

  return (
    <Animated.View
      style={[
        styles.dot,
        positional,
        {
          width,
          backgroundColor,
          opacity,
          transform: [{ translateX }, { scale }, { rotate }],
        },
      ]}
    />
  );
}

interface GdscLoaderProps {
  /** Scales the whole 225x150 board. 1 = full size. */
  size?: number;
}

export function GdscLoader({ size = 1 }: GdscLoaderProps) {
  const driver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(driver, {
        toValue: 1,
        duration: 6000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false, // width/color/left need layout driver
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [driver]);

  const boardStyle = useMemo<ViewStyle>(
    () => ({
      width: BOARD_W * size,
      height: BOARD_H * size,
      transform: [{ scale: size }],
    }),
    [size],
  );

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <View style={boardStyle}>
        <View style={styles.board}>
          {DOTS.map((spec, i) => (
            <Dot key={i} spec={spec} driver={driver} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    width: BOARD_W,
    height: BOARD_H,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    height: DOT,
    borderRadius: 9999,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});

/** Full-screen white loader overlay — mirrors the web `.dsc-loader-overlay`. */
export function GdscLoaderScreen() {
  return (
    <View style={styles.overlay}>
      <GdscLoader size={0.9} />
    </View>
  );
}
