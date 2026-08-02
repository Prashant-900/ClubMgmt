import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Four-color "</>" brand mark — the RN twin of the web `LogoMark`. Built from
 * rotated View "sticks" (no react-native-svg dependency; the npm registry is
 * locked down in this workspace). Each chevron is two colored arms:
 *   "<"  → red (top arm) + blue (bottom arm)
 *   ">"  → green (top arm) + yellow (bottom arm)
 * Renders with no background so it can sit inside a transparent outlined box.
 */

const RED = '#ea4335';
const BLUE = '#4285f4';
const GREEN = '#34a853';
const YELLOW = '#fbbc05';

interface StickProps {
  cx: number;
  cy: number;
  length: number;
  thickness: number;
  angleDeg: number;
  color: string;
}

/** A single rounded bar, centered on (cx, cy) and rotated to `angleDeg`. */
function Stick({ cx, cy, length, thickness, angleDeg, color }: StickProps) {
  return (
    <View
      style={{
        position: 'absolute',
        left: cx - length / 2,
        top: cy - thickness / 2,
        width: length,
        height: thickness,
        borderRadius: thickness / 2,
        backgroundColor: color,
        transform: [{ rotate: `${angleDeg}deg` }],
      }}
    />
  );
}

interface ChevronProps {
  cw: number;
  ch: number;
  thickness: number;
  /** 'left' → "<", 'right' → ">" */
  dir: 'left' | 'right';
  topColor: string;
  bottomColor: string;
}

function Chevron({ cw, ch, thickness, dir, topColor, bottomColor }: ChevronProps) {
  const arm = Math.sqrt(cw * cw + (ch / 2) * (ch / 2));
  // Angle of a line rising over run cw and rise ch/2.
  const a = (Math.atan2(ch / 2, cw) * 180) / Math.PI;

  // For "<": top arm goes from (cw,0)→(0,ch/2) [angle 180-a], bottom (0,ch/2)→(cw,ch) [angle a].
  // For ">": top arm goes from (0,0)→(cw,ch/2) [angle a], bottom (cw,ch/2)→(0,ch) [angle 180-a].
  const topAngle = dir === 'left' ? 180 - a : a;
  const bottomAngle = dir === 'left' ? a : 180 - a;

  return (
    <View style={{ width: cw, height: ch }}>
      {/* top arm */}
      <Stick
        cx={cw / 2}
        cy={ch / 4}
        length={arm}
        thickness={thickness}
        angleDeg={topAngle}
        color={topColor}
      />
      {/* bottom arm */}
      <Stick
        cx={cw / 2}
        cy={(3 * ch) / 4}
        length={arm}
        thickness={thickness}
        angleDeg={bottomAngle}
        color={bottomColor}
      />
    </View>
  );
}

interface BracketMarkProps {
  /** Nominal square size the mark should fit within. */
  size?: number;
}

export function BracketMark({ size = 24 }: BracketMarkProps) {
  const cw = size * 0.3;
  const ch = size * 0.66;
  const thickness = Math.max(2, size * 0.1);
  const gap = size * 0.14;

  return (
    <View style={[styles.row, { gap }]}>
      <Chevron
        cw={cw}
        ch={ch}
        thickness={thickness}
        dir="left"
        topColor={RED}
        bottomColor={BLUE}
      />
      <Chevron
        cw={cw}
        ch={ch}
        thickness={thickness}
        dir="right"
        topColor={GREEN}
        bottomColor={YELLOW}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
