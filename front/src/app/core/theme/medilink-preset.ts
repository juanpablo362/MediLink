import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Mantener sincronizado con src/styles/tokens.css */
const ink = {
  50: '#eef7f7',
  100: '#d5ebec',
  200: '#aed7da',
  300: '#7dbcc1',
  400: '#4f9aa1',
  500: '#347f87',
  600: '#286870',
  700: '#22555c',
  800: '#1f474d',
  900: '#1c3c42',
  950: '#0e2529',
};

const bone = {
  0: '#ffffff',
  50: '#fbf8f3',
  100: '#f4f0e9',
  200: '#e8e2d8',
  300: '#d5cdc0',
  400: '#aaa194',
  500: '#7a7266',
  600: '#5e584e',
  700: '#47423a',
  800: '#2e2a25',
  900: '#1e1b17',
  950: '#12100e',
};

export const MediLinkPreset = definePreset(Aura, {
  primitive: {
    borderRadius: { none: '0', xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '18px' },
  },
  semantic: {
    primary: ink,
    focusRing: { width: '3px', style: 'solid', color: '#e0603a', offset: '2px' },
    formField: {
      paddingX: '0.875rem',
      paddingY: '0.625rem',
      borderRadius: '{border.radius.md}',
    },
    colorScheme: {
      light: {
        surface: bone,
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.800}',
          focusColor: '{primary.900}',
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.600}',
          hoverMutedColor: '{surface.700}',
        },
        formField: {
          background: '{surface.0}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.500}',
          focusBorderColor: '{primary.600}',
          placeholderColor: '{surface.500}',
          color: '{surface.900}',
        },
        content: {
          borderColor: '{surface.200}',
        },
      },
    },
  },
  components: {
    button: {
      root: { label: { fontWeight: '600' }, paddingX: '1rem', paddingY: '0.625rem' },
    },
    dialog: {
      root: { borderRadius: '1rem' },
    },
    card: {
      root: { borderRadius: '1rem' },
    },
  },
});
