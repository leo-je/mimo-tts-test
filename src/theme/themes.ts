export interface AppTheme {
  // backgrounds
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceInput: string;
  modalBg: string;
  // text
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  textOnAccent: string;
  codeText: string;
  // accent
  accent: string;
  accentDark: string;
  accentSubtle: string;
  // borders
  border: string;
  borderInput: string;
  borderChip: string;
  borderFocus: string;
  // overlay / misc
  overlay: string;
  disabled: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  preview: string; // 主色调，用于色块预览
  theme: AppTheme;
}

// ── 暖棕（当前默认）───────────────────────────────────────────────
const warmBrown: AppTheme = {
  bg: '#f7f0e6',
  surface: 'rgba(255, 250, 244, 0.92)',
  surfaceAlt: 'rgba(255, 245, 235, 0.95)',
  surfaceInput: 'rgba(255, 252, 248, 0.92)',
  modalBg: '#fff8ef',
  textPrimary: '#24170e',
  textSecondary: '#6b5646',
  textOnPrimary: '#fff8ef',
  textOnAccent: '#fff6ef',
  codeText: '#f9e9d5',
  accent: '#c75d2c',
  accentDark: '#9f3e17',
  accentSubtle: 'rgba(199, 93, 44, 0.08)',
  border: 'rgba(63, 45, 28, 0.12)',
  borderInput: 'rgba(63, 45, 28, 0.22)',
  borderChip: 'rgba(173, 102, 54, 0.24)',
  borderFocus: 'rgba(199, 93, 44, 0.6)',
  overlay: 'rgba(36, 23, 14, 0.5)',
  disabled: 'rgba(159, 62, 23, 0.35)',
};

// ── 深邃蓝 ─────────────────────────────────────────────────────────
const deepBlue: AppTheme = {
  bg: '#f0f4f8',
  surface: 'rgba(240, 245, 255, 0.95)',
  surfaceAlt: 'rgba(230, 240, 255, 0.95)',
  surfaceInput: 'rgba(245, 248, 252, 0.95)',
  modalBg: '#f5f8ff',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  codeText: '#cbd5e1',
  accent: '#2563eb',
  accentDark: '#1d4ed8',
  accentSubtle: 'rgba(37, 99, 235, 0.08)',
  border: 'rgba(51, 65, 85, 0.12)',
  borderInput: 'rgba(51, 65, 85, 0.22)',
  borderChip: 'rgba(37, 99, 235, 0.20)',
  borderFocus: 'rgba(37, 99, 235, 0.6)',
  overlay: 'rgba(15, 23, 42, 0.5)',
  disabled: 'rgba(29, 78, 216, 0.35)',
};

// ── 森林绿 ─────────────────────────────────────────────────────────
const forestGreen: AppTheme = {
  bg: '#f0f7f0',
  surface: 'rgba(240, 250, 240, 0.95)',
  surfaceAlt: 'rgba(230, 245, 230, 0.95)',
  surfaceInput: 'rgba(245, 250, 245, 0.95)',
  modalBg: '#f2faf2',
  textPrimary: '#14210f',
  textSecondary: '#4a5d3e',
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  codeText: '#c8dcc2',
  accent: '#16a34a',
  accentDark: '#15803d',
  accentSubtle: 'rgba(22, 163, 74, 0.08)',
  border: 'rgba(40, 60, 30, 0.12)',
  borderInput: 'rgba(40, 60, 30, 0.22)',
  borderChip: 'rgba(22, 163, 74, 0.20)',
  borderFocus: 'rgba(22, 163, 74, 0.6)',
  overlay: 'rgba(20, 33, 15, 0.5)',
  disabled: 'rgba(21, 128, 61, 0.35)',
};

// ── 樱花粉 ─────────────────────────────────────────────────────────
const sakuraPink: AppTheme = {
  bg: '#fdf2f4',
  surface: 'rgba(255, 245, 247, 0.95)',
  surfaceAlt: 'rgba(255, 235, 240, 0.95)',
  surfaceInput: 'rgba(255, 248, 250, 0.95)',
  modalBg: '#fff5f7',
  textPrimary: '#2a0a12',
  textSecondary: '#6b4650',
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  codeText: '#e8c8d0',
  accent: '#e11d48',
  accentDark: '#be123c',
  accentSubtle: 'rgba(225, 29, 72, 0.08)',
  border: 'rgba(80, 30, 40, 0.12)',
  borderInput: 'rgba(80, 30, 40, 0.22)',
  borderChip: 'rgba(225, 29, 72, 0.20)',
  borderFocus: 'rgba(225, 29, 72, 0.6)',
  overlay: 'rgba(42, 10, 18, 0.5)',
  disabled: 'rgba(190, 18, 60, 0.35)',
};

// ── 暗夜模式 ───────────────────────────────────────────────────────
const darkMode: AppTheme = {
  bg: '#1a1a2e',
  surface: 'rgba(30, 30, 50, 0.95)',
  surfaceAlt: 'rgba(35, 35, 60, 0.95)',
  surfaceInput: 'rgba(40, 40, 65, 0.95)',
  modalBg: '#1e1e36',
  textPrimary: '#e8e6f0',
  textSecondary: '#9896a8',
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  codeText: '#a0a0c0',
  accent: '#6366f1',
  accentDark: '#4f46e5',
  accentSubtle: 'rgba(99, 102, 241, 0.12)',
  border: 'rgba(200, 200, 230, 0.10)',
  borderInput: 'rgba(200, 200, 230, 0.18)',
  borderChip: 'rgba(99, 102, 241, 0.25)',
  borderFocus: 'rgba(99, 102, 241, 0.6)',
  overlay: 'rgba(10, 10, 20, 0.7)',
  disabled: 'rgba(79, 70, 229, 0.35)',
};

export const THEME_PRESETS: ThemePreset[] = [
  {id: 'warmBrown', name: '暖棕', preview: '#c75d2c', theme: warmBrown},
  {id: 'deepBlue', name: '深邃蓝', preview: '#2563eb', theme: deepBlue},
  {id: 'forestGreen', name: '森林绿', preview: '#16a34a', theme: forestGreen},
  {id: 'sakuraPink', name: '樱花粉', preview: '#e11d48', theme: sakuraPink},
  {id: 'darkMode', name: '暗夜模式', preview: '#6366f1', theme: darkMode},
];

export const DEFAULT_THEME_ID = 'warmBrown';
