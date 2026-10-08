export type SpacingKey =
  | 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl' | 'xxxxxl';

export type RadiusKey =
  | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';

export type ColorScale = {
  50: string;
  100: string;
  200?: string;
  300?: string;
  400?: string;
  500: string;
  600: string;
  700?: string;
  800?: string;
  900?: string;
};

export interface Colors {
  primary: ColorScale;
  secondary: ColorScale;
  neutral: ColorScale;
  error: ColorScale;
  warning: ColorScale;
  success: ColorScale;
  background: {
    primary: string;
    secondary: string;
    screen: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    disabled: string;
  };
  border: {
    light: string;
    medium: string;
    dark: string;
  };
}

export interface Spacing {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  xxxxl: number;
  xxxxxl: number;
}

export interface Radius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  full: number;
}

export type TypographyVariant =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5'
  | 'subtitle1' | 'subtitle2'
  | 'body1' | 'body2'
  | 'caption' | 'overline' | 'button';

export interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '300' | '400' | '500' | '600' | '700' | '800';
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export type Typography = Record<TypographyVariant, TypographyStyle>;

export interface Theme {
  colors: Colors;
  spacing: Spacing;
  radius: Radius;
  typography: Typography;
}
