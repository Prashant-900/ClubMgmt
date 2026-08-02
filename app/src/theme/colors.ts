/**
 * Google-style light palette — mirrors the web frontend's `@theme` tokens so
 * the mobile app matches it 1:1. Solid colors only (no gradients); the historic
 * key *names* are preserved but their *values* are remapped to light so every
 * consumer flips automatically.
 *
 * Convention: the base key (e.g. `success`) is the pure Google hue used for
 * fills/icons; `*Emphasis` is the darker variant for text/links on white; and
 * `*Subtle` is a SOLID opaque tint (no alpha) used for chip/banner backgrounds
 * so the page never bleeds through.
 *
 * Palette: blue #4285F4 · green #34A853 · yellow #FBBC05 · red #EA4335
 */

export const colors = {
  // Surfaces
  canvas: '#ffffff', // page background
  surface: '#f8f9fa', // cards / subtle panels
  inset: '#f1f3f4', // deepest inset (wells, insets, chips)
  surfaceHover: '#f1f3f4',

  // Borders
  border: '#dadce0',
  borderMuted: '#e8eaed',

  // Text (Google grey scale)
  text: '#202124', // primary  (grey-900)
  textMuted: '#5f6368', // secondary (grey-700)
  textSubtle: '#80868b', // tertiary (grey-600)
  textDisabled: '#b0b3b8',

  // Accent — Google blue
  accent: '#4285f4', // fills, icons, primary action
  accentEmphasis: '#1a73e8', // darker blue for text/links/active
  accentSubtle: '#e8f0fe', // solid blue chip

  // Success — Google green
  success: '#34a853',
  successEmphasis: '#188038', // darker green for text on white
  successSubtle: '#e6f4ea', // solid green chip

  // Danger — Google red
  danger: '#ea4335',
  dangerEmphasis: '#c5221f', // darker red for text on white
  dangerSubtle: '#fce8e6', // solid red chip

  // Warning — Google yellow (pair with dark text; amber fg passes contrast)
  warning: '#fbbc05',
  warningEmphasis: '#b06000', // amber that passes contrast on white
  warningSubtle: '#fef7e0', // solid yellow chip

  // Role accents (aligned to Google palette — no purple)
  roleAdmin: '#ea4335', // red
  roleCoordinator: '#4285f4', // blue
  roleMember: '#34a853', // green

  // Neutral chip
  neutralSubtle: '#f1f3f4',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

/** Contribution heatmap intensity ramp (low → high): white → Google-green. */
export const heatmapRamp = [
  '#ebedf0', // 0 — empty
  '#b7e1c1',
  '#6dc287',
  '#34a853',
  '#188038', // max
] as const;

export type ColorName = keyof typeof colors;
