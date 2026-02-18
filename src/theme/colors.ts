const palette = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  white: '#FFFFFF',
  black: '#000000',
};

export const lightColors = {
  primary: palette.blue,
  success: palette.green,
  destructive: palette.red,
  warning: palette.orange,

  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFA',

  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',

  border: '#C6C6C8',
  separator: '#E5E5EA',

  pressed: '#E8F0FE',
  selectedRow: '#F0F7FF',

  tabBarActive: palette.blue,
  tabBarInactive: '#8E8E93',

  searchBackground: '#F2F2F7',

  chartTooltipBg: '#333333',
  chartTooltipText: '#FFFFFF',
  chartAreaFillStart: 'rgba(0,122,255,0.15)',
  chartAreaFillEnd: 'rgba(0,122,255,0.01)',

  modalOverlay: 'rgba(0,0,0,0.4)',

  statusBar: 'dark' as const,
};

export const darkColors: ThemeColors = {
  primary: '#0A84FF',
  success: '#30D158',
  destructive: '#FF453A',
  warning: '#FF9F0A',

  background: '#000000',
  surface: '#1C1C1E',
  surfaceAlt: '#2C2C2E',

  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#48484A',

  border: '#38383A',
  separator: '#38383A',

  pressed: '#1A3A5C',
  selectedRow: '#1A2A3A',

  tabBarActive: '#0A84FF',
  tabBarInactive: '#8E8E93',

  searchBackground: '#1C1C1E',

  chartTooltipBg: '#2C2C2E',
  chartTooltipText: '#FFFFFF',
  chartAreaFillStart: 'rgba(10,132,255,0.2)',
  chartAreaFillEnd: 'rgba(10,132,255,0.01)',

  modalOverlay: 'rgba(0,0,0,0.6)',

  statusBar: 'light' as const,
};

export type ThemeColors = Omit<typeof lightColors, 'statusBar'> & {
  statusBar: 'dark' | 'light';
};
