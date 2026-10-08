import type { Colors } from './types';

/**
 * MINIMAL Dark theme — true near-black with soft warm grey surfaces.
 * Primary is the same forest-teal toned down (no neon accents).
 * Designed for OLED battery efficiency + no eye strain at night.
 */
export const darkColors: Colors = {
  primary: {
    50:  '#1B2A27',
    100: '#253834',
    200: '#2E4641',
    300: '#3A5851',
    400: '#4A6F66',
    500: '#6E9288',
    600: '#8BAEA6',
    700: '#ACC8C1',
    800: '#CDE0DC',
    900: '#EAF1EF',
  },
  secondary: {
    50:  '#2A2219',
    100: '#3C3023',
    200: '#50402E',
    300: '#68543C',
    400: '#836A4C',
    500: '#A18A6C',
    600: '#BFA586',
    700: '#D4BF9F',
    800: '#E6D6B9',
    900: '#F3E9D6',
  },
  neutral: {
    50:  '#141413',
    100: '#1A1918',
    200: '#262523',
    300: '#34322F',
    400: '#4B4944',
    500: '#6D6A63',
    600: '#928E85',
    700: '#B7B2A8',
    800: '#D6D1C7',
    900: '#EAE7E1',
  },
  error: {
    50:  '#2A1918',
    100: '#3D2321',
    500: '#C2746E',
    600: '#D4928C',
    700: '#E3B1AD',
  },
  warning: {
    50:  '#292214',
    100: '#3D3320',
    500: '#B9954A',
    600: '#CFB06A',
  },
  success: {
    50:  '#182319',
    100: '#213223',
    500: '#6E9770',
    600: '#8EB290',
  },
  background: {
    primary: '#141413',
    secondary: '#1A1918',
    screen: '#0F0F0E',
  },
  text: {
    primary: '#EAE7E1',
    secondary: '#B7B2A8',
    tertiary: '#8A857D',
    inverse: '#141413',
    disabled: '#4B4944',
  },
  border: {
    light: '#262523',
    medium: '#34322F',
    dark: '#4B4944',
  },
};
