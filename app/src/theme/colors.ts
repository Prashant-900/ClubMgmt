/**
 * GitHub-inspired dark palette, ported from the web frontend so the mobile
 * app matches it 1:1. Kept as flat constants (no theming lib) for a clean
 * bare React Native setup.
 */

export const colors = {
  // Surfaces
  canvas: '#0d1117', // page background
  surface: '#161b22', // cards / subtle panels
  inset: '#010409', // deepest inset (code blocks, wells)
  surfaceHover: '#1c2129',

  // Borders
  border: '#30363d',
  borderMuted: '#21262d',

  // Text
  text: '#e6edf3', // primary
  textMuted: '#8b949e', // secondary
  textSubtle: '#6e7681', // tertiary
  textDisabled: '#484f58',

  // Accent (primary action)
  accent: '#1f6feb',
  accentEmphasis: '#388bfd',
  accentSubtle: 'rgba(56,139,253,0.15)',

  // Success
  success: '#238636',
  successEmphasis: '#3fb950',
  successSubtle: 'rgba(63,185,80,0.15)',

  // Danger
  danger: '#da3633',
  dangerEmphasis: '#f85149',
  dangerSubtle: 'rgba(248,81,73,0.15)',

  // Warning
  warning: '#9e6a03',
  warningEmphasis: '#d29922',
  warningSubtle: 'rgba(210,153,34,0.15)',

  // Role accents
  roleAdmin: '#a371f7',
  roleCoordinator: '#79c0ff',
  roleMember: '#3fb950',

  // Neutral chip
  neutralSubtle: 'rgba(139,148,158,0.15)',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Contribution heatmap intensity ramp (low → high). */
export const heatmapRamp = [
  '#161b22', // 0 — empty
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353', // max
] as const;

export type ColorName = keyof typeof colors;
