import type { Colors } from './types';

/**
 * MINIMAL Light theme — restrained slate + forest palette.
 * No neon, no electric blue, no candy colors.
 * Primary is a cool forest-teal; surfaces are off-white paper tones.
 */
export const lightColors: Colors = {
  primary: {
    50:  '#F3F6F5',
    100: '#E2EBE8',
    200: '#C5D6D1',
    300: '#9DB8B0',
    400: '#6E9288',
    500: '#4A6F66',
    600: '#3A5851',
    700: '#2E4641',
    800: '#253834',
    900: '#1B2A27',
  },
  secondary: {
    50:  '#F7F5F2',
    100: '#ECE7DF',
    200: '#D8CEBF',
    300: '#BEAC95',
    400: '#A18A6C',
    500: '#836A4C',
    600: '#68543C',
    700: '#50402E',
    800: '#3C3023',
    900: '#2A2219',
  },
  neutral: {
    50:  '#FAFAF9',
    100: '#F2F2F0',
    200: '#E5E5E1',
    300: '#CFCEC8',
    400: '#A8A79F',
    500: '#7E7C74',
    600: '#5D5B55',
    700: '#474540',
    800: '#2F2E2B',
    900: '#1A1918',
  },
  error: {
    50:  '#FBF4F3',
    100: '#F5E2E0',
    500: '#B44A42',
    600: '#963C36',
    700: '#76302B',
  },
  warning: {
    50:  '#FBF7EF',
    100: '#F4E7CC',
    500: '#9C7A2E',
    600: '#7D6124',
  },
  success: {
    50:  '#F1F6F1',
    100: '#DCE7DB',
    500: '#4F7A52',
    600: '#3F6041',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F7F7F5',
    screen: '#FBFBF9',
  },
  text: {
    primary: '#1A1918',
    secondary: '#474540',
    tertiary: '#7E7C74',
    inverse: '#FBFBF9',
    disabled: '#A8A79F',
  },
  border: {
    light: '#E5E5E1',
    medium: '#CFCEC8',
    dark: '#A8A79F',
  },
};
