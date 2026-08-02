import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/**
 * Pill-style segmented control with a Google-style sliding indicator: a solid
 * rounded pill springs between segments (cycling green/red/yellow/blue per
 * position) while the selected label reads white. Replaces the old static
 * fill — every tab / period switch now slides.
 */
export const SEGMENT_COLORS = ['#34a853', '#ea4335', '#fbbc05', '#4285f4'] as const;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [rects, setRects] = useState<{ x: number; width: number }[]>([]);
  const measured = rects.length === options.length && rects.every(Boolean);

  const translateX = useRef(new Animated.Value(0)).current;
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!measured) return;
    const target = rects[activeIndex];
    if (!target) return;
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: target.x,
        useNativeDriver: false,
        speed: 20,
        bounciness: 8,
      }),
      Animated.spring(width, {
        toValue: target.width,
        useNativeDriver: false,
        speed: 20,
        bounciness: 8,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, measured, rects]);

  const activeColor = SEGMENT_COLORS[activeIndex % SEGMENT_COLORS.length];

  return (
    <View style={[styles.track, style]}>
      {measured && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            { backgroundColor: activeColor, width, transform: [{ translateX }] },
          ]}
        />
      )}

      {options.map((option, i) => {
        const selected = i === activeIndex;
        const selectedText = activeColor === '#fbbc05' ? '#202124' : '#ffffff';
        return (
          <Pressable
            key={option.value}
            style={styles.segment}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onLayout={(e) => {
              const { x, width: w } = e.nativeEvent.layout;
              setRects((prev) => {
                const next = [...prev];
                next[i] = { x, width: w };
                return next;
              });
            }}
          >
            <Text
              style={[
                styles.label,
                selected ? { color: selectedText } : { color: colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: colors.inset,
    padding: 4,
    alignSelf: 'flex-start',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: radius.pill,
  },
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.small,
    fontWeight: '600',
  },
});
