export const typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  h5: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  subtitle1: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  subtitle2: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body1: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  body2: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
} as const;

export type Typography = typeof typography;
