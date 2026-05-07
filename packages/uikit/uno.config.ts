import { defineConfig, presetAttributify, presetWind } from 'unocss'
import presetRemToPx from '@unocss/preset-rem-to-px'

export default defineConfig({
  presets: [
    presetWind(),
    presetAttributify(),
    presetRemToPx({ baseFontSize: 16 }),
  ],
  theme: {
    colors: {
      primary: 'var(--uikit-primary-color, hsl(203, 100%, 60%))',
      success: 'var(--uikit-success-color, hsl(155, 100%, 60%))',
      warning: 'var(--uikit-warning-color, hsl(38, 100%, 60%))',
      danger: 'var(--uikit-danger-color, hsl(350, 100%, 60%))',
      'bg-base': 'var(--uikit-bg-base, #ffffff)',
      'bg-secondary': 'var(--uikit-bg-secondary, #f3f4f6)',
      'text-primary': 'var(--uikit-text-primary, #111827)',
      'text-secondary': 'var(--uikit-text-secondary, #6b7280)',
    },
    borderRadius: {
      'uikit-sm': '4px',
      'uikit-md': '8px',
      'uikit-lg': '12px',
      'uikit-xl': '16px',
    },
  },
  shortcuts: {
    'u-center': 'flex items-center justify-center',
    'u-between': 'flex items-center justify-between',
    'u-ellipsis': 'overflow-hidden text-ellipsis whitespace-nowrap',
    'u-safe-bottom': 'pb-[env(safe-area-inset-bottom)]',
  },
})
